import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './InserisciFormazione.css';

// --- IMPORT COMPONENTE BANDIERA NAZIONALE ---
import BandieraNazionale from '../components/BandieraNazionale/BandieraNazionale';

// --- INNESTO NOTIFICHE: IMPORTIAMO L'HOOK PERSONALIZZATO DAL CONTEXT ---
import { useNotification } from '../context/NotificationContext';

const InserisciFormazione = () => {
  const { giornataId } = useParams(); // Prende l'id della giornata corrente dall'URL
  const { user } = useUser(); // Prende l'utente autenticato tramite Clerk
  const navigate = useNavigate(); // Hook per spostarsi tra le pagine

  // --- INNESTO NOTIFICHE: RECUPERIAMO LA FUNZIONE CENTRALIZZATA DEI TOAST ---
  const { showToast } = useNotification();

  // Stati generali dell'applicazione
  const [loading, setLoading] = useState(true); // Stato di caricamento iniziale
  const [saving, setSaving] = useState(false); // Stato durante il salvataggio dei dati
  const [giornata, setGiornata] = useState(null); // Contiene i metadati della giornata
  const [squadraId, setSquadraId] = useState(null); // L'ID della squadra dell'utente loggato
  const [rosa, setRosa] = useState([]); // Elenco di tutti i calciatori della squadra

  // Stati dello schieramento tattico
  const [modulo, setModulo] = useState('4-4-2'); // Modulo base predefinito
  const [titolari, setTitolari] = useState([]); // Array dei calciatori scelti come titolari
  const [panchina, setPanchina] = useState([]); // Array dei calciatori scelti in panchina

  // Stato per gestire l'apertura e i filtri della finestra modale (overlay)
  const [overlay, setOverlay] = useState({ isOpen: false, ruolo: '', tipo: '' });

  // Regole strutturali dei moduli fantacalcistici
  const regoleModuli = {
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '4-5-1': { P: 1, D: 4, C: 5, A: 1 },
    '5-3-2': { P: 1, D: 5, C: 3, A: 2 },
    '5-4-1': { P: 1, D: 5, C: 4, A: 1 }
  };

  // Limiti massimi consentiti per ruolo in panchina
  const limitiPanchina = { P: 1, D: 2, C: 2, A: 2 };

  // Effetto per caricare i dati iniziali della pagina dal database Supabase
  useEffect(() => {
    const inizializzaPagina = async () => {
      try {
        if (!user || !giornataId) return;

        // 1. Recupera informazioni sulla giornata di campionato corrente
        const { data: gData } = await supabase.from('giornate').select('*').eq('id', giornataId).single();
        setGiornata(gData);

        // 2. Recupera l'ID della squadra associata all'utente corrente
        const { data: uData } = await supabase.from('utenti').select('squadra_id').eq('id', user.id).single();
        setSquadraId(uData.squadra_id);

        // 3. Recupera tutti i calciatori reali che fanno parte della rosa dell'utente
        const { data: rosaData } = await supabase.from('rose_squadre').select('calciatore_id, calciatori_reali(id, nome, ruolo, nazionale)').eq('squadra_id', uData.squadra_id);

        // Converte e pulisce i dati dei calciatori estratti gestendo eventuali array nidificati
        const listaCalciatori = rosaData.map(r => Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali).filter(Boolean);
        setRosa(listaCalciatori);

        // 4. Verifica si l'utente ha già salvato una formazione per questa giornata specifica
        const { data: formEsistente } = await supabase.from('formazioni').select('*').eq('squadra_id', uData.squadra_id).eq('giornata_id', giornataId).maybeSingle();

        if (formEsistente) {
          setModulo(formEsistente.modulo);
          // Recupera i singoli calciatori associati alla vecchia formazione inserita
          const { data: calcSchierati } = await supabase.from('formazioni_calciatori').select('*').eq('formazione_id', formEsistente.id).order('posizione', { ascending: true });

          if (calcSchierati) {
            const vecchiTitolari = [];
            const vecchiaPanchina = [];

            // Smista i calciatori recuperati tra titolari e panchina basandosi sul valore della posizione
            calcSchierati.forEach(cs => {
              const info = listaCalciatori.find(item => item.id === cs.calciatore_id);
              if (info) {
                if (cs.posizione <= 11) {
                  vecchiTitolari.push(info);
                } else {
                  vecchiaPanchina.push(info);
                }
              }
            });
            setTitolari(vecchiTitolari);
            setPanchina(vecchiaPanchina);
          }
        }
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
        showToast("Errore nel recupero della tua rosa o formazione.", "error");
      } finally {
        setLoading(false); // Disattiva la schermata di caricamento
      }
    };

    inizializzaPagina();
  }, [user, giornataId]);

  // Gestisce l'inserimento o la rimozione di un giocatore dai titolari
  const gestisciTitolare = (calciatore) => {
    if (titolari.some(t => t.id === calciatore.id)) {
      // Se è già titolare, lo rimuove dall'elenco
      setTitolari(prev => prev.filter(t => t.id !== calciatore.id));
    } else {
      // Altrimenti controlla se ci sono posti liberi per quel ruolo nel modulo selezionato
      const limiteRuolo = regoleModuli[modulo][calciatore.ruolo];
      const attualiRuolo = titolari.filter(t => t.ruolo === calciatore.ruolo).length;

      if (attualiRuolo >= limiteRuolo) {
        // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST WARNING ---
        showToast(`Massimo ${limiteRuolo} giocatori per il ruolo ${calciatore.ruolo} con questo modulo.`, "warning");
        return;
      }

      // Rimuove il giocatore dalla panchina se presente, e lo aggiunge ai titolari
      setPanchina(prev => prev.filter(p => p.id !== calciatore.id));
      setTitolari(prev => [...prev, calciatore]);
    }
    setOverlay({ isOpen: false, ruolo: '', tipo: '' }); // Chiude il pannello di scelta
  };

  // Gestisce l'inserimento di un giocatore all'interno della panchina
  const gestisciPanchina = (calciatore) => {
    const attualiInPanchina = panchina.filter(p => p.ruolo === calciatore.ruolo).length;
    const limiteConsentito = limitiPanchina[calciatore.ruolo];

    // Verifica il superamento del limite massimo per ruolo stabilito per le riserve
    if (attualiInPanchina >= limiteConsentito) {
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST WARNING ---
      showToast(`In panchina puoi mettere al massimo ${limiteConsentito} per il ruolo: ${calciatore.ruolo}`, "warning");
      return;
    }

    // Aggiunge in coda il nuovo panchinaro
    setPanchina(prev => [...prev, calciatore]);
    setOverlay({ isOpen: false, ruolo: '', tipo: '' }); // Chiude la modale
  };

  // Resetta il campo di gioco se l'utente decide di cambiare modulo tattico
  const handleCambioModulo = (nuovoModulo) => {
    setModulo(nuovoModulo);
    setTitolari([]);
    setPanchina([]);
  };

  // Invia e salva permanentemente la formazione sul database Supabase
  const handleSalvaFormazione = async () => {
    if (titolari.length === 0 && panchina.length === 0) {
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST WARNING ---
      showToast("Inserisci almeno un giocatore (titolare o panchina) prima di salvare!", "warning");
      return;
    }

    try {
      setSaving(true);
      // Inserisce o aggiorna la riga master della formazione
      const { data: formSalvata, error: fErr } = await supabase
        .from('formazioni')
        .upsert({ squadra_id: squadraId, giornata_id: giornataId, modulo: modulo, confermata: true }, { onConflict: 'squadra_id,giornata_id' })
        .select().single();

      if (fErr) throw fErr;

      // Cancella le vecchie associazioni dei calciatori per evitare conflitti o vecchi dati orfani
      await supabase.from('formazioni_calciatori').delete().eq('formazione_id', formSalvata.id);

      const recordCalciatori = [];

      // Popola l'array temporaneo strutturando i dati per i giocatori titolari (posizioni da 1 a 11)
      titolari.forEach((giocatore, index) => {
        recordCalciatori.push({
          formazione_id: formSalvata.id,
          calciatore_id: giocatore.id,
          ruolo: giocatore.ruolo,
          posizione: index + 1
        });
      });

      // Popola lo stesso array per i giocatori in panchina (posizioni a partire da 12)
      panchina.forEach((giocatore, index) => {
        recordCalciatori.push({
          formazione_id: formSalvata.id,
          calciatore_id: giocatore.id,
          ruolo: giocatore.ruolo,
          posizione: 12 + index
        });
      });

      // Invia massivamente tutti i record strutturati alla tabella di giunzione
      await supabase.from('formazioni_calciatori').insert(recordCalciatori);

      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST SUCCESS ---
      showToast("Formazione salvata correttamente!", "success");
      navigate('/dashboard'); // Ritorna alla schermata principale
    } catch (err) {
      console.error(err);
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST ERROR ---
      showToast("Errore durante il salvataggio della formazione.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Genera dinamicamente le card grafiche sul campo da calcio per un determinato ruolo
  const renderLineaSquadra = (ruoloKey) => {
    const postiMassimi = regoleModuli[modulo][ruoloKey]; // Posti previsti dal modulo per questo ruolo
    const schieratiQuestoRuolo = titolari.filter(t => t.ruolo === ruoloKey); // Quanti già scelti
    const nodi = [];

    // Cicla per generare gli slot occupati o i pulsanti vuoti per inserire i giocatori
    for (let i = 0; i < postiMassimi; i++) {
      const giocatore = schieratiQuestoRuolo[i];
      if (giocatore) {
        // Renderizza la card con il nome del calciatore schierato (Bandiera posizionata SOTTO al nome)
        nodi.push(
          <div key={`tit-${ruoloKey}-${i}`} className={`campo-player-card occupato border-${ruoloKey}`} onClick={() => gestisciTitolare(giocatore)}>
            <span className={`badge-ruolo-mini ${giocatore.ruolo}`}>{giocatore.ruolo}</span>
            <span className="campo-player-name">{giocatore.nome}</span>
            <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
              <BandieraNazionale nazione={giocatore.nazionale} />
            </div>
            <span className="remove-icon">✕</span>
          </div>
        );
      } else {
        // Renderizza lo slot vuoto con il simbolo "+" per aprirne la scelta
        nodi.push(
          <div key={`slot-vuoto-${ruoloKey}-${i}`} className={`campo-player-card vuoto border-${ruoloKey}`} onClick={() => setOverlay({ isOpen: true, ruolo: ruoloKey, tipo: 'titolare' })}>
            <span className="add-icon">+</span>
            <span className="add-label">Aggiungi</span>
          </div>
        );
      }
    }
    return nodi;
  };

  // Filtra la rosa escludendo chi è già stato posizionato sul terreno di gioco o in panchina
  const giocatoriSelezionabili = rosa.filter(g => {
    if (g.ruolo !== overlay.ruolo) return false;
    if (titolari.some(t => t.id === g.id)) return false;
    if (panchina.some(p => p.id === g.id)) return false;
    return true;
  });

  // Mostra un messaggio testuale durante il caricamento iniziale asincrono dei dati da Supabase
  if (loading) return <div className="formazione-loading">Caricamento della rosa... 🏃‍♂️</div>;

  return (
    <div className="inserisci-formazione-page tactical-dashboard-gap">
      <div className="formazione-header">
        <button className="btn-back-formazione" onClick={() => navigate('/dashboard')}>⬅️</button>
        <h2>Schiera Giornata {giornata?.numero_giornata}</h2>
      </div>

      {/* Box Selezione del Modulo Tattico */}
      <div className="modulo-selector-card tactical-card">
        <label htmlFor="modulo-select">Modulo:</label>
        <select
          id="modulo-select"
          className="select-modulo-dropdown"
          value={modulo}
          onChange={(e) => handleCambioModulo(e.target.value)}
        >
          {Object.keys(regoleModuli).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Recap Contatori Numerici dei Calciatori Schierati */}
      <div className="recap-schieramento tactical-card">
        <div>Titolari: <b>{titolari.length} / 11</b></div>
        <div>Panchina: <b>{panchina.length} / 7</b></div>
      </div>

      {/* Sezione Campo da Gioco Visivo + Panchina Verticale */}
      <div className="campo-visual-section">
        <div className="campo-container">
          <div className="campo-erba">
            <div className="linea-gessata area-alto"></div>
            <div className="linea-gessata centrocampo-linea"><div className="cerchio-centrocampo"></div></div>
            <div className="linea-gessata area-basso"></div>

            {/* Renderizza i reparti sul rettangolo verde dall'alto verso il basso */}
            <div className="linea-campo linea-attacco">{renderLineaSquadra('A')}</div>
            <div className="linea-campo linea-centrocampo">{renderLineaSquadra('C')}</div>
            <div className="linea-campo linea-difesa">{renderLineaSquadra('D')}</div>
            <div className="linea-campo linea-portiere">{renderLineaSquadra('P')}</div>
          </div>
        </div>

        {/* Elenco e Gestione dei Panchinari */}
        <div className="panchina-container tactical-card">
          <h3>Panchina</h3>
          <div className="panchina-vertical-list">
            {['P', 'D', 'C', 'A'].map(r => {
              const riserveRuolo = panchina.filter(p => p.ruolo === r);
              return (
                <div key={r} className="panchina-ruolo-row">
                  <div className="panchina-ruolo-header-flat" onClick={() => setOverlay({ isOpen: true, opacity: 1, ruolo: r, tipo: 'panchina' })}>
                    <div className="header-flat-left">
                      <span className={`badge-ruolo-mini static-badge ${r}`}>{r}</span>
                      <span className="ruolo-flat-title">
                        {r === 'P' ? 'Portieri' : r === 'D' ? 'Difensori' : r === 'C' ? 'Centrocampisti' : 'Attaccanti'}
                      </span>
                    </div>
                    <span className="counter-flat-riserve">
                      {riserveRuolo.length} / {limitiPanchina[r]} <b className="plus-indicator-flat">+</b>
                    </span>
                  </div>
                  <div className="panchina-items-vertical-stack">
                    {riserveRuolo.length === 0 ? (
                      <span className="empty-pan-text-flat">Nessun giocatore inserito</span>
                    ) : (
                      riserveRuolo.map(p => (
                        <div key={p.id} className={`panchinaro-item-flat flat-border-${r}`} onClick={() => setPanchina(prev => prev.filter(item => item.id !== p.id))}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span className="panchinaro-name-flat">{p.nome}</span>
                            <BandieraNazionale nazione={p.nazionale} />
                          </div>
                          <span className="remove-icon-flat">✕</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pannello Modale di Selezione Calciatore (Overlay) */}
      {overlay.isOpen && (
        <div className="overlay-scelta-giocatore">
          <div className="overlay-content-card tactical-card">
            <div className="overlay-header">
              <h4>Seleziona {overlay.ruolo === 'P' ? 'Portiere' : overlay.ruolo === 'D' ? 'Difensore' : overlay.ruolo === 'C' ? 'Centrocampista' : 'Attaccante'}</h4>
              <button className="btn-close-overlay" onClick={() => setOverlay({ isOpen: false, ruolo: '', tipo: '' })}>&times;</button>
            </div>
            <div className="overlay-list-scroll">
              {giocatoriSelezionabili.length === 0 ? <p className="no-players-overlay">Nessun giocatore disponibile in rosa.</p> : (
                giocatoriSelezionabili.map(g => (
                  <div key={g.id} className="giocatore-overlay-row" onClick={() => overlay.tipo === 'titolare' ? gestisciTitolare(g) : gestisciPanchina(g)}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="giocatore-overlay-name">{g.nome}</span>
                      <BandieraNazionale nazione={g.nazionale} />
                    </div>
                    <button className="btn-select-giocatore">Schiera</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Azione di Conferma e Invio Formazione */}
      <div className="formazione-footer-actions">
        <button className="btn-save-formazione-def" onClick={handleSalvaFormazione} disabled={saving}>
          {saving ? 'Salvataggio...' : '💾 Salva e Conferma Formazione'}
        </button>
      </div>
    </div>
  );
};

export default InserisciFormazione;