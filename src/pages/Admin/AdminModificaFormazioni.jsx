import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import '../InserisciFormazione.css'; 
import './AdminModificaFormazioni.css';

const AdminModificaFormazioni = () => {
  const navigate = useNavigate();
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingDati, setLoadingDati] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtri Globali Admin
  const [giornate, setGiornate] = useState([]);
  const [squadre, setSquadre] = useState([]);
  const [giornataId, setGiornataId] = useState('');
  const [squadraId, setSquadraId] = useState('');

  // Dati Formazione e Rosa
  const [rosa, setRosa] = useState([]);
  const [modulo, setModulo] = useState('4-4-2');
  const [titolari, setTitolari] = useState([]);
  const [panchina, setPanchina] = useState([]);

  // Stato Finestra Modale di Selezione
  const [overlay, setOverlay] = useState({ isOpen: false, ruolo: '', tipo: '' });

  const regoleModuli = {
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '4-5-1': { P: 1, D: 4, C: 5, A: 1 }
  };

  const limitiPanchina = { P: 1, D: 2, C: 2, A: 2 };

  // 1. Caricamento Iniziale Filtri
  useEffect(() => {
    const fetchSetupAdmin = async () => {
      try {
        setLoadingSetup(true);
        const { data: gData } = await supabase.from('giornate').select('*').order('numero_giornata', { ascending: true });
        const { data: sData } = await supabase.from('squadre').select('*').order('nome', { ascending: true });

        setGiornate(gData || []);
        setSquadre(sData || []);

        if (gData?.length > 0) setGiornataId(gData[0].id);
        if (sData?.length > 0) setSquadraId(sData[0].id);
      } catch (err) {
        console.error("Errore setup admin:", err);
      } finally {
        setLoadingSetup(false);
      }
    };
    fetchSetupAdmin();
  }, []);

  // 2. Caricamento Rosa e Formazione al cambio filtri
  useEffect(() => {
    if (!giornataId || !squadraId) return;

    const caricaDatiAdmin = async () => {
      try {
        setLoadingDati(true);
        setTitolari([]);
        setPanchina([]);

        // Recupero rosa del club
        const { data: rosaData, error: rErr } = await supabase
          .from('rose_squadre')
          .select(`
            calciatore_id,
            calciatori_reali!calciatore_id (id, nome, ruolo, nazionale)
          `)
          .eq('squadra_id', squadraId);

        if (rErr) throw rErr;

        const listaCalciatori = rosaData.map(r => 
          Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali
        ).filter(Boolean);

        setRosa(listaCalciatori);

        // Recupero formazione esistente
        const { data: formEsistente } = await supabase
          .from('formazioni')
          .select('*')
          .eq('squadra_id', squadraId)
          .eq('giornata_id', giornataId)
          .maybeSingle();

        if (formEsistente) {
          setModulo(formEsistente.modulo);
          const { data: calcSchierati } = await supabase
            .from('formazioni_calciatori')
            .select('*')
            .eq('formazione_id', formEsistente.id)
            .order('posizione', { ascending: true });

          if (calcSchierati) {
            const vecchiTitolari = [];
            const vecchiaPanchina = [];

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
        } else {
          setModulo('4-4-2');
        }
      } catch (err) {
        console.error("Errore caricamento dati:", err);
      } finally {
        setLoadingDati(false);
      }
    };

    caricaDatiAdmin();
  }, [giornataId, squadraId]);

  // Gestione click slot Titolari
  const gestisciTitolare = (calciatore) => {
    if (titolari.some(t => t.id === calciatore.id)) {
      setTitolari(prev => prev.filter(t => t.id !== calciatore.id));
    } else {
      const limiteRuolo = regoleModuli[modulo][calciatore.ruolo];
      const attualiRuolo = titolari.filter(t => t.ruolo === calciatore.ruolo).length;

      if (attualiRuolo >= limiteRuolo) {
        alert(`Massimo ${limiteRuolo} giocatori per il ruolo ${calciatore.ruolo} con questo modulo.`);
        return;
      }
      setPanchina(prev => prev.filter(p => p.id !== calciatore.id));
      setTitolari(prev => [...prev, calciatore]);
    }
    setOverlay({ isOpen: false, ruolo: '', tipo: '' });
  };

  // Gestione click slot Panchina
  const gestisciPanchina = (calciatore) => {
    const attualiInPanchina = panchina.filter(p => p.ruolo === calciatore.ruolo).length;
    const limiteConsentito = limitiPanchina[calciatore.ruolo];

    if (attualiInPanchina >= limiteConsentito) {
      alert(`In panchina puoi mettere al massimo ${limiteConsentito} per il ruolo: ${calciatore.ruolo}`);
      return;
    }
    setPanchina(prev => [...prev, calciatore]);
    setOverlay({ isOpen: false, ruolo: '', tipo: '' });
  };

  const handleCambioModulo = (nuovoModulo) => {
    setModulo(nuovoModulo);
    setTitolari([]);
    setPanchina([]);
  };

  // Salvataggio coatto Admin
  const handleSalvaFormazioneCoattiva = async () => {
    if (titolari.length === 0 && panchina.length === 0) {
      alert("Inserisci almeno un giocatore prima di salvare!");
      return;
    }

    try {
      setSaving(true);
      const { data: formSalvata, error: fErr } = await supabase
        .from('formazioni')
        .upsert({ squadra_id: squadraId, giornata_id: giornataId, modulo: modulo, confermata: true }, { onConflict: 'squadra_id,giornata_id' })
        .select().single();

      if (fErr) throw fErr;

      await supabase.from('formazioni_calciatori').delete().eq('formazione_id', formSalvata.id);

      const recordCalciatori = [];
      titolari.forEach((giocatore, index) => {
        recordCalciatori.push({
          formazione_id: formSalvata.id,
          calciatore_id: giocatore.id,
          ruolo: giocatore.ruolo,
          posizione: index + 1
        });
      });

      panchina.forEach((giocatore, index) => {
        recordCalciatori.push({
          formazione_id: formSalvata.id,
          calciatore_id: giocatore.id,
          ruolo: giocatore.ruolo,
          posizione: 12 + index
        });
      });

      await supabase.from('formazioni_calciatori').insert(recordCalciatori);
      alert("Formazione salvata d'autorità con successo!");
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio admin.");
    } finally {
      setSaving(false);
    }
  };

  // Render Linee Campo (Identico a InserisciFormazione)
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

  // Filtro dinamico per l'overlay popup
  const giocatoriSelezionabili = rosa.filter(g => {
    if (g.ruolo !== overlay.ruolo) return false;
    if (titolari.some(t => t.id === g.id)) return false;
    if (panchina.some(p => p.id === g.id)) return false;
    return true;
  });

  if (loadingSetup) return <div className="formazione-loading">Inizializzazione Pannello di Controllo... 👑</div>;

  return (
    <div className="inserisci-formazione-page admin-page-wrapper">
      <div className="formazione-header admin-border-header">
        <div className="admin-header-title-container">
          <button className="btn-back-admin" onClick={() => navigate(-1)}>⬅️ Indietro</button>
          <h2>👑 Pannello Admin: Modifica Forzosa Formazioni</h2>
        </div>
        <p className="admin-warning-text">⚠️ MODALITÀ APERTA - Qualsiasi vincolo temporale o di blocco turno è disattivato.</p>
      </div>

      {/* SELETTORE AMMINISTRATIVO */}
      <div className="admin-filter-bar">
        <div className="filter-group">
          <label>Seleziona Turno/Giornata:</label>
          <select value={giornataId} onChange={(e) => setGiornataId(e.target.value)}>
            {giornate.map(g => (
              <option key={g.id} value={g.id}>Giornata {g.numero_giornata}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Seleziona Squadra:</label>
          <select value={squadraId} onChange={(e) => setSquadraId(e.target.value)}>
            {squadre.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingDati ? (
        <div className="formazione-loading">Aggiornamento campo di gioco in corso... ⏳</div>
      ) : (
        <>
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

          {/* LAYOUT CAMPO + PANCHINA (LAYOUT PULITO DA INSERISCIFORMAZIONE) */}
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
                            <div key={p.id} className="panchinaro-item" onClick={() => setPanchina(prev => prev.filter(item => item.id !== p.id))}>
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

          {/* OVERLAY POPUP SELEZIONE COMPATIBILE */}
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
            <button className="btn-save-formazione-def admin-btn-override" onClick={handleSalvaFormazioneCoattiva} disabled={saving}>
              {saving ? 'Forzatura in corso...' : '⚡ Salva e Sovrascrivi Formazione'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminModificaFormazioni;