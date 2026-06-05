import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import LogoSquadra from '../components/LogoSquadra/LogoSquadra'; // Importato
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

  const [targetDates, setTargetDates] = useState({
    formazioneTarget: null,
    formazioneIsApertura: false,
    votiTarget: null,
    giornataFormazioneId: null,
    giornataVotiId: null,
    numeroGiornataFormazione: null,
    numeroGiornataVoti: null
  });

  const [formationCountdown, setFormationCountdown] = useState("Nessun turno attivo");
  const [votesCountdown, setVotesCountdown] = useState("Nessun calcolo attivo");

  const calcolaRimanente = (targetDate) => {
    if (!targetDate) return null;
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return "Scaduto 🏁";

    const giorni = Math.floor(diff / (1000 * 60 * 60 * 24));
    const ore = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minuti = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondi = Math.floor((diff % (1000 * 60)) / 1000);

    let stringaMancante = "";
    if (giorni > 0) stringaMancante += `${giorni}g `;
    stringaMancante += `${ore.toString().padStart(2, '0')}o ${minuti.toString().padStart(2, '0')}m ${secondi.toString().padStart(2, '0')}s`;
    return stringaMancante;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: utente, error: userError } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setUserData(utente);

      if (utente.lega_id) {
        const { data: lega, error: leagueError } = await supabase
          .from('leghe')
          .select('*')
          .eq('id', utente.lega_id)
          .single();

        if (leagueError) throw leagueError;
        setLeagueData(lega);

        const { data: squadre, error: teamsError } = await supabase
          .from('squadre')
          .select('*')
          .eq('lega_id', utente.lega_id);

        if (teamsError) throw teamsError;
        setExistingTeams(squadre || []);

        if (utente.squadra_id) {
          const { data: punteggi, error: pError } = await supabase
            .from('formazioni')
            .select('squadra_id, punteggio_totale')
            .in('squadra_id', squadre.map(s => s.id));

          if (!pError && punteggi) {
            const classificaCalcolata = squadre.map(squadra => {
              const puntiSulCampo = punteggi
                .filter(p => p.squadra_id === squadra.id)
                .reduce((acc, curr) => acc + (curr.punteggio_totale || 0), 0);
              return { id: squadra.id, points: puntiSulCampo - (squadra.penalita || 0) };
            });

            classificaCalcolata.sort((a, b) => b.points - a.points);
            const miaPosizioneIndex = classificaCalcolata.findIndex(s => s.id === utente.squadra_id);
            if (miaPosizioneIndex !== -1) setMyRankPosition(miaPosizioneIndex + 1);

            const squadraPersonale = squadre.find(s => s.id === utente.squadra_id);
            if (squadraPersonale) {
              const puntiAggiornati = classificaCalcolata.find(s => s.id === utente.squadra_id)?.points || 0;
              setMyTeamData({ ...squadraPersonale, punti_totali: puntiAggiornati });
            }
          } else {
            setMyTeamData(squadre.find(s => s.id === utente.squadra_id) || null);
          }
        }

        const { data: giornateReal, error: gError } = await supabase
          .from('giornate')
          .select('*')
          .eq('lega_id', utente.lega_id)
          .order('numero_giornata', { ascending: true });

        if (!gError && giornateReal) {
          const adesso = new Date();
          let fTarget = null;
          let fIsApertura = false;
          let vTarget = null;
          let gFormId = null;
          let gVotiId = null;
          let numGForm = null;
          let numGVoti = null;

          const gForm = giornateReal.find(g => adesso >= new Date(g.apertura_formazioni) && adesso < new Date(g.scadenza_formazione));
          if (gForm) {
            fTarget = gForm.scadenza_formazione;
            gFormId = gForm.id;
            numGForm = gForm.numero_giornata;
          } else {
            const gFutura = giornateReal.find(g => adesso < new Date(g.apertura_formazioni));
            if (gFutura) {
              fTarget = gFutura.apertura_formazioni;
              fIsApertura = true;
              numGForm = gFutura.numero_giornata;
            }
          }

          const gVoti = giornateReal.find(g => adesso >= new Date(g.scadenza_formazione) && adesso < new Date(g.scadenza_voti));
          if (gVoti) {
            vTarget = gVoti.scadenza_voti;
            gVotiId = gVoti.id;
            numGVoti = gVoti.numero_giornata;
          }

          setTargetDates({
            formazioneTarget: fTarget,
            formazioneIsApertura: fIsApertura,
            votiTarget: vTarget,
            giornataFormazioneId: gFormId,
            giornataVotiId: gVotiId,
            numeroGiornataFormazione: numGForm,
            numeroGiornataVoti: numGVoti
          });
        }
      }
    } catch (err) {
      console.error("Errore nel caricamento della Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, [user]);

  useEffect(() => {
    if (loading) return;
    const aggiornaOgniSecondo = () => {
      if (targetDates.formazioneTarget) {
        const tempoMancante = calcolaRimanente(targetDates.formazioneTarget);
        if (tempoMancante === "Scaduto 🏁") setFormationCountdown("Finestra Chiusa 🔒");
        else {
          const prefisso = targetDates.formazioneIsApertura ? `Apre G${targetDates.numeroGiornataFormazione}: ` : "";
          setFormationCountdown(`${prefisso}${tempoMancante}`);
        }
      } else setFormationCountdown("Nessun turno attivo");

      if (targetDates.votiTarget) {
        const tempoMancante = calcolaRimanente(targetDates.votiTarget);
        setVotesCountdown(tempoMancante === "Scaduto 🏁" ? "Tempo Scaduto 🔒" : tempoMancante);
      } else setVotesCountdown("Nessun calcolo attivo");
    };
    aggiornaOgniSecondo();
    const intervallo = setInterval(aggiornaOgniSecondo, 1000);
    return () => clearInterval(intervallo);
  }, [targetDates, loading]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim() || submitting) return;
    try {
      setSubmitting(true);
      setError('');
      const { data: newTeam, error: teamError } = await supabase
        .from('squadre')
        .insert([{ nome: teamName.trim(), lega_id: userData.lega_id, punti_totali: 0, penalita: 0 }])
        .select().single();
      if (teamError) throw teamError;
      await supabase.from('utenti').update({ squadra_id: newTeam.id }).eq('id', user.id);
      await loadDashboardData();
    } catch (err) { setError("Impossibile creare la squadra."); } finally { setSubmitting(false); }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeamId || submitting) return;
    try {
      setSubmitting(true);
      setError('');
      await supabase.from('utenti').update({ squadra_id: selectedTeamId }).eq('id', user.id);
      await loadDashboardData();
    } catch (err) { setError("Impossibile unire l'utente alla squadra."); } finally { setSubmitting(false); }
  };

  const renderRankBadge = (pos) => {
    if (!pos) return '-';
    if (pos === 1) return '🥇 1°';
    if (pos === 2) return '🥈 2°';
    if (pos === 3) return '🥉 3°';
    return `#${pos}`;
  };

  if (loading) return <div className="dashboard-loading"><p>Caricamento dati in corso... ⚽</p></div>;

  return (
    <div className="dashboard-container">
      <div className="league-header-card hero-card tactical-card-header-map">
        <div className="hero-main-info">
          <h1 className="tactical-brand">{leagueData?.nome || "La tua Lega"}</h1>
          {myTeamData && (
            <div className="hero-team-wrapper">
              <LogoSquadra url={myTeamData.url_logo} nomeSquadra={myTeamData.nome} dimensione="medium" />
              <h2 className="hero-team-title">{myTeamData.nome}</h2>
            </div>
          )}
        </div>
      </div>

      {!userData?.squadra_id ? (
        <div className="team-selection-wrapper">
          {error && <p className="error-text">{error}</p>}
          {existingTeams.length > 0 && (
            <div className="create-team-card spacing-bottom">
              <h2 className="tactical-card-title">Scegli una Squadra esistente</h2>
              <form onSubmit={handleJoinTeam} className="dashboard-form">
                <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="dashboard-select">
                  <option value="">-- Seleziona una Squadra --</option>
                  {existingTeams.map((team) => <option key={team.id} value={team.id}>{team.nome}</option>)}
                </select>
                <button type="submit" className="tactical-btn tactical-btn-secondary" disabled={submitting || !selectedTeamId}>Prendi il Controllo</button>
              </form>
            </div>
          )}
          <div className="create-team-card">
            <h2 className="tactical-card-title">Oppure, crea una nuova Squadra!</h2>
            <form onSubmit={handleCreateTeam} className="dashboard-form">
              <input type="text" placeholder="Es. Real Madrink..." value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={30} className="dashboard-input" />
              <button type="submit" className="tactical-btn tactical-btn-primary" disabled={submitting || !teamName.trim()}>Crea e Partecipa</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-recap-card tactical-stats-container">
            <div className="recap-item tactical-stat-box">
              <span className="recap-label tactical-stat-label">POSIZIONE</span>
              <span className={`recap-value tactical-stats-value rank-position rank-${myRankPosition}`}>{renderRankBadge(myRankPosition)}</span>
            </div>
            <div className="recap-item tactical-stat-box">
              <span className="recap-label tactical-stat-label">PUNTI TOTALI</span>
              <span className="recap-value tactical-stats-value total-points">{(myTeamData?.punti_totali || 0).toFixed(1)}</span>
            </div>
            <div className="recap-item tactical-stat-box">
              <span className="recap-label tactical-stat-label">PENALITÀ</span>
              <span className="recap-value tactical-stats-value penalty-points">{myTeamData?.penalita > 0 ? `-${myTeamData.penalita}` : '0'}</span>
            </div>
          </div>

          <div className="operative-cards-grid">
            <div className={`action-status-card formation ${!targetDates.giornataFormazioneId ? 'inactive-panel' : ''}`}>
              <div className="action-card-header">
                <h3>{targetDates.giornataFormazioneId ? `Giornata ${targetDates.numeroGiornataFormazione} ` : "Schieramento Formazione"}</h3>
                <span className="time-countdown tactical-timer-badge">⏳ {formationCountdown}</span>
              </div>
              <button className="tactical-btn tactical-btn-primary" disabled={!targetDates.giornataFormazioneId} onClick={() => navigate(`/formazione/inserisci/${targetDates.giornataFormazioneId}`)}>Inserisci Formazione</button>
            </div>

            <div className={`action-status-card votes ${!targetDates.giornataVotiId ? 'inactive-panel' : ''}`}>
              <div className="action-card-header">
                <h3>{targetDates.giornataVotiId ? `Calcolo Giornata ${targetDates.numeroGiornataVoti} ` : "Inserimento Voti"}</h3>
                <span className="time-countdown tactical-timer-badge client-timer">⏳ {votesCountdown}</span>
              </div>
              <button className="tactical-btn tactical-btn-secondary" disabled={!targetDates.giornataVotiId} onClick={() => navigate(`/voti/inserisci/${targetDates.giornataVotiId}`)}>Inserisci Voti</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;