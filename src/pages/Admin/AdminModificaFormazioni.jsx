import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import '../InserisciFormazione.css'; // Riutilizziamo lo stile CSS esistente per coerenza visiva

const AdminModificaFormazioni = () => {
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingDati, setLoadingDati] = useState(false);
  const [saving, setSaving] = useState(false);

  // Liste per i Filtri Globali Admin
  const [giornate, setGiornate] = useState([]);
  const [squadre, setSquadre] = useState([]);

  // Selezioni Correnti
  const [giornataId, setGiornataId] = useState('');
  const [squadraId, setSquadraId] = useState('');

  // Stato Struttura Formazione (Derivato da InserisciFormazione.jsx)
  const [rosa, setRosa] = useState([]);
  const [modulo, setModulo] = useState('4-4-2');
  const [titolari, setTitolari] = useState([]);
  const [panchina, setPanchina] = useState({ P: [], D: [], C: [], A: [] });

  const moduliDisponibili = {
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '4-5-1': { P: 1, D: 4, C: 5, A: 1 }
  };

  // Caricamento Iniziale: Elenchi Giornate e Squadre
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
        console.error("Errore caricamento filtri admin:", err);
      } finally {
        setLoadingSetup(false);
      }
    };
    fetchSetupAdmin();
  }, []);

  // Caricamento Dati della Formazione e della Rosa in base a Giornata e Squadra selezionate
  useEffect(() => {
    if (!giornataId || !squadraId) return;

    const caricaRosaEFormazioneAdmin = async () => {
      try {
        setLoadingDati(true);
        setTitolari([]);
        setPanchina({ P: [], D: [], C: [], A: [] });

        // 1. Carica la rosa reale di quel club specifico
        const { data: rosaData, error: rErr } = await supabase
          .from('rose_squadre')
          .select(`
            calciatore_id,
            calciatori_reali!calciatore_id (id, nome, ruolo, nazionale)
          `)
          .eq('squadra_id', squadraId);

        if (rErr) throw rErr;

        const listaCalciatori = rosaData.map(r => {
          if (!r.calciatori_reali) return null;
          return Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali;
        }).filter(Boolean);

        setRosa(listaCalciatori);

        // 2. Carica la formazione salvata (se esiste) senza alcun controllo su date o stati giornata
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
            const vecchiaPanchina = { P: [], D: [], C: [], A: [] };

            calcSchierati.forEach(cs => {
              const infoGiocatore = listaCalciatori.find(item => item.id === cs.calciatore_id);
              if (infoGiocatore) {
                if (cs.posizione <= 11) {
                  vecchiTitolari.push(infoGiocatore);
                } else {
                  vecchiaPanchina[cs.ruolo].push(infoGiocatore);
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
        console.error("Errore caricamento dati target:", err);
      } finally {
        setLoadingDati(false);
      }
    };

    caricaRosaEFormazioneAdmin();
  }, [giornataId, squadraId]);

  const toggleTitolare = (calciatore) => {
    if (titolari.some(t => t.id === calciatore.id)) {
      setTitolari(prev => prev.filter(t => t.id !== calciatore.id));
    } else {
      const requisiti = moduliDisponibili[modulo];
      const giaSchieratiRuolo = titolari.filter(t => t.ruolo === calciatore.ruolo).length;

      if (giaSchieratiRuolo >= requisiti[calciatore.ruolo]) {
        alert(`Per il modulo ${modulo} ci sono già troppi elementi nel ruolo: ${calciatore.ruolo}`);
        return;
      }
      if (titolari.length >= 11) {
        alert("Hai già inserito gli 11 titolari.");
        return;
      }
      rimuoviDaPanchina(calciatore);
      setTitolari(prev => [...prev, calciatore]);
    }
  };

  const assegnaInPanchina = (calciatore) => {
    if (titolari.some(t => t.id === calciatore.id)) return;
    setPanchina(prev => {
      const listaRuolo = prev[calciatore.ruolo];
      if (listaRuolo.some(p => p.id === calciatore.id)) {
        return { ...prev, [calciatore.ruolo]: listaRuolo.filter(p => p.id !== calciatore.id) };
      }
      if (listaRuolo.length >= 5) {
        alert(`Massimo 5 panchinari per il ruolo ${calciatore.ruolo}.`);
        return prev;
      }
      return { ...prev, [calciatore.ruolo]: [...listaRuolo, calciatore] };
    });
  };

  const rimuoviDaPanchina = (calciatore) => {
    setPanchina(prev => ({
      ...prev,
      [calciatore.ruolo]: prev[calciatore.ruolo].filter(p => p.id !== calciatore.id)
    }));
  };

  const handleCambioModulo = (nuovoModulo) => {
    setModulo(nuovoModulo);
    setTitolari([]);
    setPanchina({ P: [], D: [], C: [], A: [] });
  };

  const handleSalvaFormazioneCoattiva = async () => {
    if (titolari.length !== 11) {
      alert("Devi schierare esattamente 11 titolari.");
      return;
    }

    try {
      setSaving(true);

      const { data: formSalvata, error: fErr } = await supabase
        .from('formazioni')
        .upsert({
          squadra_id: squadraId,
          giornata_id: giornataId,
          modulo: modulo,
          confermata: true
        }, { onConflict: 'squadra_id,giornata_id' })
        .select()
        .single();

      if (fErr) throw fErr;

      await supabase
        .from('formazioni_calciatori')
        .delete()
        .eq('formazione_id', formSalvata.id);

      const recordCalciatori = titolari.map((giocatore, index) => ({
        formazione_id: formSalvata.id,
        calciatore_id: giocatore.id, 
        ruolo: giocatore.ruolo,
        posizione: index + 1
      }));

      let indexPanchina = 12;
      ['P', 'D', 'C', 'A'].forEach(ruoloKey => {
        panchina[ruoloKey].forEach(giocatore => {
          recordCalciatori.push({
            formazione_id: formSalvata.id,
            calciatore_id: giocatore.id,
            ruolo: giocatore.ruolo,
            posizione: indexPanchina
          });
          indexPanchina++;
        });
      });

      const { error: bulkErr } = await supabase
        .from('formazioni_calciatori')
        .insert(recordCalciatori);

      if (bulkErr) throw bulkErr;

      alert("Formazione MODIFICATA e salvata d'autorità con successo!");

    } catch (err) {
      console.error(err);
      alert("Errore nel salvataggio forzato admin.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSetup) return <div className="formazione-loading">Inizializzazione Pannello di Controllo... 👑</div>;

  return (
    <div className="inserisci-formazione-page">
      <div className="formazione-header" style={{ borderBottom: '3px solid #ff4757', paddingBottom: '15px' }}>
        <h2>👑 Pannello Admin: Modifica Forzosa Formazioni</h2>
        <p style={{ color: '#ff4757', fontWeight: 'bold' }}>⚠️ MODALITÀ APERTA - Qualsiasi vincolo temporale o di blocco turno è disattivato.</p>
      </div>

      {/* FILTRI DI SELEZIONE SQUADRA / GIORNATA */}
      <div style={{ display: 'flex', gap: '15px', background: '#2f3542', padding: '15px', borderRadius: '8px', margin: '15px 0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Seleziona Turno/Giornata:</label>
          <select value={giornataId} onChange={(e) => setGiornataId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px' }}>
            {giornate.map(g => (
              <option key={g.id} value={g.id}>Giornata {g.numero_giornata}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Seleziona Squadra:</label>
          <select value={squadraId} onChange={(e) => setSquadraId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px' }}>
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
            <label>Forza Cambio Modulo:</label>
            <div className="moduli-buttons">
              {Object.keys(moduliDisponibili).map(m => (
                <button 
                  key={m} 
                  className={`btn-modulo ${modulo === m ? 'attivo' : ''}`}
                  onClick={() => handleCambioModulo(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="recap-schieramento">
            <div className="recap-stat">Titolari: <b>{titolari.length} / 11</b></div>
            <div className="recap-stat">Panchina: <b>{panchina.P.length + panchina.D.length + panchina.C.length + panchina.A.length}</b></div>
          </div>

          <div className="workspace-formazione">
            <div className="rosa-picker-section">
              <h3>Rosa del Club Selezionato</h3>
              <div className="rosa-list-scroll">
                {['P', 'D', 'C', 'A'].map(ruoloFiltro => {
                  const giocatoriRuolo = rosa.filter(g => g.ruolo ===`ruoloFiltro` || g.ruolo === ruoloFiltro);
                  if (giocatoriRuolo.length === 0) return null;

                  return (
                    <div key={ruoloFiltro} className="ruolo-group-box">
                      <h4>{ruoloFiltro === 'P' ? 'Portieri' : ruoloFiltro === 'D' ? 'Difensori' : ruoloFiltro === 'C' ? 'Centrocampisti' : 'Attaccanti'}</h4>
                      {giocatoriRuolo.map(g => {
                        const isTitolare = titolari.some(t => t.id === g.id);
                        const isPanchina = panchina[g.ruolo].some(p => p.id === g.id);

                        return (
                          <div key={g.id} className={`calciatore-picker-row ${isTitolare ? 'selected-tit' : isPanchina ? 'selected-pan' : ''}`}>
                            <div className="calc-info" onClick={() => toggleTitolare(g)}>
                              <span className={`badge-ruolo-mini ${g.ruolo}`}>{g.ruolo}</span>
                              <span className="calc-name">{g.nome}</span>
                              <span className="calc-nation">({g.nazionale})</span>
                            </div>
                            
                            {!isTitolare && (
                              <button 
                                className={`btn-add-panchina ${isPanchina ? 'active' : ''}`}
                                onClick={() => assegnaInPanchina(g)}
                              >
                                {isPanchina ? 'Rimuovi' : 'Panchina'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="campo-visual-section">
              <div className="campo-container">
                <h3>Disposizione Titolari ({modulo})</h3>
                <div className="titolari-visual-list">
                  {titolari.length === 0 ? (
                    <p className="no-players-campo">Nessun giocatore inserito in formazione.</p>
                  ) : (
                    titolari.map((t, idx) => (
                      <div key={t.id} className="campo-player-card" onClick={() => toggleTitolare(t)} style={{ borderLeft: '4px solid #ff4757' }}>
                        <span className="pos-number">{idx + 1}</span>
                        <span className={`badge-ruolo-mini ${t.ruolo}`}>{t.ruolo}</span>
                        <span className="campo-player-name">{t.nome}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="panchina-container">
                <h3>Disposizione Panchina</h3>
                <div className="panchina-ruoli-grid">
                  {['P', 'D', 'C', 'A'].map(r => (
                    <div key={r} className="panchina-ruolo-box">
                      <h5>{r}</h5>
                      {panchina[r].length === 0 ? (
                        <span className="empty-pan-text">Vuoto</span>
                      ) : (
                        panchina[r].map((p, index) => (
                          <div key={p.id} className="panchinaro-item" onClick={() => rimuoviDaPanchina(p)}>
                            <span>{index + 1}. {p.nome}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="formazione-footer-actions">
            <button 
              className="btn-save-formazione-def"
              onClick={handleSalvaFormazioneCoattiva}
              disabled={saving || titolari.length !== 11}
              style={{ background: '#ff4757' }}
            >
              {saving ? 'Forzatura in corso...' : '⚡ Salva e Sovrascrivi Formazione'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminModificaFormazioni;