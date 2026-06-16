import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './Calendario.css';

// --- IMPORT COMPONENTE BANDIERA NAZIONALE ---
import BandieraNazionale from '../components/BandieraNazionale/BandieraNazionale';

// --- INNESTO NOTIFICHE: IMPORTIAMO L'HOOK PERSONALIZZATO ---
import { useNotification } from '../context/NotificationContext';

const ORDINE_RUOLI = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };

const Calendario = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [giornate, setGiornate] = useState([]);
  const [loadingSquadre, setLoadingSquadre] = useState(false);
  const [squadreFormazioni, setSquadreFormazioni] = useState([]);
  const [giornataSelezionata, setGiornataSelezionata] = useState(null);
  const [squadraSelezionata, setSquadraSelezionata] = useState(null);
  const [dettaglioFormazione, setDettaglioFormazione] = useState({ titolari: [], panchina: [] });
  const [loadingDettaglio, setLoadingDettaglio] = useState(false);

  // --- INNESTO NOTIFICHE: ESTRAIAMO LA FUNZIONE SHOWTOAST ---
  const { showToast } = useNotification();

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
      showToast("Impossibile caricare i dati del calendario.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchCalendarioData();
  }, [user]);

  const calcolaStatoInTempoReale = (day) => {
    const adesso = new Date();
    if (adesso < new Date(day.apertura_formazioni)) return 'in programma';
    if (adesso < new Date(day.scadenza_formazione)) return 'in corso';
    if (adesso < new Date(day.scadenza_voti)) return 'fase calcolo';
    return 'conclusa';
  };

  const handleSelezionaGiornataVisualizza = async (giornata, statoReale) => {
    if (statoReale === 'in programma') {
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON UN TOAST WARNING ---
      showToast("Turno in programma: le formazioni non sono ancora accessibili.", "warning");
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
        .select(`id, modulo, punteggio_totale, squadre!squadra_id (id, nome)`)
        .eq('giornata_id', giornata.id);

      if (error) throw error;
      setSquadreFormazioni(data || []);
    } catch (err) {
      console.error("Errore caricamento squadre:", err);
      showToast("Errore nel recupero degli schieramenti.", "error");
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
      // Estraiamo anche il campo 'nazionale' per poter renderizzare la bandiera
      const { data, error } = await supabase
        .from('formazioni_calciatori')
        .select(`posizione, ruolo, voto_fanta, calciatori_reali!calciatore_id (id, nome, nazionale)`)
        .eq('formazione_id', formazione.id)
        .order('posizione', { ascending: true });

      if (error) throw error;

      const mappati = data.map(fc => {
        const c = Array.isArray(fc.calciatori_reali) ? fc.calciatori_reali[0] : fc.calciatori_reali;
        return c ? { ...c, posizione: fc.posizione, ruolo: fc.ruolo, voto_fanta: fc.voto_fanta } : null;
      }).filter(Boolean);

      const baseTitolari = mappati.filter(f => f.posizione <= 11);
      const basePanchina = mappati.filter(f => f.posizione > 11);

      const svPerRuolo = { P: 0, D: 0, C: 0, A: 0 };
      baseTitolari.forEach(t => {
        if (!t.voto_fanta) svPerRuolo[t.ruolo]++;
      });

      const ordinaGiocatori = (a, b) => (ORDINE_RUOLI[a.ruolo] || 99) - (ORDINE_RUOLI[b.ruolo] || 99) || a.posizione - b.posizione;

      const listaTitolari = baseTitolari.map(t => ({
        ...t,
        isSostituito: !t.voto_fanta && basePanchina.some(p => p.ruolo === t.ruolo && p.voto_fanta > 0)
      })).sort(ordinaGiocatori);

      const conteggioEntratiRuolo = { P: 0, D: 0, C: 0, A: 0 };
      const listaPanchina = basePanchina.map(p => {
        let isSubentrato = false;
        if (p.voto_fanta > 0 && conteggioEntratiRuolo[p.ruolo] < svPerRuolo[p.ruolo]) {
          isSubentrato = true;
          conteggioEntratiRuolo[p.ruolo]++;
        }
        return { ...p, isSubentrato };
      }).sort(ordinaGiocatori);

      setDettaglioFormazione({ titolari: listaTitolari, panchina: listaPanchina });
    } catch (err) {
      console.error("Errore caricamento calciatori:", err);
      showToast("Impossibile caricare il dettaglio della formazione.", "error");
    } finally {
      setLoadingDettaglio(false);
    }
  };

  const formattaData = (isoString) => {
    if (!isoString) return 'Da definire';
    return new Date(isoString).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="calendario-loading">Caricamento calendario... ⏳</div>;

  const configStati = {
    'in corso': { testo: 'IN CORSO', classe: 'in_corso' },
    'fase calcolo': { testo: 'CALCOLO', classe: 'calcolo' },
    'conclusa': { testo: 'CONCLUSA', classe: 'conclusa' },
    'in programma': { testo: 'IN PROGRAMMA', classe: 'creata' }
  };

  return (
    <div className="calendario-page tactical-dashboard-gap">
      <div className="calendario-top-bar">
        <h2 className="tactical-page-title">Calendario</h2>
        <p className="subtitle">Tocca una giornata per vedere i dettagli e le formazioni schierate.</p>
      </div>

      <div className="matchdays-list">
        {giornate.length === 0 ? (
          <p className="no-giornate-msg">Nessuna giornata presente in questa lega.</p>
        ) : (
          giornate.map((day) => {
            const statoReale = calcolaStatoInTempoReale(day);
            const { testo: statoTesto, classe: classeStato } = configStati[statoReale] || configStati['in programma'];
            const rigaAperta = giornataSelezionata?.id === day.id;

            return (
              <div key={day.id} className="matchday-card-container tactical-card">
                <div 
                  className={`matchday-row ${classeStato} ${rigaAperta ? 'aperta' : ''}`}
                  onClick={() => handleSelezionaGiornataVisualizza(day, statoReale)}
                >
                  <div className="matchday-details">
                    <span className="matchday-number">G{day.numero_giornata}</span>
                    <div className="matchday-scadenze-block">
                      <span className="scadenza-item">🏁 Inizio: <b>{formattaData(day.apertura_formazioni)}</b></span>
                      <span className="scadenza-item">⏳ Fine: <b>{formattaData(day.scadenza_formazione)}</b></span>
                    </div>
                  </div>
                  
                  <div className="matchday-actions-area">
                    <span className={`status-badge ${classeStato}`}>{statoTesto}</span>
                  </div>
                </div>

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

                                {selezionata && (
                                  <div className="dropdown-formazione-visualizzatore">
                                    {loadingDettaglio ? (
                                      <p className="clean-msg">Recupero voti...</p>
                                    ) : (
                                      <div className="campo-mini-render">
                                        <h5>Titolari ({sf.modulo})</h5>
                                        <div className="lista-calciatori-campo">
                                          {dettaglioFormazione.titolari.map(t => (
                                            <div key={t.id} className={`riga-giocatore-campo cal-border-${t.ruolo} ${t.isSostituito ? 'giocatore-sostituito' : ''}`}>
                                              <span className={`mini-ruolo-indicator ${t.ruolo}`}>{t.ruolo}</span>
                                              <span className="nome-giocatore-campo" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                {t.nome} 
                                                <BandieraNazionale nazione={t.nazionale} />
                                                {t.isSostituito && <span className="badge-cambio uscito">🔄 Uscito</span>}
                                              </span>
                                              <span className="voto-giocatore-campo-live">
                                                {t.voto_fanta ? t.voto_fanta : 's.v.'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>

                                        <h5 className="margin-top-panchina">Panchina</h5>
                                        <div className="lista-calciatori-campo riserves">
                                          {dettaglioFormazione.panchina.length === 0 ? (
                                            <p className="no-panchina-text">Nessuna riserva inserita</p>
                                          ) : (
                                            dettaglioFormazione.panchina.map(p => (
                                              <div key={p.id} className={`riga-giocatore-campo cal-border-${p.ruolo} ${p.isSubentrato ? 'giocatore-subentrato' : ''}`}>
                                                <span className={`mini-ruolo-indicator ${p.ruolo}`}>{p.ruolo}</span>
                                                <span className="nome-giocatore-campo" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                  {p.nome}
                                                  <BandieraNazionale nazione={p.nazionale} />
                                                  {p.isSubentrato && <span className="badge-cambio entrato">🟢 Entrato</span>}
                                                </span>
                                                <span className="voto-giocatore-campo-live">
                                                  {p.voto_fanta ? p.voto_fanta : 's.v.'}
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