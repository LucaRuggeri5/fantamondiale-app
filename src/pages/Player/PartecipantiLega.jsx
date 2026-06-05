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
    setTimeout(() => setCopiato(false), 2000); // Feedback temporaneo di 2 secondi
  };

  if (loading) return <div className="tactical-partecipanti-loading">Caricamento partecipanti... ⏳</div>;

  return (
    <div className="tactical-app-container tactical-partecipanti-page">
      {/* Intestazione */}
      <div className="tactical-partecipanti-page-header">
        <h2 className="tactical-brand">Partecipanti Lega</h2>
        <p className="tactical-partecipanti-page-subtitle">Lista ufficiale di tutti gli allenatori iscritti.</p>
      </div>

      {/* Box Condizionale Invito / Condivisione Codice Accesso */}
      {codiceAccesso && (
        <div className="tactical-codice-invito-container">
          <span className="tactical-codice-label">Codice Accesso della Lega</span>
          <div className="tactical-codice-row">
            <span className="tactical-codice-valore">{codiceAccesso}</span>
            <button 
              className={`tactical-btn-copia-codice ${copiato ? 'is-success' : ''}`} 
              onClick={handleCopiaCodice}
            >
              {copiato ? 'Copiato! ✓' : 'Copia Codice'}
            </button>
          </div>
        </div>
      )}

      {/* Lista Membri Iscritti */}
      <div className="tactical-partecipanti-list">
        {partecipanti.length === 0 ? (
          <p className="tactical-no-data-msg">Nessun allenatore registrato in questa lega.</p>
        ) : (
          partecipanti.map((p) => (
            <div key={p.id} className="tactical-partecipante-card">
              
              <div className="tactical-partecipante-avatar-group">
                {/* Monogramma Iniziali */}
                <div className="tactical-avatar-placeholder">
                  {p.nome_utente.substring(0, 2).toUpperCase()}
                </div>
                <div className="tactical-partecipante-info">
                  <span className="tactical-part-name">{p.nome_utente}</span>
                  <span className="tactical-part-email">{p.email}</span>
                </div>
              </div>
              
              {/* Badge del Ruolo Federale */}
              <span className={`tactical-badge-role-view ${p.ruolo}`}>
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