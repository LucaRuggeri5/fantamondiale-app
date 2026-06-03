import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './AdminModificaVoti.css';

const AdminModificaVoti = () => {
  const navigate = useNavigate();
  
  // Stati di caricamento dell'interfaccia
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingDati, setLoadingDati] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stati per i filtri di selezione (Giornate e Squadre)
  const [giornate, setGiornate] = useState([]);
  const [squadre, setSquadre] = useState([]);
  const [giornataId, setGiornataId] = useState('');
  const [squadraId, setSquadraId] = useState('');

  // Stati core per i dati dei calciatori e i risultati calcolati live
  const [formazioneId, setFormazioneId] = useState(null);
  const [calciatoriList, setCalciatoriList] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Genera le opzioni del voto da 0 a 10 con passi di 0.5
  const opzioniVoto = useMemo(() => {
    const voti = [];
    for (let i = 10; i >= 0; i -= 0.5) {
      voti.push(i);
    }
    return voti;
  }, []);

  // EFFETTO 1: Caricamento iniziale dei filtri Admin
  useEffect(() => {
    const fetchSetupVotiAdmin = async () => {
      try {
        setLoadingSetup(true);
        const { data: gData } = await supabase.from('giornate').select('*').order('numero_giornata', { ascending: true });
        const { data: sData } = await supabase.from('squadre').select('*').order('nome', { ascending: true });

        setGiornate(gData || []);
        setSquadre(sData || []);

        if (gData?.length > 0) setGiornataId(gData[0].id);
        if (sData?.length > 0) setSquadraId(sData[0].id);
      } catch (err) {
        console.error("Errore setup filtri admin:", err);
      } finally {
        setLoadingSetup(false);
      }
    };
    fetchSetupVotiAdmin();
  }, []);

  // EFFETTO 2: Recupero dei calciatori in base alla combinazione selezionata
  useEffect(() => {
    if (!giornataId || !squadraId) return;

    const caricaDatiVotiAdmin = async () => {
      try {
        setLoadingDati(true);
        setFormazioneId(null);
        setCalciatoriList([]);

        const { data: formData, error: formErr } = await supabase
          .from('formazioni')
          .select('id')
          .eq('giornata_id', giornataId)
          .eq('squadra_id', squadraId)
          .maybeSingle();

        if (formErr) throw formErr;
        if (!formData) return; 

        setFormazioneId(formData.id);

        const { data: fcData, error: fcErr } = await supabase
          .from('formazioni_calciatori')
          .select(`
            id, posizione, ruolo, calciatore_id, voto_base, bonus_malus, voto_fanta, 
            calciatori_reali!calciatore_id (id, nome)
          `)
          .eq('formazione_id', formData.id)
          .order('posizione', { ascending: true });

        if (fcErr) throw fcErr;

        setCalciatoriList(fcData.map(fc => {
          const infoC = Array.isArray(fc.calciatori_reali) ? fc.calciatori_reali[0] : fc.calciatori_reali;
          return {
            id_relazione: fc.id,
            calciatore_id: fc.calciatore_id,
            posizione: fc.posizione,
            ruolo: fc.ruolo,
            nome: infoC?.nome || 'Calciatore Sconosciuto',
            voto_base: fc.voto_base != null ? fc.voto_base.toString() : '6', 
            bonus_malus: fc.bonus_malus != null ? fc.bonus_malus.toString() : '0',
            voto_fanta: fc.voto_fanta || 6,
            senzaVoto: fc.voto_base == null
          };
        }));
      } catch (err) {
        console.error("Errore caricamento formazione admin:", err);
      } finally {
        setLoadingDati(false);
      }
    };
    caricaDatiVotiAdmin();
  }, [giornataId, squadraId]);

  // EFFETTO 3: Algoritmo di ricalcolo dinamico dei subentri e del totale live
  const calcoloRisultato = useMemo(() => {
    if (calciatoriList.length === 0) return { totaleSquadra: 0, sostituzioniEffettuate: 0, giocatoriConteggiati: [] };

    let sost = 0;
    let totale = 0;
    const conteggiati = [];
    const panchina = calciatoriList.filter(c => c.posizione > 11).map(p => ({ ...p, utilizzato: false }));

    calciatoriList.filter(c => c.posizione <= 11).forEach(t => {
      const baseNum = parseFloat(t.voto_base);
      if (!t.senzaVoto && !isNaN(baseNum)) {
        const fanta = baseNum + (parseFloat(t.bonus_malus) || 0);
        conteggiati.push({ 
          nome: t.nome, 
          ruolo: t.ruolo, 
          tipo: 'Titolare', 
          voto_fanta: fanta,
          dettaglio: `${baseNum} ${parseFloat(t.bonus_malus) >= 0 ? '+' : ''}${t.bonus_malus}`
        });
        totale += fanta;
      } else {
        const sub = sost < 4 && panchina.find(p => p.ruolo === t.ruolo && !p.utilizzato && !p.senzaVoto && !isNaN(parseFloat(p.voto_base)));
        if (sub) {
          sub.utilizzato = true; 
          sost++;
          const fanta = parseFloat(sub.voto_base) + (parseFloat(sub.bonus_malus) || 0);
          conteggiati.push({ 
            nome: sub.nome, 
            ruolo: sub.ruolo, 
            tipo: `Subentra per ${t.nome}`, 
            voto_fanta: fanta, 
            dettaglio: `${sub.voto_base} ${parseFloat(sub.bonus_malus) >= 0 ? '+' : ''}${sub.bonus_malus}`,
            isSub: true
          });
          totale += fanta;
        } else {
          conteggiati.push({ 
            nome: t.nome, 
            ruolo: t.ruolo, 
            tipo: 'Non Sostituito', 
            voto_fanta: 0,
            dettaglio: 'S.V.',
            isMalus: true
          });
        }
      }
    });

    return { totaleSquadra: totale, sostituzioniEffettuate: sost, giocatoriConteggiati: conteggiati };
  }, [calciatoriList]);

  // Handler unico per aggiornare le proprietà modificate negli input
  const updateGiocatoreAdmin = (id, campi) => {
    setCalciatoriList(prev => prev.map(c => {
      if (c.id_relazione !== id) return c;
      const proxy = { ...c, ...campi };
      if ('senzaVoto' in campi && campi.senzaVoto) {
        proxy.voto_base = '';
        proxy.voto_fanta = 0;
      } else {
        if (!proxy.voto_base || proxy.voto_base === '') {
          proxy.voto_base = '6';
        }
        const b = parseFloat(proxy.voto_base);
        const bm = parseFloat(proxy.bonus_malus) || 0;
        proxy.voto_fanta = !isNaN(b) ? b + bm : 0;
      }
      return proxy;
    }));
  };

  // Salvataggio definitivo dei dati su Supabase
  const handleSalvaRettificaVotiAdmin = async () => {
    if (!formazioneId) return;
    try {
      setSaving(true);
      const updates = calciatoriList.map(c => ({
        id: c.id_relazione, 
        formazione_id: formazioneId, 
        calciatore_id: c.calciatore_id, 
        ruolo: c.ruolo, 
        posizione: c.posizione,
        voto_base: c.senzaVoto || c.voto_base === '' ? null : parseFloat(c.voto_base),
        bonus_malus: parseFloat(c.bonus_malus) || 0, 
        voto_fanta: c.senzaVoto ? 0 : c.voto_fanta
      }));

      await supabase.from('formazioni_calciatori').upsert(updates);
      await supabase.from('formazioni').update({ punteggio_totale: calcoloRisultato.totaleSquadra }).eq('id', formazioneId);

      alert("Voti salvati d'autorità con successo!");
    } catch (err) {
      alert("Errore durante il salvataggio dei voti.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSetup) return <div className="admin-voti-loading">Apertura Registro Voti Generale... ⏳</div>;

  const renderRowAdmin = (c, isRiserva = false) => (
    <div key={c.id_relazione} className={`admin-voti-player-card ${isRiserva ? 'riserva' : ''} ${c.senzaVoto ? 'player-sv' : ''}`}>
      <div className="admin-player-main-info">
        <div className="admin-player-meta-side">
          <span className={`admin-role-indicator ${c.ruolo}`}>{c.ruolo}</span>
          <strong className="admin-giocatore-nome">{c.nome}</strong>
          {isRiserva && <span className="admin-panchina-order">Pan. #{c.posizione - 11}</span>}
        </div>
        <div className={`admin-tot-display-badge ${c.senzaVoto ? 'sv' : ''}`}>
          {c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}
        </div>
      </div>

      <div className="admin-voti-controls-grid">
        {/* Switch S.V. */}
        <button 
          type="button"
          className={`admin-btn-toggle-sv ${c.senzaVoto ? 'active' : ''}`}
          onClick={() => updateGiocatoreAdmin(c.id_relazione, { senzaVoto: !c.senzaVoto })}
        >
          {c.senzaVoto ? '✓ S.V. Attivo' : 'Imposta S.V.'}
        </button>

        {/* Menu a Tendina Dropdown Voto */}
        <div className="admin-select-container-voto">
          <select
            value={c.senzaVoto ? '' : c.voto_base}
            disabled={c.senzaVoto}
            onChange={e => updateGiocatoreAdmin(c.id_relazione, { voto_base: e.target.value, senzaVoto: false })}
            className="admin-voto-dropdown-select"
          >
            {c.senzaVoto && <option value="">-</option>}
            {opzioniVoto.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Stepper Incrementale Rapido Bonus/Malus */}
        <div className="admin-bonus-stepper-control">
          <button 
            type="button"
            className="admin-step-btn minus"
            onClick={() => updateGiocatoreAdmin(c.id_relazione, { bonus_malus: (parseFloat(c.bonus_malus) - 0.5).toString() })}
          >
            -
          </button>
          <div className="admin-bonus-current-value">
            <small>B/M</small>
            <span>{parseFloat(c.bonus_malus) > 0 ? `+${c.bonus_malus}` : c.bonus_malus}</span>
          </div>
          <button 
            type="button"
            className="admin-step-btn plus"
            onClick={() => updateGiocatoreAdmin(c.id_relazione, { bonus_malus: (parseFloat(c.bonus_malus) + 0.5).toString() })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-voti-page-wrapper">
      {/* HEADER PRINCIPALE */}
      <div className="admin-voti-main-header">
        <button className="admin-btn-back" onClick={() => navigate(-1)}>
          ← Indietro
        </button>
        <h2>Rettifica Voti Autorità ⚡</h2>
      </div>

      {/* FILTRI DI SELEZIONE TURNI E SQUADRE */}
      <div className="admin-voti-filters-card">
        <div className="admin-filter-select-group">
          <label>Seleziona Turno:</label>
          <select value={giornataId} onChange={e => setGiornataId(e.target.value)}>
            {giornate.map(g => <option key={g.id} value={g.id}>Giornata {g.numero_giornata}</option>)}
          </select>
        </div>
        <div className="admin-filter-select-group">
          <label>Squadra iscritta:</label>
          <select value={squadraId} onChange={e => setSquadraId(e.target.value)}>
            {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* BODY INTERFACCIA */}
      {loadingDati ? (
        <div className="admin-voti-loading">Recupero dati dal database... ⏳</div>
      ) : !formazioneId ? (
        <div className="admin-voti-empty-alert">
          🚨 ATTENZIONE: La squadra selezionata non ha schierato nessuna formazione per questa giornata di campionato. Inserimento bloccato.
        </div>
      ) : (
        <div className="admin-voti-split-layout">
          {/* ELENCO INPUT CALCIATORI */}
          <div className="admin-voti-inputs-pane">
            <div className="admin-voti-section-box">
              <div className="admin-section-title-bar">Titolari d'Ufficio</div>
              <div className="admin-cards-stack">
                {calciatoriList.filter(c => c.posizione <= 11).map(c => renderRowAdmin(c))}
              </div>
            </div>
            
            <div className="admin-voti-section-box">
              <div className="admin-section-title-bar warning">Riserve in Panchina</div>
              <div className="admin-cards-stack">
                {calciatoriList.filter(c => c.posizione > 11).map(c => renderRowAdmin(c, true))}
              </div>
            </div>
          </div>

          {/* SIDEBAR DESKTOP / DRAWER MOBILE (Riepilogo Compatto Schermata Singola) */}
          <div className={`admin-voti-summary-pane ${isDrawerOpen ? 'drawer-is-open' : ''}`}>
            <div className="admin-voti-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
            <div className="admin-voti-sticky-card">
              <div className="admin-drawer-mobile-header">
                <h3>Riepilogo Live Autorità</h3>
                <button className="admin-close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
              </div>
              
              <div className="admin-score-large-display">
                <span className="admin-score-title">PROIEZIONE PUNTEGGIO SQUADRA</span>
                <span className="admin-score-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span>
              </div>

              <div className="admin-summary-row">
                <span>Cambi eseguiti dal motore:</span>
                <span className={`admin-badge-count ${calcoloRisultato.sostituzioniEffettuate > 0 ? 'active' : ''}`}>
                  {calcoloRisultato.sostituzioniEffettuate} di 4
                </span>
              </div>

              {/* Elenco Riepilogo Pulito e ad Altezza Contenuta */}
              <div className="admin-components-clean-list">
                {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                  <div key={i} className={`admin-component-row-item ${gc.isSub ? 'is-substituted' : ''} ${gc.isMalus ? 'is-empty-malus' : ''}`}>
                    <div className="admin-comp-left-info">
                      <span className={`admin-mini-role ${gc.ruolo}`}>{gc.ruolo}</span>
                      <div className="admin-comp-name-details">
                        <span className="admin-comp-player-name">{gc.nome}</span>
                        <small className="admin-comp-type-label">{gc.tipo}</small>
                      </div>
                    </div>
                    <div className="admin-comp-right-points">
                      <span className="admin-comp-math-det">{gc.dettaglio}</span>
                      <strong className="admin-comp-final-fanta">{gc.voto_fanta.toFixed(1)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="admin-btn-save-desktop" 
                onClick={handleSalvaRettificaVotiAdmin} 
                disabled={saving}
              >
                {saving ? 'Salvataggio...' : '⚡ Consolida Voti d\'Autorità'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FISSA DI CONTROLLO INFERIORE PER MOBILE */}
      {formazioneId && !loadingDati && (
        <div className="admin-voti-mobile-fixed-bar">
          <div className="admin-m-bar-info">
            <span>Live Admin</span>
            <strong>{calcoloRisultato.totaleSquadra.toFixed(1)}</strong>
          </div>
          <div className="admin-m-bar-actions">
            <button className="admin-btn-m-secondary" onClick={() => setIsDrawerOpen(true)}>
              Riepilogo 📋
            </button>
            <button className="admin-btn-m-primary" onClick={handleSalvaRettificaVotiAdmin} disabled={saving}>
              {saving ? '...' : '⚡ Salva'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModificaVoti;