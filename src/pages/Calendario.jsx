import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './Calendario.css';

const Calendario = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [giornate, setGiornate] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Stati per gestire l'apertura e la visualizzazione interattiva dei dettagli di un turno
  const [giornataSelezionata, setGiornataSelezionata] = useState(null);
  const [squadreFormazioni, setSquadreFormazioni] = useState([]);
  const [loadingSquadre, setLoadingSquadre] = useState(false);
  
  const [squadraSelezionata, setSquadraSelezionata] = useState(null);
  const [dettaglioFormazione, setDettaglioFormazione] = useState({ titolari: [], panchina: [] });
  const [loadingDettaglio, setLoadingDettaglio] = useState(false);

  // Carica i dati dell'utente loggato e della rispettiva lega
  const fetchCalendarioData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: userData, error: userErr } = await supabase
        .from('utenti')
        .select('lega_id, squadra_id, ruolo')
        .eq('id', user.id)
        .single();

      if (userErr) throw userErr;
      setCurrentUserData(userData);

      if (userData?.lega_id) {
        const { data: giornateData, error: gioErr } = await supabase
          .from('giornate')
          .select('*')
          .eq('lega_id', userData.lega_id)
          .order('numero_giornata', { ascending: true });

        if (gioErr) throw gioErr;
        setGiornate(giornateData || []);
      }
    } catch (err) {
      console.error("Errore durante il caricamento del calendario:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCalendarioData();
    }
  }, [user]);

  // FUNZIONE CHIAVE: Calcola lo stato temporale esatto ed esplicito di un turno
  const calcolaStatoInTempoReale = (day) => {
    const adesso = new Date();
    const inizioFormazioni = new Date(day.apertura_formazioni);
    const fineFormazioni = new Date(day.scadenza_formazione);
    const fineVoti = new Date(day.scadenza_voti);

    if (adesso < inizioFormazioni) return 'in programma';
    if (adesso >= inizioFormazioni && adesso < fineFormazioni) return 'in corso';
    if (adesso >= fineFormazioni && adesso < fineVoti) return 'fase calcolo';
    return 'conclusa';
  };

  // Carica le formazioni inserite per la giornata selezionata (impedito se in programma)
  const handleSelezionaGiornataVisualizza = async (giornata, statoReale) => {
    if (statoReale === 'in programma') {
      alert("Turno in programma: le formazioni non sono ancora accessibili.");
      return;
    }

    if (giornataSelezionata?.id === giornata.id) {
      setGiornataSelezionata(null);
      setSquadreFormazioni([]);
      setSquadraSelezionata(null);
      return;
    }
    
    setGiornataSelezionata(giornata);
    setSquadraSelezionata(null);
    setSquadreFormazioni([]);
    
    try {
      setLoadingSquadre(true);
      const { data, error } = await supabase
        .from('formazioni')
        .select(`
          id,
          modulo,
          punteggio_totale,
          squadre!squadra_id (id, nome, url_logo) 
        `)
        .eq('giornata_id', giornata.id);

      if (error) throw error;
      setSquadreFormazioni(data || []);
    } catch (err) {
      console.error("Errore caricamento squadre:", err);
    } finally {
      setLoadingSquadre(false);
    }
  };

  // Carica i dettagli dei calciatori della formazione scelta
  const handleVediDettaglioFormazione = async (formazione) => {
    if (squadraSelezionata?.id === formazione.id) {
      setSquadraSelezionata(null);
      return;
    }

    setSquadraSelezionata(formazione);
    try {
      setLoadingDettaglio(true);
      const { data, error } = await supabase
        .from('formazioni_calciatori')
        .select(`
          posizione,
          ruolo,
          voto_base,
          bonus_malus,
          voto_fanta,
          calciatori_reali!calciatore_id (id, nome, ruolo, nazionale)
        `)
        .eq('formazione_id', formazione.id)
        .order('posizione', { ascending: true });

      if (error) throw error;

      const mappati = data.map(fc => {
        const c = Array.isArray(fc.calciatori_reali) ? fc.calciatori_reali[0] : fc.calciatori_reali;
        if (!c) return null;
        return { 
          ...c, 
          posizione: fc.posizione,
          voto_base: fc.voto_base,
          bonus_malus: fc.bonus_malus,
          voto_fanta: fc.voto_fanta
        };
      }).filter(Boolean);

      setDettaglioFormazione({
        titolari: mappati.filter(f => f.posizione <= 11),
        panchina: mappati.filter(f => f.posizione > 11)
      });
    } catch (err) {
      console.error("Errore caricamento calciatori:", err);
    } finally {
      setLoadingDettaglio(false);
    }
  };

  // Naviga alla pagina d'azione corretta in base allo stato temporale reale
  const handleAzioneGiornata = (giornata, statoReale) => {
    if (!currentUserData?.squadra_id) {
      alert("Attenzione: devi prima essere assegnato a una squadra per poter interagire con le giornate.");
      return;
    }

    if (statoReale === 'in corso') {
      navigate(`/formazione/inserisci/${giornata.id}`);
    } else if (statoReale === 'fase calcolo') {
      navigate(`/voti/inserisci/${giornata.id}`);
    } else if (statoReale === 'conclusa') {
      navigate(`/calendario/risultati/${giornata.id}`);
    } else {
      alert("Questa giornata non è ancora aperta alle modifiche.");
    }
  };

  const formattaData = (isoString) => {
    if (!isoString) return 'Da definire';
    const opzioni = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleDateString('it-IT', opzioni);
  };

  if (loading) return <div className="calendario-loading">Caricamento calendario in corso... ⏳</div>;

  return (
    <div className="calendario-page">
      <div className="calendario-top-bar">
        <div>
          <h2>Calendario della Lega 📅</h2>
          <p className="subtitle">Consulta lo stato delle giornate e premi sulla riga del turno per spiare le formazioni e i voti inseriti:</p>
        </div>
        {currentUserData?.ruolo === 'admin' && (
          <button className="btn-admin-setup-veloce" onClick={() => navigate('/admin/giornate')}>
            👑 Gestisci Giornate
          </button>
        )}
      </div>

      <div className="matchdays-list">
        {giornate.length === 0 ? (
          <p className="no-giornate-msg">Nessuna giornata presente in questa lega. L'amministratore attiverà i turni a breve.</p>
        ) : (
          giornate.map((day) => {
            // Calcoliamo lo stato temporale esatto per ogni singola riga di giornata generata
            const statoReale = calcolaStatoInTempoReale(day);
            
            let statoTesto = 'IN PROGRAMMA';
            let bottoneTesto = 'Non Attivo';
            let classeStato = 'creata'; 
            let isBttnDisabled = false;

            if (statoReale === 'in corso') {
              statoTesto = 'IN CORSO';
              bottoneTesto = 'Schiera';
              classeStato = 'in_corso';
            } else if (statoReale === 'fase calcolo') {
              statoTesto = 'INSERIMENTO VOTI';
              bottoneTesto = 'Invia Voti';
              classeStato = 'calcolo';
            } else if (statoReale === 'conclusa') {
              statoTesto = 'CONCLUSA';
              bottoneTesto = 'Vedi Risultati';
              classeStato = 'conclusa';
            } else {
              isBttnDisabled = true;
            }

            const rigaAperta = giornataSelezionata?.id === day.id;

            return (
              <div key={day.id} className="matchday-card-container">
                <div className={`matchday-row ${classeStato} ${rigaAperta ? 'aperta' : ''}`}>
                  <div className="matchday-clickable-zone" onClick={() => handleSelezionaGiornataVisualizza(day, statoReale)}>
                    <div className="matchday-details">
                      <span className="matchday-number">G{day.numero_giornata}</span>
                      <div className="matchday-scadenze-block">
                        <span className="scadenza-item">🏁 Apertura: <b>{formattaData(day.apertura_formazioni)}</b></span>
                        <span className="scadenza-item">⏳ Consegna: <b>{formattaData(day.scadenza_formazione)}</b></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="matchday-actions-area">
                    <span className={`status-badge ${classeStato}`}>
                      {statoTesto}
                    </span>
                    
                    <button 
                      className={`btn-action-giornata ${classeStato}`}
                      onClick={() => handleAzioneGiornata(day, statoReale)}
                      disabled={isBttnDisabled}
                    >
                      {bottoneTesto}
                    </button>
                  </div>
                </div>

                {/* Blocco Espandibile delle formazioni */}
                {rigaAperta && statoReale !== 'in programma' && (
                  <div className="matchday-dropdown-formazioni">
                    <h4>Formazioni e Punteggi Inseriti</h4>
                    {loadingSquadre ? (
                      <p className="dropdown-loading-txt">Pescando schieramenti registrati... 🏃‍♂️</p>
                    ) : squadreFormazioni.length === 0 ? (
                      <p className="dropdown-loading-txt-empty">Nessuna formazione inserita per questa giornata.</p>
                    ) : (
                      <div className="dropdown-split-layout">
                        <div className="dropdown-squadre-list">
                          {squadreFormazioni.map(sf => {
                            const infoSquadra = Array.isArray(sf.squadre) ? sf.squadre[0] : sf.squadre;
                            if (!infoSquadra) return null;
                            const selezionata = squadraSelezionata?.id === sf.id;

                            return (
                              <button 
                                key={sf.id} 
                                className={`btn-club-formazione-trigger ${selezionata ? 'attivo' : ''}`}
                                onClick={() => handleVediDettaglioFormazione(sf)}
                              >
                                <span>⚽ {infoSquadra.nome} <span className="modulo-tag-badge">{sf.modulo}</span></span>
                                {sf.punteggio_totale !== null && (
                                  <span className="punteggio-totale-badge">{sf.punteggio_totale.toFixed(1)} pt</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="dropdown-formazione-visualizzatore">
                          {loadingDettaglio ? (
                            <p className="clean-msg">Lettura tattica e voti...</p>
                          ) : squadraSelezionata ? (
                            <div className="campo-mini-render">
                              <h5>Titolari ({squadraSelezionata.modulo})</h5>
                              <div className="lista-calciatori-campo">
                                {dettaglioFormazione.titolari.map(t => (
                                  <div key={t.id} className="riga-giocatore-campo">
                                    <span className={`mini-ruolo-indicator ${t.ruolo}`}>{t.ruolo}</span>
                                    <span className="nome-giocatore-campo">{t.nome}</span>
                                    <span className="voto-giocatore-campo-live">
                                      {t.voto_base !== null ? `${t.voto_base} [${t.bonus_malus >= 0 ? '+' : ''}${t.bonus_malus}] = ${t.voto_fanta}` : 'S.V.'}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <h5 className="margin-top-panchina">Panchina</h5>
                              <div className="lista-calciatori-campo riserve">
                                {dettaglioFormazione.panchina.length === 0 ? (
                                  <p className="no-panchina-text">Nessuna riserva inserita</p>
                                ) : (
                                  dettaglioFormazione.panchina.map(p => (
                                    <div key={p.id} className="riga-giocatore-campo">
                                      <span className={`mini-ruolo-indicator ${p.ruolo}`}>{p.ruolo}</span>
                                      <span className="nome-giocatore-campo">{p.nome}</span>
                                      <span className="voto-giocatore-campo-live">
                                        {p.voto_base !== null ? `${p.voto_base} [${p.bonus_malus >= 0 ? '+' : ''}${p.bonus_malus}] = ${p.voto_fanta}` : 'S.V.'}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="select-club-hint">Seleziona uno dei club a sinistra per analizzare i voti ed i modificatori.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Calendario;