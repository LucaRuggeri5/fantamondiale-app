import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import LogoSquadra from '../components/LogoSquadra/LogoSquadra'; // Importa il componente
import './Classifica.css';

const Classifica = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchClassificaDinamica = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const { data: userData, error: userErr } = await supabase
          .from('utenti')
          .select('lega_id')
          .eq('id', user.id)
          .single();

        if (userErr) throw userErr;
        if (!userData?.lega_id) return;

        // Selezioniamo anche url_logo dalla tabella squadre
        const { data: squadre, error: sqErr } = await supabase
          .from('squadre')
          .select('id, nome, url_logo, penalita')
          .eq('lega_id', userData.lega_id);

        if (sqErr) throw sqErr;

        const { data: punteggi, error: pErr } = await supabase
          .from('formazioni')
          .select('squadra_id, punteggio_totale')
          .in('squadra_id', squadre.map(s => s.id));

        if (pErr) throw pErr;

        const classificaCalcolata = squadre.map(squadra => {
          const puntiSquadra = punteggi
            .filter(p => p.squadra_id === squadra.id)
            .reduce((acc, curr) => acc + (curr.punteggio_totale || 0), 0);

          const totaleFinale = puntiSquadra - (squadra.penalita || 0);

          return {
            id: squadra.id,
            name: squadra.nome,
            url_logo: squadra.url_logo, // Manteniamo l'url per il componente
            penalita: squadra.penalita || 0,
            points: totaleFinale
          };
        });

        classificaCalcolata.sort((a, b) => b.points - a.points);

        const leaderboardFinal = classificaCalcolata.map((item, index) => ({
          ...item,
          position: index + 1
        }));

        setLeaderboard(leaderboardFinal);
      } catch (err) {
        console.error("Errore nel calcolo della classifica:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassificaDinamica();
  }, [user]);

  if (loading) {
    return <div className="classifica-loading">Calcolo posizioni in corso... 🏆</div>;
  }

  return (
    <div className="classifica-page tactical-dashboard-gap">
      <div className="classifica-header">
        <h2 className="tactical-page-title">Classifica 🏆</h2>
        <p className="subtitle">Punteggi totali aggiornati in tempo reale</p>
      </div>

      <div className="classifica-table-container tactical-table-card">
        <table className="classifica-table">
          <thead>
            <tr>
              <th className="text-left table-head-label">Pos</th>
              <th className="text-left table-head-label">Squadra</th>
              <th className="text-right table-head-label">Punti</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan="3" className="no-data">Nessuna squadra trovata.</td>
              </tr>
            ) : (
              leaderboard.map((row) => (
                <tr key={row.id} className={`tactical-table-row row-pos-${row.position}`}>
                  <td className="pos-cell">
                    {row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position === 3 ? '🥉' : `#${row.position}`}
                  </td>
                  <td className="team-cell">
                    <div className="team-row-wrapper">
                      <LogoSquadra url={row.url_logo} nomeSquadra={row.name} dimensione="small" />
                      <div className="team-cell-info">
                        <div className="table-team-name">{row.name}</div>
                        {row.penalita > 0 && <div className="table-penalty-label">Penalità: -{row.penalita}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="points-cell text-right">{row.points.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Classifica;