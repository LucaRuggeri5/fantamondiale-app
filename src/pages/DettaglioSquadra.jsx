import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BandieraNazionale from '../components/BandieraNazionale/BandieraNazionale';
import LogoSquadra from '../components/LogoSquadra/LogoSquadra'; // Importato
import './DettaglioSquadra.css';

const DettaglioSquadra = () => {
  const { squadraId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [squadraInfo, setSquadraInfo] = useState(null);
  const [rosaOrdinata, setRosaOrdinata] = useState({ P: [], D: [], C: [], A: [] });

  useEffect(() => {
    const fetchRosaData = async () => {
      try {
        setLoading(true);

        const { data: sqData, error: sqErr } = await supabase
          .from('squadre')
          .select('*')
          .eq('id', squadraId)
          .single();
        if (sqErr) throw sqErr;
        setSquadraInfo(sqData);

        const { data: rsData, error: rsErr } = await supabase
          .from('rose_squadre')
          .select('calciatori_reali(*)')
          .eq('squadra_id', squadraId);
        if (rsErr) throw rsErr;

        const listaGiocatori = rsData?.map(item => item.calciatori_reali) || [];

        const cartelleRuolo = { P: [], D: [], C: [], A: [] };
        listaGiocatori.forEach(player => {
          if (cartelleRuolo[player.ruolo]) {
            cartelleRuolo[player.ruolo].push(player);
          }
        });

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
    <div className="dettaglio-page-container tactical-dashboard-gap">
      
      <div className="dettaglio-header">
        <button className="btn-back" onClick={() => navigate('/squadre')}>
          ⬅ Torna a Squadre
        </button>
        
        <div className="club-title-card tactical-card">
          <div className="club-identity-wrapper">
            {/* Logo integrato nell'intestazione */}
            <LogoSquadra url={squadraInfo?.url_logo} nomeSquadra={squadraInfo?.nome} dimensione="medium" />
            <h2>{squadraInfo?.nome || "Club"}</h2>
          </div>
          <span className="total-badge">Rosa: {totalPlayers}</span>
        </div>
      </div>

      {totalPlayers === 0 ? (
        <div className="empty-rosa-alert tactical-card">
          <p>Nessun calciatore è stato ancora assegnato a questa squadra.</p>
        </div>
      ) : (
        <div className="rose-sections-wrapper">
          {['P', 'D', 'C', 'A'].map(ruolo => (
            rosaOrdinata[ruolo].length > 0 && (
              <div key={ruolo} className="ruolo-block-box tactical-card">
                <h4 className={`title-ruolo ${ruolo}`}>
                  {ruolo === 'P' ? 'Portieri' : ruolo === 'D' ? 'Difensori' : ruolo === 'C' ? 'Centrocampisti' : 'Attaccanti'} 
                  ({rosaOrdinata[ruolo].length})
                </h4>
                <div className="players-subgrid">
                  {rosaOrdinata[ruolo].map(p => (
                    <div key={p.id} className="player-detail-card">
                      <div className="player-detail-left">
                        <BandieraNazionale nazione={p.nazionale} />
                        <strong>{p.nome}</strong>
                      </div>
                      <span className="player-nation">{p.nazionale || 'N/D'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default DettaglioSquadra;