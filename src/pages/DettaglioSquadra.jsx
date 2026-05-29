import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './DettaglioSquadra.css';

const DettaglioSquadra = () => {
  const { squadraId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [squadraInfo, setSquadraInfo] = useState(null);
  
  // Organizziamo la rosa strutturata per macro-ruoli fisici
  const [rosaOrdinata, setRosaOrdinata] = useState({ P: [], D: [], C: [], A: [] });

  useEffect(() => {
    const fetchRosaData = async () => {
      try {
        setLoading(true);

        // 1. Recuperiamo i metadati della squadra selezionata
        const { data: sqData, error: sqErr } = await supabase
          .from('squadre')
          .select('*')
          .eq('id', squadraId)
          .single();
        if (sqErr) throw sqErr;
        setSquadraInfo(sqData);

        // 2. Recuperiamo tutti i calciatori associati a questa squadra tramite la tabella pivot
        const { data: rsData, error: rsErr } = await supabase
          .from('rose_squadre')
          .select('calciatori_reali(*)')
          .eq('squadra_id', squadraId);
        if (rsErr) throw rsErr;

        const listaGiocatori = rsData?.map(item => item.calciatori_reali) || [];

        // 3. Dividiamo i calciatori nei rispettivi ruoli per la visualizzazione ordinata
        const cartelleRuolo = { P: [], D: [], C: [], A: [] };
        listaGiocatori.forEach(player => {
          if (cartelleRuolo[player.ruolo]) {
            cartelleRuolo[player.ruolo].push(player);
          }
        });

        // Ordiniamo alfabeticamente i giocatori dentro ogni ruolo
        Object.keys(cartelleRuolo).forEach(r => {
          cartelleRuolo[r].sort((a, b) => a.nome.localeCompare(b.nome));
        });

        setRosaOrdinata(cartelleRuolo);

      } catch (err) {
        console.error("Errore nel recupero dei dettagli della rosa:", err);
      } finally {
        setLoading(false);
      }
    };

    if (squadraId) {
      fetchRosaData();
    }
  }, [squadraId]);

  if (loading) return <div className="dettaglio-loading">Caricamento rosa in corso... 🛡️</div>;

  const totalPlayers = rosaOrdinata.P.length + rosaOrdinata.D.length + rosaOrdinata.C.length + rosaOrdinata.A.length;

  return (
    <div className="dettaglio-page-container">
      
      {/* Intestazione della Pagina */}
      <div className="dettaglio-header">
        <button className="btn-back" onClick={() => navigate('/squadre')}>
          ⬅ Torna a Squadre
        </button>
        <div className="club-title-card">
          <h2>🛡️ {squadraInfo?.nome || "Club"}</h2>
          <span className="total-badge">Componenti: {totalPlayers}</span>
        </div>
      </div>

      {totalPlayers === 0 ? (
        <div className="empty-rosa-alert">
          <p>Nessun calciatore è stato ancora assegnato a questa squadra dall'amministratore.</p>
        </div>
      ) : (
        <div className="rose-sections-wrapper">
          
          {/* Sezione Portieri */}
          {rosaOrdinata.P.length > 0 && (
            <div className="ruolo-block-box">
              <h4 className="title-ruolo P">Portieri ({rosaOrdinata.P.length})</h4>
              <div className="players-subgrid">
                {rosaOrdinata.P.map(p => (
                  <div key={p.id} className="player-detail-card">
                    <strong>{p.nome}</strong>
                    <span className="player-nation">{p.nazionale}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sezione Difensori */}
          {rosaOrdinata.D.length > 0 && (
            <div className="ruolo-block-box">
              <h4 className="title-ruolo D">Difensori ({rosaOrdinata.D.length})</h4>
              <div className="players-subgrid">
                {rosaOrdinata.D.map(p => (
                  <div key={p.id} className="player-detail-card">
                    <strong>{p.nome}</strong>
                    <span className="player-nation">{p.nazionale}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sezione Centrocampisti */}
          {rosaOrdinata.C.length > 0 && (
            <div className="ruolo-block-box">
              <h4 className="title-ruolo C">Centrocampisti ({rosaOrdinata.C.length})</h4>
              <div className="players-subgrid">
                {rosaOrdinata.C.map(p => (
                  <div key={p.id} className="player-detail-card">
                    <strong>{p.nome}</strong>
                    <span className="player-nation">{p.nazionale}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sezione Attaccanti */}
          {rosaOrdinata.A.length > 0 && (
            <div className="ruolo-block-box">
              <h4 className="title-ruolo A">Attaccanti ({rosaOrdinata.A.length})</h4>
              <div className="players-subgrid">
                {rosaOrdinata.A.map(p => (
                  <div key={p.id} className="player-detail-card">
                    <strong>{p.nome}</strong>
                    <span className="player-nation">{p.nazionale}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default DettaglioSquadra;