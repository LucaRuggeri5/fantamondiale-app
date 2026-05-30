import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './InserisciFormazione.css';

const InserisciFormazione = () => {
  const { giornataId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [giornata, setGiornata] = useState(null);
  const [squadraId, setSquadraId] = useState(null);

  // Rosa dei calciatori e filtri di ricerca
  const [rosa, setRosa] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // Scelte tattiche dell'utente
  const [modulo, setModulo] = useState('4-4-2');
  const [titolari, setTitolari] = useState([]);
  const [panchina, setPanchina] = useState({ P: [], D: [], C: [], A: [] });

  // Configurazione dei limiti di ruolo per i vari moduli disponibili
  const moduliDisponibili = {
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '4-5-1': { P: 1, D: 4, C: 5, A: 1 }
  };

  useEffect(() => {
    const fetchFormazioneSetup = async () => {
      try {
        setLoading(true);
        if (!user || !giornataId) return;

        // 1. Legge info sulla giornata corrente
        const { data: gData, error: gErr } = await supabase
          .from('giornate')
          .select('*')
          .eq('id', giornataId)
          .single();
        if (gErr) throw gErr;
        setGiornata(gData);

        const adesso = new Date();
        const inizioFormazioni = new Date(gData.apertura_formazioni);
        const scadenzaFormazione = new Date(gData.scadenza_formazione);

        // Controlla se la finestra temporale per schierare è attiva
        const isFinestraAperta = adesso >= inizioFormazioni && adesso < scadenzaFormazione;

        if (!isFinestraAperta) {
          if (adesso < inizioFormazioni) {
            alert(`Le modifiche per questo turno apriranno il ${inizioFormazioni.toLocaleDateString('it-IT')} alle ore ${inizioFormazioni.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}.`);
          } else {
            alert("I termini per inserire la formazione per questo turno sono scaduti.");
          }
          navigate('/dashboard');
          return;
        }

        // 2. Trova la squadra dell'utente
        const { data: uData, error: uErr } = await supabase
          .from('utenti')
          .select('squadra_id')
          .eq('id', user.id)
          .single();
        if (uErr || !uData?.squadra_id) throw new Error("Squadra non configurata.");
        setSquadraId(uData.squadra_id);

        // 3. Recupero rosa
        const { data: rosaData, error: rErr } = await supabase
          .from('rose_squadre')
          .select(`
            calciatore_id,
            calciatori_reali!calciatore_id (id, nome, ruolo, nazionale)
          `)
          .eq('squadra_id', uData.squadra_id);

        if (rErr) throw rErr;

        const listaCalciatori = rosaData.map(r => {
          if (!r.calciatori_reali) return null;
          return Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali;
        }).filter(Boolean);

        setRosa(listaCalciatori);

        // 4. Recupera formazione salvata precedentemente
        const { data: formEsistente, error: fErr } = await supabase
          .from('formazioni')
          .select('*')
          .eq('squadra_id', uData.squadra_id)
          .eq('giornata_id', giornataId)
          .maybeSingle();

        if (formEsistente) {
          setModulo(formEsistente.modulo);
          
          const { data: calcSchierati, error: csErr } = await supabase
            .from('formazioni_calciatori')
            .select('*')
            .eq('formazione_id', formEsistente.id)
            .order('posizione', { ascending: true });

          if (!csErr && calcSchierati) {
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
        }

      } catch (err) {
        console.error("Dettaglio Errore in InserisciFormazione:", err);
        alert("Errore nel caricamento dei dati della rosa.");
      } finally {
        setLoading(false);
      }
    };

    fetchFormazioneSetup();
  }, [user, giornataId, navigate]);

  const toggleTitolare = (calciatore) => {
    if (titolari.some(t => t.id === calciatore.id)) {
      setTitolari(prev => prev.filter(t => t.id !== calciatore.id));
    } else {
      const requisiti = moduliDisponibili[modulo];
      const giaSchieratiRuolo = titolari.filter(t => t.ruolo === calciatore.ruolo).length;

      if (giaSchieratiRuolo >= requisiti[calciatore.ruolo]) {
        alert(`Per il modulo ${modulo} hai già inserito il numero massimo di giocatori nel ruolo: ${calciatore.ruolo}`);
        return;
      }
      if (titolari.length >= 11) {
        alert("Hai già completato gli 11 titolari.");
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
        alert(`Puoi inserire al massimo 5 panchinari per il ruolo ${calciatore.ruolo}.`);
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

  const handleSalvaFormazione = async () => {
    if (titolari.length !== 11) {
      alert("Devi inserire esattamente 11 titolari prima di confermare.");
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
        calciatore_id: player.id, 
        ruolo: giocatore.ruolo,
        posizione: index + 1
      }));

      // Correzione bug: mapping corretto dell'identificatore del giocatore
      const recordCalciatoriValidi = titolari.map((giocatore, index) => ({
        formazione_id: formSalvata.id,
        calciatore_id: giocatore.id, 
        ruolo: giocatore.ruolo,
        posizione: index + 1
      }));

      let indexPanchina = 12;
      ['P', 'D', 'C', 'A'].forEach(ruoloKey => {
        panchina[ruoloKey].forEach(giocatore => {
          recordCalciatoriValidi.push({
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
        .insert(recordCalciatoriValidi);

      if (bulkErr) throw bulkErr;

      alert("Formazione salvata e congelata con successo per la giornata!");
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  // Logica di filtraggio combinata (Ricerca testo + Filtro ruolo)
  const getFilteredRosa = () => {
    return rosa.filter(g => {
      const matchCerca = g.nome.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRuolo = activeFilter === 'ALL' ? true : g.ruolo === activeFilter;
      return matchCerca && matchRuolo;
    });
  };

  if (loading) return <div className="formazione-loading">Lettura della rosa in corso... 🏃‍♂️</div>;

  // Suddivisione dei titolari per il rendering dinamico sul rettangolo del campo da gioco
  const titolariPerRuolo = (ruolo) => titolari.filter(t => t.ruolo === ruolo);

  return (
    <div className="inserisci-formazione-page">
      
      {/* HEADER */}
      <div className="formazione-header">
        <div className="formazione-header-title-container">
          <button className="btn-back-formazione" onClick={() => navigate('/dashboard')}>
            ⬅️ Dashboard
          </button>
          <h2>Schiera Squadra - Giornata {giornata?.numero_giornata}</h2>
        </div>
        <p className="subtitle">Componi l'undici titolare sul campo strutturato e configura la panchina</p>
      </div>

      {/* STRUMENTI DI CONFIGURAZIONE */}
      <div className="config-top-bar">
        <div className="modulo-selector-card">
          <label>Modulo Tattico:</label>
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
          <div className="recap-stat">
            <span>Titolari</span>
            <b className={titolari.length === 11 ? 'completo' : ''}>{titolari.length} / 11</b>
          </div>
          <div className="recap-stat">
            <span>Panchina</span>
            <b>{panchina.P.length + panchina.D.length + panchina.C.length + panchina.A.length} scelti</b>
          </div>
        </div>
      </div>

      {/* CONTESTO OPERATIVO */}
      <div className="workspace-formazione">
        
        {/* SEZIONE COMPONENTI ROSA (SINISTRA) */}
        <div className="rosa-picker-section">
          <h3>Scegli Calciatori</h3>
          
          {/* Box di ricerca e filtri ad accesso rapido */}
          <div className="search-filter-box">
            <input 
              type="text" 
              placeholder="🔍 Cerca calciatore per nome..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search-calciatore"
            />
            <div className="filter-chips-container">
              {['ALL', 'P', 'D', 'C', 'A'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`chip-filter ${activeFilter === f ? 'active' : ''} ${f}`}
                >
                  {f === 'ALL' ? 'Tutti' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="slots-role-indicator">
            {Object.entries(moduliDisponibili[modulo]).map(([ruoloKey, maxSlot]) => {
              const attuali = titolari.filter(t => t.ruolo === ruoloKey).length;
              return (
                <span key={ruoloKey} className={`role-badge-indicator ${ruoloKey}`}>
                  {ruoloKey}: {attuali}/{maxSlot}
                </span>
              );
            })}
          </div>
          
          <div className="rosa-list-scroll">
            {getFilteredRosa().length === 0 ? (
              <p className="no-players-found">Nessun calciatore corrisponde ai filtri selezionati.</p>
            ) : (
              getFilteredRosa().map(g => {
                const isTitolare = titolari.some(t => t.id === g.id);
                const isPanchina = panchina[g.ruolo].some(p => p.id === g.id);

                return (
                  <div key={g.id} className={`calciatore-picker-row ${isTitolare ? 'selected-tit' : isPanchina ? 'selected-pan' : ''}`}>
                    <div className="calc-info">
                      <span className={`badge-ruolo-mini ${g.ruolo}`}>{g.ruolo}</span>
                      <div className="calc-meta">
                        <span className="calc-name">{g.nome}</span>
                        <span className="calc-nation">{g.nazionale}</span>
                      </div>
                    </div>
                    
                    <div className="action-row-buttons">
                      <button 
                        className={`btn-action-tit ${isTitolare ? 'remove' : ''}`}
                        onClick={() => toggleTitolare(g)}
                        disabled={!isTitolare && isPanchina}
                      >
                        {isTitolare ? 'Rimuovi' : '+ Tit'}
                      </button>
                      
                      {!isTitolare && (
                        <button 
                          className={`btn-action-pan ${isPanchina ? 'remove' : ''}`}
                          onClick={() => {
                            if(isPanchina) rimuoviDaPanchina(g);
                            else assegnaInPanchina(g);
                          }}
                        >
                          {isPanchina ? 'Rimuovi' : '+ Pan'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SEZIONE CAMPO DA GIOCO ED ERBA VISIVA (DESTRA) */}
        <div className="campo-visual-section">
          <div className="campo-calcio-greenboard">
            <div className="campo-linea-centrale"></div>
            <div className="campo-area-rigore top"></div>
            <div className="campo-area-rigore bottom"></div>
            
            {/* LINEA ATTACCANTI */}
            <div className="campo-row-reparto">
              {titolariPerRuolo('A').map(t => (
                <div key={t.id} className="pitch-player-node A" onClick={() => toggleTitolare(t)}>
                  <div className="node-avatar">🏃‍♂️</div>
                  <span className="node-name">{t.nome}</span>
                </div>
              ))}
              {titolariPerRuolo('A').length === 0 && <span className="placeholder-reparto-text">Nessun Attaccante</span>}
            </div>

            {/* LINEA CENTROCAMPISTI */}
            <div className="campo-row-reparto">
              {titolariPerRuolo('C').map(t => (
                <div key={t.id} className="pitch-player-node C" onClick={() => toggleTitolare(t)}>
                  <div className="node-avatar">🏃‍♂️</div>
                  <span className="node-name">{t.nome}</span>
                </div>
              ))}
              {titolariPerRuolo('C').length === 0 && <span className="placeholder-reparto-text">Nessun Centrocampista</span>}
            </div>

            {/* LINEA DIFENSORI */}
            <div className="campo-row-reparto">
              {titolariPerRuolo('D').map(t => (
                <div key={t.id} className="pitch-player-node D" onClick={() => toggleTitolare(t)}>
                  <div className="node-avatar">🏃‍♂️</div>
                  <span className="node-name">{t.nome}</span>
                </div>
              ))}
              {titolariPerRuolo('D').length === 0 && <span className="placeholder-reparto-text">Nessun Difensore</span>}
            </div>

            {/* LINEA PORTIERE */}
            <div className="campo-row-reparto portiere-row">
              {titolariPerRuolo('P').map(t => (
                <div key={t.id} className="pitch-player-node P" onClick={() => toggleTitolare(t)}>
                  <div className="node-avatar">🧤</div>
                  <span className="node-name">{t.nome}</span>
                </div>
              ))}
              {titolariPerRuolo('P').length === 0 && <span className="placeholder-reparto-text">Scegli il Portiere</span>}
            </div>
          </div>

          {/* COMPONENTE PANCHINA BOTTOM */}
          <div className="panchina-container-modern">
            <div className="panchina-header-title">
              <h4>Panchina di Riserva</h4>
              <small>Clicca su un panchinaro per rimuoverlo rapidamente</small>
            </div>
            <div className="panchina-ruoli-grid-modern">
              {['P', 'D', 'C', 'A'].map(r => (
                <div key={r} className={`panchina-column-box ${r}`}>
                  <div className="column-head-badge">{r}</div>
                  <div className="column-list-items">
                    {panchina[r].length === 0 ? (
                      <span className="pan-slot-empty">-</span>
                    ) : (
                      panchina[r].map((p, index) => (
                        <div key={p.id} className="panchinaro-card-item" onClick={() => rimuoviDaPanchina(p)}>
                          <span className="idx-pan">{index + 1}</span>
                          <span className="name-pan">{p.nome}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AZIONI DI SALVATAGGIO */}
      <div className="formazione-footer-actions">
        <button 
          className="btn-save-formazione-def"
          onClick={handleSalvaFormazione}
          disabled={saving || titolari.length !== 11}
        >
          {saving ? 'Salvataggio in corso... ⏳' : '💾 Blocca e Salva Formazione Ufficiale'}
        </button>
      </div>
    </div>
  );
};

export default InserisciFormazione;