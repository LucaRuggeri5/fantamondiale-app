import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './InserisciFormazione.css';

const InserisciFormazione = () => {
  const { giornataId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  // Stati per la gestione dei dati e caricamenti
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [giornata, setGiornata] = useState(null);
  const [squadraId, setSquadraId] = useState(null);
  const [rosa, setRosa] = useState([]);
  
  // Stati per le scelte dell'utente (Modulo e Liste Giocatori)
  const [modulo, setModulo] = useState('4-4-2');
  const [titolari, setTitolari] = useState([]);
  // Gestiamo la panchina come un unico array piatto per alleggerire il codice
  const [panchina, setPanchina] = useState([]);

  // Stato per la finestra modale di selezione
  const [overlay, setOverlay] = useState({ isOpen: false, ruolo: '', tipo: '' });

  // Configurazione dei moduli (quanti giocatori per ruolo nei titolari)
  const regoleModuli = {
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '4-5-1': { P: 1, D: 4, C: 5, A: 1 }
  };

  // Nuovi limiti rigidi per la panchina richiesti
  const limitiPanchina = { P: 1, D: 2, C: 2, A: 2 };

  useEffect(() => {
    const inizializzaPagina = async () => {
      try {
        if (!user || !giornataId) return;

        // 1. Recuperiamo i dettagli della giornata attuale
        const { data: gData } = await supabase.from('giornate').select('*').eq('id', giornataId).single();
        setGiornata(gData);

        // 2. Recuperiamo l'ID della squadra dell'utente loggato
        const { data: uData } = await supabase.from('utenti').select('squadra_id').eq('id', user.id).single();
        setSquadraId(uData.squadra_id);

        // 3. Recuperiamo tutti i calciatori facenti parte della rosa del club
        const { data: rosaData } = await supabase.from('rose_squadre').select('calciatore_id, calciatori_reali(id, nome, ruolo, nazionale)').eq('squadra_id', uData.squadra_id);
        
        // Puliamo i dati annidati di Supabase estraendo solo i profili dei calciatori
        const listaCalciatori = rosaData.map(r => Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali).filter(Boolean);
        setRosa(listaCalciatori);

        // 4. Carichiamo l'eventuale formazione salvata in precedenza per questa giornata
        const { data: formEsistente } = await supabase.from('formazioni').select('*').eq('squadra_id', uData.squadra_id).eq('giornata_id', giornataId).maybeSingle();

        if (formEsistente) {
          setModulo(formEsistente.modulo);
          const { data: calcSchierati } = await supabase.from('formazioni_calciatori').select('*').eq('formazione_id', formEsistente.id).order('posizione', { ascending: true });

          if (calcSchierati) {
            const vecchiTitolari = [];
            const vecchiaPanchina = [];

            calcSchierati.forEach(cs => {
              const info = listaCalciatori.find(item => item.id === cs.calciatore_id);
              if (info) {
                // Le posizioni da 1 a 11 rappresentano i titolari sul campo
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
      } finally {
        setLoading(false);
      }
    };

    inizializzaPagina();
  }, [user, giornataId]);

  // Gestione click su uno slot dei Titolari
  const gestisciTitolare = (calciatore) => {
    // Se è già titolare, lo rimuoviamo (click per svuotare lo slot)
    if (titolari.some(t => t.id === calciatore.id)) {
      setTitolari(prev => prev.filter(t => t.id !== calciatore.id));
    } else {
      // Altrimenti controlliamo se c'è spazio nel modulo per quel ruolo specifico
      const limiteRuolo = regoleModuli[modulo][calciatore.ruolo];
      const attualiRuolo = titolari.filter(t => t.ruolo === calciatore.ruolo).length;

      if (attualiRuolo >= limiteRuolo) {
        alert(`Massimo ${limiteRuolo} giocatori per il ruolo ${calciatore.ruolo} con questo modulo.`);
        return;
      }
      
      // Rimuoviamo il giocatore dalla panchina se era stato messo lì, poi lo inseriamo nei titolari
      setPanchina(prev => prev.filter(p => p.id !== calciatore.id));
      setTitolari(prev => [...prev, calciatore]);
    }
    setOverlay({ isOpen: false, ruolo: '', tipo: '' });
  };

  // Gestione inserimento nelle Riserve
  const gestisciPanchina = (calciatore) => {
    // Controlliamo quanti giocatori di questo ruolo ci sono già in panchina
    const attualiInPanchina = panchina.filter(p => p.ruolo === calciatore.ruolo).length;
    const limiteConsentito = limitiPanchina[calciatore.ruolo];

    if (attualiInPanchina >= limiteConsentito) {
      alert(`In panchina puoi mettere al massimo ${limiteConsentito} per il ruolo: ${calciatore.ruolo}`);
      return;
    }

    setPanchina(prev => [...prev, calciatore]);
    setOverlay({ isOpen: false, opacity: '', tipo: '' });
  };

  // Al cambio modulo resettiamo i campi per evitare incongruenze di ruoli
  const handleCambioModulo = (nuovoModulo) => {
    setModulo(nuovoModulo);
    setTitolari([]);
    setPanchina([]);
  };

  // Funzione di salvataggio modificata: ora basta anche solo un giocatore inserito!
  const handleSalvaFormazione = async () => {
    if (titolari.length === 0 && panchina.length === 0) {
      alert("Inserisci almeno un giocatore (titolare o panchina) prima di salvare!");
      return;
    }

    try {
      setSaving(true);
      // Inseriamo o aggiorniamo la testa della formazione
      const { data: formSalvata, error: fErr } = await supabase
        .from('formazioni')
        .upsert({ squadra_id: squadraId, giornata_id: giornataId, modulo: modulo, confermata: true }, { onConflict: 'squadra_id,giornata_id' })
        .select().single();

      if (fErr) throw fErr;

      // Cancelliamo i vecchi record dei calciatori associati per riscriverli da zero
      await supabase.from('formazioni_calciatori').delete().eq('formazione_id', formSalvata.id);

      // Prepariamo l'array dei record da salvare in blocco
      const recordCalciatori = [];

      // Mappiamo i titolari (posizione da 1 a 11)
      titolari.forEach((giocatore, index) => {
        recordCalciatori.push({
          formazione_id: formSalvata.id,
          calciatore_id: giocatore.id,
          ruolo: giocatore.ruolo,
          posizione: index + 1
        });
      });

      // Mappiamo i panchinari (posizione partendo da 12 in poi)
      panchina.forEach((giocatore, index) => {
        recordCalciatori.push({
          formazione_id: formSalvata.id,
          calciatore_id: giocatore.id,
          ruolo: giocatore.ruolo,
          posizione: 12 + index
        });
      });

      await supabase.from('formazioni_calciatori').insert(recordCalciatori);
      alert("Formazione salvata correttamente!");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  // Renderizza graficamente le righe di slot sul campo da gioco
  const renderLineaSquadra = (ruoloKey) => {
    const postiMassimi = regoleModuli[modulo][ruoloKey];
    const schieratiQuestoRuolo = titolari.filter(t => t.ruolo === ruoloKey);
    const nodi = [];

    for (let i = 0; i < postiMassimi; i++) {
      const giocatore = schieratiQuestoRuolo[i];
      if (giocatore) {
        nodi.push(
          <div key={`tit-${ruoloKey}-${i}`} className="campo-player-card occupato" onClick={() => gestisciTitolare(giocatore)} title={giocatore.nome}>
            <span className={`badge-ruolo-mini ${giocatore.ruolo}`}>{giocatore.ruolo}</span>
            <span className="campo-player-name">{giocatore.nome}</span>
            <span className="remove-icon">✕</span>
          </div>
        );
      } else {
        nodi.push(
          <div key={`slot-vuoto-${ruoloKey}-${i}`} className="campo-player-card vuoto" onClick={() => setOverlay({ isOpen: true, ruolo: ruoloKey, tipo: 'titolare' })}>
            <span className="add-icon">+</span>
            <span className="add-label">Aggiungi</span>
          </div>
        );
      }
    }
    return nodi;
  };

  // Filtra i giocatori da mostrare nella modale di scelta
  const giocatoriSelezionabili = rosa.filter(g => {
    if (g.ruolo !== overlay.ruolo) return false;
    if (titolari.some(t => t.id === g.id)) return false;
    if (panchina.some(p => p.id === g.id)) return false;
    return true;
  });

  if (loading) return <div className="formazione-loading">Caricamento della rosa... 🏃‍♂️</div>;

  return (
    <div className="inserisci-formazione-page">
      <div className="formazione-header">
        <button className="btn-back-formazione" onClick={() => navigate('/dashboard')}>⬅️ Indietro</button>
        <h2>Schiera Squadra - Giornata {giornata?.numero_giornata}</h2>
      </div>

      <div className="modulo-selector-card">
        <label>Modulo:</label>
        <div className="moduli-buttons">
          {Object.keys(regoleModuli).map(m => (
            <button key={m} className={`btn-modulo ${modulo === m ? 'attivo' : ''}`} onClick={() => handleCambioModulo(m)}>{m}</button>
          ))}
        </div>
      </div>

      <div className="recap-schieramento">
        <div>Titolari: <b>{titolari.length} / 11</b></div>
        <div>Panchina: <b>{panchina.length} / 7</b></div>
      </div>

      <div className="campo-visual-section">
        <div className="campo-container">
          <div className="campo-erba">
            <div className="linea-gessata area-alto"></div>
            <div className="linea-gessata centrocampo-linea"><div className="cerchio-centrocampo"></div></div>
            <div className="linea-gessata area-basso"></div>

            <div className="linea-campo linea-attacco">{renderLineaSquadra('A')}</div>
            <div className="linea-campo linea-centrocampo">{renderLineaSquadra('C')}</div>
            <div className="linea-campo linea-difesa">{renderLineaSquadra('D')}</div>
            <div className="linea-campo linea-portiere">{renderLineaSquadra('P')}</div>
          </div>
        </div>

        {/* SEZIONE PANCHINA SEMPLIFICATA */}
        <div className="panchina-container">
          <h3>Panchina (Max: 1P, 2D, 2C, 2A)</h3>
          <div className="panchina-ruoli-grid">
            {['P', 'D', 'C', 'A'].map(r => {
              const riserveRuolo = panchina.filter(p => p.ruolo === r);
              return (
                <div key={r} className="panchina-ruolo-box">
                  <div className="panchina-ruolo-header" onClick={() => setOverlay({ isOpen: true, ruolo: r, tipo: 'panchina' })}>
                    <h5>{r === 'P' ? 'Portieri' : r === 'D' ? 'Difensori' : r === 'C' ? 'Centrocampisti' : 'Attaccanti'} ({riserveRuolo.length}/{limitiPanchina[r]})</h5>
                    <button className="btn-add-riserva-plus">+</button>
                  </div>
                  <div className="panchina-items-list">
                    {riserveRuolo.length === 0 ? <span className="empty-pan-text">Vuoto</span> : (
                      riserveRuolo.map(p => (
                        <div key={p.id} className="panchinaro-item" onClick={() => setPanchina(prev => prev.filter(item => item.id !== p.id))} title={p.nome}>
                          <span className="panchinaro-name">{p.nome}</span>
                          <span className="remove-text-mini">✕</span>
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

      {/* OVERLAY SELEZIONE POPUP */}
      {overlay.isOpen && (
        <div className="overlay-scelta-giocatore">
          <div className="overlay-content-card">
            <div className="overlay-header">
              <h4>Seleziona Ruolo {overlay.ruolo}</h4>
              <button className="btn-close-overlay" onClick={() => setOverlay({ isOpen: false, ruolo: '', tipo: '' })}>&times;</button>
            </div>
            <div className="overlay-list-scroll">
              {giocatoriSelezionabili.length === 0 ? <p className="no-players-overlay">Nessun giocatore disponibile.</p> : (
                giocatoriSelezionabili.map(g => (
                  <div key={g.id} className="giocatore-overlay-row" onClick={() => overlay.tipo === 'titolare' ? gestisciTitolare(g) : gestisciPanchina(g)}>
                    <span className="giocatore-overlay-name">{g.nome} ({g.nazionale})</span>
                    <button className="btn-select-giocatore">Scegli</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="formazione-footer-actions">
        <button className="btn-save-formazione-def" onClick={handleSalvaFormazione} disabled={saving}>
          {saving ? 'Salvataggio in corso...' : '💾 Salva e Conferma Formazione'}
        </button>
      </div>
    </div>
  );
};

export default InserisciFormazione;