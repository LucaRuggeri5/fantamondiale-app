import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './PartecipantiLega.css';

const PartecipantiLega = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [partecipanti, setPartecipanti] = useState([]);

  useEffect(() => {
    const fetchPartecipanti = async () => {
      try {
        setLoading(true);
        if (!currentUser?.lega_id) return;

        const { data, error } = await supabase
          .from('utenti')
          .select('id, nome_utente, email, ruolo')
          .eq('lega_id', currentUser.lega_id)
          .order('nome_utente', { ascending: true });

        if (error) throw error;
        setPartecipanti(data || []);
      } catch (err) {
        console.error("Errore caricamento partecipanti:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchPartecipanti();
    }
  }, [currentUser]);

  if (loading) return <div className="player-loading">Caricamento partecipanti... ⏳</div>;

  return (
    <div className="player-page-container">
      <div className="player-page-header">
        <h2>Partecipanti Lega 👥</h2>
        <p className="player-page-subtitle">Lista di tutti gli allenatori iscritti a questa lega.</p>
      </div>

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