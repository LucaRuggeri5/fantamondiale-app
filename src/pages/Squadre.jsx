import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Importato
import { supabase } from '../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './Squadre.css';

const Squadre = () => {
  const { user } = useUser();
  const navigate = useNavigate(); // Inizializzato
  const [loading, setLoading] = useState(true);
  const [groupedSquadre, setGroupedSquadre] = useState([]); 

  const loadSquadreData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: utente, error: uErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      if (uErr) throw uErr;

      if (utente.lega_id) {
        const { data: iscritti, error: pErr } = await supabase
          .from('utenti')
          .select(`
            nome_utente,
            ruolo,
            squadra_id,
            squadre ( id, nome )
          `)
          .eq('lega_id', utente.lega_id);
        if (pErr) throw pErr;

        const squadreMap = {};
        iscritti.forEach(iscritto => {
          // Identificatore temporaneo se non ha ancora scelto o creato il team
          const haSquadra = !!iscritto.squadra_id;
          const sqId = haSquadra ? iscritto.squadra_id : 'no-team-' + iscritto.nome_utente;
          const sqNome = iscritto.squadre?.nome || "In attesa di creazione...";

          if (!squadreMap[sqId]) {
            squadreMap[sqId] = {
              id: haSquadra ? iscritto.squadra_id : null, // null serve per bloccare il click
              nome: sqNome,
              allenatori: []
            };
          }
          squadreMap[sqId].allenatori.push({
            nome: iscritto.nome_utente,
            isAdmin: iscritto.ruolo === 'admin'
          });
        });

        setGroupedSquadre(Object.values(squadreMap));
      }
    } catch (err) {
      console.error("Errore nel caricamento dei club della lega:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSquadreData();
  }, [user]);

  // Gestione del reindirizzamento al dettaglio
  const handleSquadraClick = (id) => {
    if (!id) {
      alert("Questa squadra non è ancora stata fondata o associata!");
      return;
    }
    navigate(`/squadre/${id}`);
  };

  if (loading) {
    return (
      <div className="squadre-loading">
        <p>Caricamento in corso... ⚽</p>
      </div>
    );
  }

  return (
    <div className="squadre-page-container">
      <div className="participants-section">
        <h3>Squadre nella Lega 🏆</h3>
        <p className="section-subtitle">
          Seleziona un club partecipante per visualizzarne la rosa completa di calciatori reali.
        </p>
        
        <div className="participants-list">
          {groupedSquadre.map((squadra, idx) => (
            <div 
              key={idx} 
              className={`participant-card ${squadra.id ? 'clickable' : 'disabled'}`}
              onClick={() => handleSquadraClick(squadra.id)}
            >
              <div className="avatar-placeholder">🛡️</div>
              <div className="participant-details">
                <h4>{squadra.nome}</h4>
                <p>
                  Allenatori:{' '}
                  {squadra.allenatori.map((all, aIdx) => (
                    <span key={aIdx} className="trainer-name">
                      <strong>{all.nome}</strong>{all.isAdmin ? ' 👑' : ''}
                      {aIdx < squadra.allenatori.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
              {squadra.id && <div className="arrow-indicator">▶</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Squadre;