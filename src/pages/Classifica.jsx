import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
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

        // 1. Recuperiamo la lega dell'utente
        const { data: userData, error: userErr } = await supabase
          .from('utenti')
          .select('lega_id')
          .eq('id', user.id)
          .single();

        if (userErr) throw userErr;
        if (!userData?.lega_id) return;

        // 2. Recuperiamo tutte le squadre della lega
        const { data: squadre, error: sqErr } = await supabase
          .from('squadre')
          .select('id, nome, url_logo, penalita')
          .eq('lega_id', userData.lega_id);

        if (sqErr) throw sqErr;

        // 3. Recuperiamo tutti i punteggi salvati nelle formazioni per questa lega
        const { data: punteggi, error: pErr } = await supabase
          .from('formazioni')
          .select('squadra_id, punteggio_totale')
          .in('squadra_id', squadre.map(s => s.id));

        if (pErr) throw pErr;

        // 4. Elaborazione dei dati: Somma dei punti
        const classificaCalcolata = squadre.map(squadra => {
          // Filtriamo i punteggi di questa specifica squadra
          const puntiSquadra = punteggi
            .filter(p => p.squadra_id === squadra.id)
            .reduce((acc, curr) => acc + (curr.punteggio_totale || 0), 0);

          // Calcolo finale: Somma Giornate - Penalità
          const totaleFinale = puntiSquadra - (squadra.penalita || 0);

          return {
            id: squadra.id,
            name: squadra.nome,
            logo: squadra.url_logo,
            penalita: squadra.penalita || 0,
            points: totaleFinale
          };
        });

        // 5. Ordinamento Decrescente
        classificaCalcolata.sort((a, b) => b.points - a.points);

        // Aggiungiamo la posizione dopo l'ordinamento
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

  if (loading) return <div className="classifica-loading">Calcolo posizioni in corso... 🏆</div>;

  return (
    <div className="classifica-page">
      <div className="classifica-header">
        <h2>Classifica Generale 🏆</h2>
        <p className="subtitle">Punteggi totali aggiornati in tempo reale:</p>
      </div>

      <div className="classifica-table-container">
        <table className="classifica-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Squadra</th>
              <th className="text-right">Punti</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan="3" className="no-data">Nessun dato disponibile.</td>
              </tr>
            ) : (
              leaderboard.map((row) => (
                <tr key={row.id} className={`row-pos-${row.position}`}>
                  <td className="pos-cell">
                    {row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position === 3 ? '🥉' : `#${row.position}`}
                  </td>
                  
                  <td>
                    <div className="team-cell-info">
                      {row.logo && <img src={row.logo} alt="logo" className="mini-logo-table" />}
                      <div>
                        <div className="table-team-name">{row.name}</div>
                        {row.penalita > 0 && <div className="table-penalty-label">Penalità: -{row.penalita}</div>}
                      </div>
                    </div>
                  </td>
                  
                  <td className="text-right points-cell">
                    {row.points.toFixed(1)}
                  </td>
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