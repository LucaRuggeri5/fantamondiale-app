import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [leagueData, setLeagueData] = useState(null);
  const [myTeamData, setMyTeamData] = useState(null);
  const [existingTeams, setExistingTeams] = useState([]);
  const [myRankPosition, setMyRankPosition] = useState(null);

  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Stati per memorizzare i turni operativi calcolati al volo
  const [giornataFormazione, setGiornataFormazione] = useState(null);
  const [giornataVoti, setGiornataVoti] = useState(null);
  const [formationCountdown, setFormationCountdown] = useState("Nessun turno attivo");
  const [votesCountdown, setVotesCountdown] = useState("Nessun calcolo attivo");

  // Funzione helper locale per formattare la data e l'ora
  const formattaDataOra = (dataOggetto) => {
    return dataOggetto.toLocaleDateString('it-IT') + ' ore ' + dataOggetto.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // 1. Recupero informazioni sull'utente corrente
      const { data: utente, error: userError } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setUserData(utente);

      if (utente.lega_id) {
        // 2. Recupero informazioni sulla lega dell'utente
        const { data: lega, error: leagueError } = await supabase
          .from('leghe')
          .select('*')
          .eq('id', utente.lega_id)
          .single();

        if (leagueError) throw leagueError;
        setLeagueData(lega);

        // 3. Recupero tutte le squadre appartenenti alla stessa lega
        const { data: squadre, error: teamsError } = await supabase
          .from('squadre')
          .select('*')
          .eq('lega_id', utente.lega_id);

        if (teamsError) throw teamsError;
        setExistingTeams(squadre || []);

        if (utente.squadra_id) {
          // LOGICA CALCOLO PUNTI E CLASSIFICA IN TEMPO REALE
          const { data: punteggi, error: pError } = await supabase
            .from('formazioni')
            .select('squadra_id, punteggio_totale')
            .in('squadra_id', squadre.map(s => s.id));

          if (!pError && punteggi) {
            const classificaCalcolata = squadre.map(squadra => {
              const puntiSquadra = punteggi
                .filter(p => p.squadra_id === squadra.id)
                .reduce((acc, curr) => acc + (curr.punteggio_totale || 0), 0);

              return {
                id: squadra.id,
                penalita: squadra.penalita || 0,
                points: puntiSquadra - (squadra.penalita || 0)
              };
            });

            // Ordinamento decrescente dei punteggi per stabilire il ranking
            classificaCalcolata.sort((a, b) => b.points - a.points);

            const miaPosizioneIndex = classificaCalcolata.findIndex(s => s.id === utente.squadra_id);
            if (miaPosizioneIndex !== -1) {
              setMyRankPosition(miaPosizioneIndex + 1);
            }

            const squadraPersonale = squadre.find(s => s.id === utente.squadra_id);
            if (squadraPersonale) {
              const puntiAggiornati = classificaCalcolata.find(s => s.id === utente.squadra_id)?.points || 0;
              setMyTeamData({ ...squadraPersonale, punti_totali: puntiAggiornati });
            }
          } else {
            const squadraPersonale = squadre.find(s => s.id === utente.squadra_id);
            setMyTeamData(squadraPersonale || null);
          }
        }

        // 4. NUOVA LOGICA TEMPORALE APPLICATA SUL CALENDARIO GIORNATE
        const { data: giornateReal, error: gError } = await supabase
          .from('giornate')
          .select('*')
          .eq('lega_id', utente.lega_id)
          .order('numero_giornata', { ascending: true });

        if (!gError && giornateReal) {
          const adesso = new Date();
          
          // Cerchiamo se c'è un turno in cui la finestra per schierare sia aperta
          const gForm = giornateReal.find(g => {
            const inizio = new Date(g.apertura_formazioni);
            const fine = new Date(g.scadenza_formazione);
            return adesso >= inizio && adesso < fine;
          });

          if (gForm) {
            setGiornataFormazione(gForm);
            const scadenza = new Date(gForm.scadenza_formazione);
            setFormationCountdown(`Scade il ${formattaDataOra(scadenza)}`);
          } else {
            // Se nessun turno è attivo adesso, cerchiamo il primo turno futuro
            const gFutura = giornateReal.find(g => adesso < new Date(g.apertura_formazioni));
            
            if (gFutura) {
              const dataApertura = new Date(gFutura.apertura_formazioni);
              setFormationCountdown(`G${gFutura.numero_giornata} aprirà il ${formattaDataOra(dataApertura)}`);
            } else {
              setFormationCountdown("Nessun turno attivo per le formazioni");
            }
            setGiornataFormazione(null);
          }

          // Cerchiamo se c'è un turno attualmente bloccato e in attesa dei voti dall'admin
          const gVoti = giornateReal.find(g => {
            const fineFormazioni = new Date(g.scadenza_formazione);
            const fineVoti = new Date(g.scadenza_voti);
            return adesso >= fineFormazioni && adesso < fineVoti;
          });

          if (gVoti) {
            setGiornataVoti(gVoti);
            const scadVoti = new Date(gVoti.scadenza_voti);
            setVotesCountdown(`Entro il ${formattaDataOra(scadVoti)}`);
          } else {
            setVotesCountdown("Nessun calcolo attivo");
            setGiornataVoti(null);
          }
        }
      }

    } catch (err) {
      console.error("Errore nel caricamento della Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    try {
      setSubmitting(true);
      setError('');

      const { data: newTeam, error: teamError } = await supabase
        .from('squadre')
        .insert([
          {
            nome: teamName.trim(),
            lega_id: userData.lega_id,
            url_logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(teamName.trim())}`,
            punti_totali: 0,
            penalita: 0
          }
        ])
        .select()
        .single();

      if (teamError) throw teamError;

      const { error: userUpdateError } = await supabase
        .from('utenti')
        .update({ squadra_id: newTeam.id })
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;

      await loadDashboardData();

    } catch (err) {
      console.error(err);
      setError("Impossibile creare la squadra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError("Seleziona una squadra dalla lista!");
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const { error: userUpdateError } = await supabase
        .from('utenti')
        .update({ squadra_id: selectedTeamId })
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;

      await loadDashboardData();

    } catch (err) {
      console.error(err);
      setError("Impossibile unire l'utente alla squadra selezionata.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRankBadge = (pos) => {
    if (!pos) return '-';
    if (pos === 1) return '🥇 1°';
    if (pos === 2) return '🥈 2°';
    if (pos === 3) return '🥉 3°';
    return `#${pos}`;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Caricamento dati in corso... ⚽</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      
      <div className="league-header-card hero-card">
        <div className="hero-main-info">
          <h1>{leagueData?.nome || "La tua Lega"}</h1>
          {myTeamData && <h2 className="hero-team-title">🛡️ {myTeamData.nome}</h2>}
        </div>
      </div>

      {!userData?.squadra_id ? (
        <div className="team-selection-wrapper">
          {error && <p className="error-text">{error}</p>}

          {existingTeams.length > 0 && (
            <div className="create-team-card spacing-bottom">
              <h2>Scegli una Squadra esistente 🏢</h2>
              <p>Seleziona il tuo team di appartenenza dalla lista per prenderne il controllo:</p>

              <form onSubmit={handleJoinTeam} className="dashboard-form">
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={submitting}
                  className="dashboard-select"
                >
                  <option value="">-- Seleziona una Squadra --</option>
                  {existingTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.nome}</option>
                  ))}
                </select>
                <button type="submit" className="btn-join" disabled={submitting || !selectedTeamId}>
                  {submitting ? 'Associazione...' : 'Prendi il Controllo della Squadra'}
                </button>
              </form>
            </div>
          )}

          <div className="create-team-card">
            <h2>Oppure, crea una nuova Squadra! 📝</h2>
            <p>Se la tua squadra non è presente nell'elenco sopra, inserisci il nome qui sotto per fondarla.</p>

            <form onSubmit={handleCreateTeam} className="dashboard-form">
              <input
                type="text"
                placeholder="Es. Real Madrink, FC Merengues..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={30}
                disabled={submitting}
                className="dashboard-input"
              />
              <button type="submit" className="btn-create" disabled={submitting || !teamName.trim()}>
                {submitting ? 'Creazione...' : 'Crea e Partecipa'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-recap-card">
            <div className="recap-item">
              <span className="recap-label">POSIZIONE</span>
              <span className={`recap-value rank-position rank-${myRankPosition}`}>
                {renderRankBadge(myRankPosition)}
              </span>
            </div>
            <div className="recap-divider"></div>
            <div className="recap-item">
              <span className="recap-label">PUNTI TOTALI</span>
              <span className="recap-value total-points">{(myTeamData?.punti_totali || 0).toFixed(1)}</span>
            </div>
            <div className="recap-divider"></div>
            <div className="recap-item">
              <span className="recap-label">PENALITÀ</span>
              <span className="recap-value penalty-points">
                {myTeamData?.penalita > 0 ? `-${myTeamData.penalita}` : '0'}
              </span>
            </div>
          </div>

          <div className="operative-cards-grid">
            
            {/* Card Formazione */}
            <div className="action-status-card formation">
              <div className="action-card-header">
                <h3>{giornataFormazione ? `Giornata ${giornataFormazione.numero_giornata} 🏟️` : "Schieramento Formazione"}</h3>
                <span className="time-countdown">⏳ {formationCountdown}</span>
              </div>
              <p className="action-card-description">
                {giornataFormazione 
                  ? "Tempo utile rimanente per schierare e congelare i tuoi 11 titolari."
                  : "Controlla la data sopra per scoprire quando potrai inserire la prossima formazione."}
              </p>
              <button 
                className="btn-action-trigger btn-formation"
                disabled={!giornataFormazione}
                onClick={() => navigate(`/formazione/inserisci/${giornataFormazione.id}`)}
              >
                🏃‍♂️ Inserisci Formazione
              </button>
            </div>

            {/* Card Voti */}
            <div className="action-status-card votes">
              <div className="action-card-header">
                <h3>{giornataVoti ? `Calcolo Giornata ${giornataVoti.numero_giornata} 📝` : "Inserimento Voti 📝"}</h3>
                <span className="date-deadline">{votesCountdown}</span>
              </div>
              <p className="action-card-description">
                {giornataVoti 
                  ? "Il turno è bloccato. L'amministratore può ora procedere all'inserimento dei voti ufficiali."
                  : "I conteggi per i turni precedenti sono terminati o non ancora avviati."}
              </p>
              <button 
                className="btn-action-trigger btn-votes"
                disabled={!giornataVoti}
                onClick={() => navigate(`/voti/inserisci/${giornataVoti.id}`)}
              >
                📊 Inserisci Voti
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;