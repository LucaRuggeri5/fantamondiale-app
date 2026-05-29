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

  // Lista di tutti i calciatori presenti nella rosa del club
  const [rosa, setRosa] = useState([]);
  
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

        // Controllo robusto delle scadenze temporali e degli stati autorizzati
        const adesso = new Date().getTime();
        const scadenza = gData.scadenza_formazione ? new Date(gData.scadenza_formazione).getTime() : 0;

        // Se lo stato è esplicitamente concluso o calcolato, blocca subito
        if (gData.stato === 'conclusa' || gData.stato === 'voti inseriti') {
          alert("Questa giornata è conclusa. Non è più possibile modificare la formazione.");
          navigate('/calendario');
          return;
        }

        // Se lo stato non è "in corso" e il tempo è scaduto, blocca l'accesso
        if (gData.stato !== 'in corso' && scadenza > 0 && adesso > scadenza) {
          alert("I termini per inserire la formazione per questo turno sono scaduti.");
          navigate('/calendario');
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

        // 3. RECUPERO ROSA CON JOIN ESPLICITA SU SCHEMA PERSONALIZZATO
        const { data: rosaData, error: rErr } = await supabase
          .from('rose_squadre')
          .select(`
            calciatore_id,
            calciatori_reali!calciatore_id (id, nome, ruolo, nazionale)
          `)
          .eq('squadra_id', uData.squadra_id);

        if (rErr) throw rErr;

        // Estraiamo i dati gestendo correttamente l'oggetto o l'array ritornato dalla join
        const listaCalciatori = rosaData.map(r => {
          if (!r.calciatori_reali) return null;
          return Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali;
        }).filter(Boolean);

        setRosa(listaCalciatori);

        // 4. Controlla se l'utente aveva già salvato una formazione precedentemente per questo turno
        const { data: formEsistente, error: fErr } = await supabase
          .from('formazioni')
          .select('*')
          .eq('squadra_id', uData.squadra_id)
          .eq('giornata_id', giornataId)
          .maybeSingle();

        if (formEsistente) {
          setModulo(formEsistente.modulo);
          
          // Recupera i singoli calciatori già schierati
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

      // CORREZIONE QUI: Rimosso "player?.id" inesistente e usato correttamente "giocatore.id"
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

      alert("Formazione salvata e congelata con successo per la giornata!");
      navigate('/calendario');

    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="formazione-loading">Lettura della rosa in corso... 🏃‍♂️</div>;

  return (
    <div className="inserisci-formazione-page">
      <div className="formazione-header">
        <h2>Schiera Squadra - Giornata {giornata?.numero_giornata}</h2>
        <p className="subtitle">Componi il tuo 11 titolare ed ordina le riserve per ruolo</p>
      </div>

      <div className="modulo-selector-card">
        <label>Scegli il Modulo:</label>
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
          <h3>La Tua Rosa Reale</h3>
          <p className="pick-hint">Clicca su un calciatore per metterlo Titolare, premi "Panchina" per metterlo in riserva.</p>
          
          <div className="rosa-list-scroll">
            {['P', 'D', 'C', 'A'].map(ruoloFiltro => {
              const giocatoriRuolo = rosa.filter(g => g.ruolo === ruoloFiltro);
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
            <h3>Titolari Schierati ({modulo})</h3>
            
            <div className="titolari-visual-list">
              {titolari.length === 0 ? (
                <p className="no-players-campo">Il campo è vuoto. Seleziona i calciatori dalla tua rosa a sinistra per popolare il rettangolo verde.</p>
              ) : (
                titolari.map((t, idx) => (
                  <div key={t.id} className="campo-player-card" onClick={() => toggleTitolare(t)}>
                    <span className="pos-number">{idx + 1}</span>
                    <span className={`badge-ruolo-mini ${t.ruolo}`}>{t.ruolo}</span>
                    <span className="campo-player-name">{t.nome}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panchina-container">
            <h3>Panchina</h3>
            <div className="panchina-ruoli-grid">
              {['P', 'D', 'C', 'A'].map(r => (
                <div key={r} className="panchina-ruolo-box">
                  <h5>{r}</h5>
                  {panchina[r].length === 0 ? (
                    <span className="empty-pan-text">Nessuno</span>
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
          onClick={handleSalvaFormazione}
          disabled={saving || titolari.length !== 11}
        >
          {saving ? 'Salvataggio in corso...' : '💾 Salva e Conferma Formazione'}
        </button>
      </div>
    </div>
  );
};

export default InserisciFormazione;