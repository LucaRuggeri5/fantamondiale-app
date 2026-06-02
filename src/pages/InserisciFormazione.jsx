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
  const [rosa, setRosa] = useState([]);
  
  const [modulo, setModulo] = useState('4-4-2');
  const [titolari, setTitolari] = useState([]);
  const [panchina, setPanchina] = useState([]);

  const [overlay, setOverlay] = useState({ isOpen: false, ruolo: '', tipo: '' });

  const regoleModuli = {
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '4-5-1': { P: 1, D: 4, C: 5, A: 1 }
  };

  const limitiPanchina = { P: 1, D: 2, C: 2, A: 2 };

  useEffect(() => {
    const inizializzaPagina = async () => {
      try {
        if (!user || !giornataId) return;

        const { data: gData } = await supabase.from('giornate').select('*').eq('id', giornataId).single();
        setGiornata(gData);

        const { data: uData } = await supabase.from('utenti').select('squadra_id').eq('id', user.id).single();
        setSquadraId(uData.squadra_id);

        const { data: rosaData } = await supabase.from('rose_squadre').select('calciatore_id, calciatori_reali(id, nome, ruolo, nazionale)').eq('squadra_id', uData.squadra_id);
        
        const listaCalciatori = rosaData.map(r => Array.isArray(r.calciatori_reali) ? r.calciatori_reali[0] : r.calciatori_reali).filter(Boolean);
        setRosa(listaCalciatori);

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

  const handleSalvaFormazione = async () => {
    if (titolari.length === 0 && panchina.length === 0) {
      alert("Inserisci almeno un giocatore (titolare o panchina) prima di salvare!");
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

      // CORRETTO: Cambiato player.id in giocatore.id per risolvere il ReferenceError
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
      alert("Formazione salvata correttamente!");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  const renderLineaSquadra = (ruoloKey) => {
    const postiMassimi = regoleModuli[modulo][ruoloKey];
    const schieratiQuestoRuolo = titolari.filter(t => t.ruolo === ruoloKey);
    const nodi = [];

    for (let i = 0; i < postiMassimi; i++) {
      const giocatore = schieratiQuestoRuolo[i];
      if (giocatore) {
        nodi.push(
          <div key={`tit-${ruoloKey}-${i}`} className={`campo-player-card occupato border-${ruoloKey}`} onClick={() => gestisciTitolare(giocatore)}>
            <span className={`badge-ruolo-mini ${giocatore.ruolo}`}>{giocatore.ruolo}</span>
            <span className="campo-player-name">{giocatore.nome}</span>
            <span className="remove-icon">✕</span>
          </div>
        );
      } else {
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
        <button className="btn-back-formazione" onClick={() => navigate('/dashboard')}>⬅️</button>
        <h2>Schiera G{giornata?.numero_giornata}</h2>
      </div>

      <div className="modulo-selector-card">
        <label htmlFor="modulo-select">Modulo Tattico:</label>
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

        <div className="panchina-container">
          <h3>Panchina</h3>
          <div className="panchina-vertical-list">
            {['P', 'D', 'C', 'A'].map(r => {
              const riserveRuolo = panchina.filter(p => p.ruolo === r);
              return (
                <div key={r} className="panchina-ruolo-row">
                  <div className="panchina-ruolo-header-flat" onClick={() => setOverlay({ isOpen: true, ruolo: r, tipo: 'panchina' })}>
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
                          <span className="panchinaro-name-flat">{p.nome}</span>
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

      {overlay.isOpen && (
        <div className="overlay-scelta-giocatore">
          <div className="overlay-content-card">
            <div className="overlay-header">
              <h4>Seleziona {overlay.ruolo === 'P' ? 'Portiere' : overlay.ruolo === 'D' ? 'Difensore' : overlay.ruolo === 'C' ? 'Centrocampista' : 'Attaccante'}</h4>
              <button className="btn-close-overlay" onClick={() => setOverlay({ isOpen: false, ruolo: '', tipo: '' })}>&times;</button>
            </div>
            <div className="overlay-list-scroll">
              {giocatoriSelezionabili.length === 0 ? <p className="no-players-overlay">Nessun giocatore disponibile in rosa.</p> : (
                giocatoriSelezionabili.map(g => (
                  <div key={g.id} className="giocatore-overlay-row" onClick={() => overlay.tipo === 'titolare' ? gestisciTitolare(g) : gestisciPanchina(g)}>
                    <span className="giocatore-overlay-name">{g.nome}</span>
                    <button className="btn-select-giocatore">Schiera</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="formazione-footer-actions">
        <button className="btn-save-formazione-def" onClick={handleSalvaFormazione} disabled={saving}>
          {saving ? 'Salvataggio...' : '💾 Salva e Conferma Formazione'}
        </button>
      </div>
    </div>
  );
};

export default InserisciFormazione;