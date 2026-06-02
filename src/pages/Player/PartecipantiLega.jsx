import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PartecipantiLega.css';

const PartecipantiLega = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [partecipanti, setPartecipanti] = useState([]);
  const [codiceAccesso, setCodiceAccesso] = useState('');
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    const fetchDatiLega = async () => {
      try {
        setLoading(true);
        if (!currentUser?.lega_id) return;

        // 1. Recupero dei partecipanti alla lega della tabella utenti
        const { data: utentiData, error: utentiErr } = await supabase
          .from('utenti')
          .select('id, nome_utente, email, ruolo')
          .eq('lega_id', currentUser.lega_id)
          .order('nome_utente', { ascending: true });

        if (utentiErr) throw utentiErr;
        setPartecipanti(utentiData || []);

        // 2. Recupero del codice_accesso dalla tabella leghe come indicato nell'ERD
        const { data: legaData, error: legaErr } = await supabase
          .from('leghe')
          .select('codice_accesso')
          .eq('id', currentUser.lega_id)
          .maybeSingle();

        if (legaErr) throw legaErr;
        if (legaData) {
          setCodiceAccesso(legaData.codice_accesso || '');
        }

      } catch (err) {
        console.error("Errore caricamento dati partecipanti/lega:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDatiLega();
    }
  }, [currentUser]);

  const handleCopiaCodice = () => {
    if (!codiceAccesso) return;
    navigator.clipboard.writeText(codiceAccesso);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000); // Reset del feedback dopo 2 secondi
  };

  if (loading) return <div className="player-loading">Caricamento partecipanti... ⏳</div>;

  return (
    <div className="player-page-container">
      <div className="player-page-header">
        <h2>Partecipanti Lega 👥</h2>
        <p className="player-page-subtitle">Lista di tutti gli allenatori iscritti a questa lega.</p>
      </div>

      {/* Box Copia/Incolla Codice di Accesso */}
      {codiceAccesso && (
        <div className="codice-invito-container">
          <span className="codice-label">Codice Accesso Lega:</span>
          <div className="codice-row">
            <span className="codice-valore">{codiceAccesso}</span>
            <button 
              className={`btn-copia-codice ${copiato ? 'success' : ''}`} 
              onClick={handleCopiaCodice}
            >
              {copiato ? 'Copiato! ✓' : 'Copia 📋'}
            </button>
          </div>
        </div>
      )}

      <div className="partecipanti-list">
        {partecipanti.length === 0 ? (
          <p className="no-data-msg">Nessun partecipante trovato.</p>
        ) : (
          partecipanti.map((p) => (
            <div key={p.id} className="partecipante-card">
              <div className="partecipante-avatar-group">
                <div className="avatar-placeholder">
                  {p.nome_utente.substring(0, 2).toUpperCase()}
                </div>
                <div className="partecipante-info">
                  <span className="part-name">{p.nome_utente}</span>
                  <span className="part-email">{p.email}</span>
                </div>
              </div>
              <span className={`badge-role-view ${p.ruolo}`}>
                {p.ruolo === 'admin' ? '👑 Admin' : '🛡️ Player'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PartecipantiLega;