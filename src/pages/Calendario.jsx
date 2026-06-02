import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './Calendario.css';

const Calendario = () => {
  const { user } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [giornate, setGiornate] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Stati per la gestione dei dropdown interattivi
  const [giornataSelezionata, setGiornataSelezionata] = useState(null);
  const [squadreFormazioni, setSquadreFormazioni] = useState([]);
  const [loadingSquadre, setLoadingSquadre] = useState(false);
  
  const [squadraSelezionata, setSquadraSelezionata] = useState(null);
  const [dettaglioFormazione, setDettaglioFormazione] = useState({ titolari: [], panchina: [] });
  const [loadingDettaglio, setLoadingDettaglio] = useState(false);

  // Mappa di peso dei ruoli per garantire l'ordine fisso P -> D -> C -> A
  const ordineRuoli = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };

  const fetchCalendarioData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: userData, error: userErr } = await supabase
        .from('utenti')
        .select('lega_id, ruolo')
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
          squadre!squadra_id (id, nome) 
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
          voto_fanta,
          calciatori_reali!calciatore_id (id, nome)
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
          ruolo: fc.ruolo,
          voto_fanta: fc.voto_fanta
        };
      }).filter(Boolean);

      // Ordiniamo in modo deterministico i titolari per Ruolo (P -> D -> C -> A) e poi per Posizione
      const listaTitolari = mappati
        .filter(f => f.posizione <= 11)
        .sort((a, b) => (ordineRuoli[a.ruolo] || 99) - (ordineRuoli[b.ruolo] || 99) || a.posizione - b.posizione);

      // Ordiniamo in modo deterministico le riserve sempre per Ruolo (P -> D -> C -> A) e poi per Posizione
      const listaPanchina = mappati
        .filter(f => f.posizione > 11)
        .sort((a, b) => (ordineRuoli[a.ruolo] || 99) - (ordineRuoli[b.ruolo] || 99) || a.posizione - b.posizione);

      setDettaglioFormazione({
        titolari: listaTitolari,
        panchina: listaPanchina
      });
    } catch (err) {
      console.error("Errore caricamento calciatori:", err);
    } finally {
      setLoadingDettaglio(false);
    }
  };

  const formattaData = (isoString) => {
    if (!isoString) return 'Da definire';
    const opzioni = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleDateString('it-IT', opzioni);
  };

  if (loading) return <div className="calendario-loading">Caricamento calendario... ⏳</div>;

  return (
    <div className="calendario-page">
      <div className="calendario-top-bar">
        <div>
          <h2>Calendario 📅</h2>
          <p className="subtitle">Tocca una giornata per vedere i dettagli e le formazioni schierate.</p>
        </div>
      </div>

      <div className="matchdays-list">
        {giornate.length === 0 ? (
          <p className="no-giornate-msg">Nessuna giornata presente in questa lega.</p>
        ) : (
          giornate.map((day) => {
            const statoReale = calcolaStatoInTempoReale(day);
            
            let statoTesto = 'IN PROGRAMMA';
            let classeStato = 'creata'; 

            if (statoReale === 'in corso') {
              statoTesto = 'IN CORSO';
              classeStato = 'in_corso';
            } else if (statoReale === 'fase calcolo') {
              statoTesto = 'CALCOLO';
              classeStato = 'calcolo';
            } else if (statoReale === 'conclusa') {
              statoTesto = 'CONCLUSA';
              classeStato = 'conclusa';
            }

            const rigaAperta = giornataSelezionata?.id === day.id;

            return (
              <div key={day.id} className="matchday-card-container">
                <div 
                  className={`matchday-row ${classeStato} ${rigaAperta ? 'aperta' : ''}`}
                  onClick={() => handleSelezionaGiornataVisualizza(day, statoReale)}
                >
                  <div className="matchday-details">
                    <span className="matchday-number">G{day.numero_giornata}</span>
                    <div className="matchday-scadenze-block">
                      <span className="scadenza-item">🏁 Inizio: <b>{formattaData(day.apertura_formazioni)}</b></span>
                      <span className="scadenza-item">⏳ Consegna: <b>{formattaData(day.scadenza_formazione)}</b></span>
                    </div>
                  </div>
                  
                  <div className="matchday-actions-area">
                    <span className={`status-badge ${classeStato}`}>
                      {statoTesto}
                    </span>
                  </div>
                </div>

                {/* Dropdown delle formazioni */}
                {rigaAperta && statoReale !== 'in programma' && (
                  <div className="matchday-dropdown-formazioni">
                    <h4>Schieramenti Lega</h4>
                    {loadingSquadre ? (
                      <p className="dropdown-loading-txt">Caricamento squadre... 🏃‍♂️</p>
                    ) : squadreFormazioni.length === 0 ? (
                      <p className="dropdown-loading-txt-empty">Nessuna formazione inserita.</p>
                    ) : (
                      <div className="dropdown-split-layout">
                        <div className="dropdown-squadre-list">
                          {squadreFormazioni.map(sf => {
                            const infoSquadra = Array.isArray(sf.squadre) ? sf.squadre[0] : sf.squadre;
                            if (!infoSquadra) return null;
                            const selezionata = squadraSelezionata?.id === sf.id;

                            return (
                              <React.Fragment key={sf.id}>
                                <button 
                                  className={`btn-club-formazione-trigger ${selezionata ? 'attivo' : ''}`}
                                  onClick={() => handleVediDettaglioFormazione(sf)}
                                >
                                  <div className="club-name-group">
                                    <span className="emoji-club">⚽</span>
                                    <span className="club-title">{infoSquadra.nome}</span>
                                    <span className="modulo-tag-badge">{sf.modulo}</span>
                                  </div>
                                  {sf.punteggio_totale !== null && (
                                    <span className="punteggio-totale-badge">{sf.punteggio_totale.toFixed(1)} pt</span>
                                  )}
                                </button>

                                {/* Visualizzatore Formazione con Bordi Colorati */}
                                {selezionata && (
                                  <div className="dropdown-formazione-visualizzatore">
                                    {loadingDettaglio ? (
                                      <p className="clean-msg">Recupero voti...</p>
                                    ) : (
                                      <div className="campo-mini-render">
                                        <h5>Titolari ({sf.modulo})</h5>
                                        <div className="lista-calciatori-campo">
                                          {dettaglioFormazione.titolari.map(t => (
                                            <div key={t.id} className={`riga-giocatore-campo cal-border-${t.ruolo}`}>
                                              <span className={`mini-ruolo-indicator ${t.ruolo}`}>{t.ruolo}</span>
                                              <span className="nome-giocatore-campo">{t.nome}</span>
                                              <span className="voto-giocatore-campo-live">
                                                {t.voto_fanta !== null ? `${t.voto_fanta}` : 'S.V.'}
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
                                              <div key={p.id} className={`riga-giocatore-campo cal-border-${p.ruolo}`}>
                                                <span className={`mini-ruolo-indicator ${p.ruolo}`}>{p.ruolo}</span>
                                                <span className="nome-giocatore-campo">{p.nome}</span>
                                                <span className="voto-giocatore-campo-live">
                                                  {p.voto_fanta !== null ? `${p.voto_fanta}` : 'S.V.'}
                                                </span>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
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