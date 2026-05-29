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

  // Stati per la visualizzazione interattiva formazioni inserite
  const [giornataSelezionata, setGiornataSelezionata] = useState(null);
  const [squadreFormazioni, setSquadreFormazioni] = useState([]);
  const [loadingSquadre, setLoadingSquadre] = useState(false);
  
  const [squadraSelezionata, setSquadraSelezionata] = useState(null);
  const [dettaglioFormazione, setDettaglioFormazione] = useState({ titolari: [], panchina: [] });
  const [loadingDettaglio, setLoadingDettaglio] = useState(false);

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

  // Recupera le squadre che hanno inserito una formazione per la giornata selezionata
  const handleSelezionaGiornataVisualizza = async (giornata) => {
    const statoNormalizzato = giornata.stato?.toLowerCase();
    
    // Se la giornata è in programma, non mostrare alcun dettaglio formazioni
    if (statoNormalizzato === 'in programma') {
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

  // Carica i calciatori schierati dalla squadra scelta con i loro voti inseriti
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

  const handleAzioneGiornata = (giornata) => {
    if (!currentUserData?.squadra_id) {
      alert("Attenzione: devi prima essere assegnato a una squadra per poter interagire con le giornate.");
      return;
    }

    const statoNormalizzato = giornata.stato?.toLowerCase();

    if (statoNormalizzato === 'in corso') {
      navigate(`/formazione/inserisci/${giornata.id}`);
    } else if (statoNormalizzato === 'fase calcolo') {
      navigate(`/voti/inserisci/${giornata.id}`); // <-- ALLINEATO CON LA NUOVA ROTTA
    } else if (statoNormalizzato === 'conclusa') {
      navigate(`/calendario/risultati/${giornata.id}`);
    } else if (statoNormalizzato === 'in programma') {
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
            const statoNormalizzato = day.stato?.toLowerCase();
            let statoTesto = 'IN PROGRAMMA';
            let bottoneTesto = 'Non Attivo';
            let classeStato = 'creata'; 
            let isBttnDisabled = false;

            if (statoNormalizzato === 'in corso') {
              statoTesto = 'IN CORSO';
              bottoneTesto = 'Schiera';
              classeStato = 'in_corso';
            } else if (statoNormalizzato === 'fase calcolo') {
              statoTesto = 'INSERIMENTO VOTI';
              bottoneTesto = 'Invia Voti';
              classeStato = 'calcolo';
            } else if (statoNormalizzato === 'conclusa') {
              statoTesto = 'CONCLUSA';
              bottoneTesto = 'Vedi Risultati';
              classeStato = 'conclusa';
            } else {
              statoTesto = 'IN PROGRAMMA';
              bottoneTesto = 'Bloccato';
              classeStato = 'creata';
              isBttnDisabled = true;
            }

            const rigaAperta = giornataSelezionata?.id === day.id;

            return (
              <div key={day.id} className="matchday-card-container">
                <div className={`matchday-row ${classeStato} ${rigaAperta ? 'aperta' : ''}`}>
                  <div className="matchday-clickable-zone" onClick={() => handleSelezionaGiornataVisualizza(day)}>
                    <div className="matchday-details">
                      <span className="matchday-number">G{day.numero_giornata}</span>
                      <div className="matchday-scadenze-block">
                        <span className="scadenza-item">⏳ Consegna: <b>{formattaData(day.scadenza_formazione)}</b></span>
                        <span className="scadenza-item">📝 Calcolo Voti: <b>{formattaData(day.scadenza_voti)}</b></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="matchday-actions-area">
                    <span className={`status-badge ${classeStato}`}>
                      {statoTesto}
                    </span>
                    
                    <button 
                      className={`btn-action-giornata ${classeStato}`}
                      onClick={() => handleAzioneGiornata(day)}
                      disabled={isBttnDisabled}
                    >
                      {bottoneTesto}
                    </button>
                  </div>
                </div>

                {/* Sezione Espandibile Formazioni Ispezionabili */}
                {rigaAperta && statoNormalizzato !== 'in programma' && (
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