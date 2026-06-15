import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './AdminModificaVoti.css';

// --- INNESTO NOTIFICHE: IMPORTIAMO L'HOOK PERSONALIZZATO DAL CONTEXT ---
import { useNotification } from '../../context/NotificationContext';

/**
 * Pannello di Controllo d'Autorità per la rettifica dei voti tattici.
 * Sviluppato con logiche lineari e Custom Properties per la Tactical Suite.
 */
const AdminModificaVoti = () => {
  const navigate = useNavigate();
  
  // --- INNESTO NOTIFICHE: RECUPERIAMO LA FUNZIONE CENTRALIZZATA DEI TOAST ---
  const { showToast } = useNotification();
  
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

  // Genera le opzioni del voto da 10 a 0 con passi di 0.5
  const opzioniVoto = useMemo(() => {
    const voti = [];
    for (let i = 10; i >= 0; i -= 0.5) {
      voti.push(i);
    }
    return voti;
  }, []);

  // EFFETTO 1: Caricamento iniziale dei filtri Admin (Giornate e Club)
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
        showToast("Errore durante l'inizializzazione dei filtri amministrativi.", "error");
      } finally {
        setLoadingSetup(false);
      }
    };
    fetchSetupVotiAdmin();
  }, []);

  // EFFETTO 2: Recupero dei calciatori schierati in base al turno e al club selezionato
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
        showToast("Impossibile recuperare la formazione per i filtri selezionati.", "error");
      } finally {
        setLoadingDati(false);
      }
    };
    caricaDatiVotiAdmin();
  }, [giornataId, squadraId]);

  // EFFETTO 3: Algoritmo Tattico di ricalcolo dinamico dei subentri e dei totali live
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

  // Handler unico per aggiornare i parametri modificati nei singoli componenti di input
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

  // Salvataggio definitivo e consolidamento dei voti d'autorità su Supabase
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

      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST SUCCESS ---
      showToast("Voti consolidati d'autorità con successo!", "success");
    } catch (err) {
      console.error(err);
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST ERROR ---
      showToast("Errore durante il salvataggio dei voti.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSetup) {
    return <div className="tactical-voti-loading">Apertura Registro Voti Generale... ⏳</div>;
  }

  // Sotto-renderizzazione delle card calciatore per la massima leggibilità
  const renderRowAdmin = (c, isRiserva = false) => (
    <div key={c.id_relazione} className={`tactical-voti-player-card ${isRiserva ? 'riserva' : ''} ${c.senzaVoto ? 'player-sv' : ''}`}>
      <div className="tactical-player-main-info">
        <div className="tactical-player-meta-side">
          <span className={`tactical-role-indicator ${c.ruolo}`}>{c.ruolo}</span>
          <strong className="tactical-giocatore-nome">{c.nome}</strong>
          {isRiserva && <span className="tactical-panchina-order">Pan. #{c.posizione - 11}</span>}
        </div>
        <div className={`tactical-tot-display-badge ${c.senzaVoto ? 'sv' : ''}`}>
          {c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}
        </div>
      </div>

      <div className="tactical-voti-controls-grid">
        {/* Toggle S.V. */}
        <button 
          type="button"
          className={`tactical-btn-toggle-sv ${c.senzaVoto ? 'active' : ''}`}
          onClick={() => updateGiocatoreAdmin(c.id_relazione, { senzaVoto: !c.senzaVoto })}
        >
          {c.senzaVoto ? '✓ S.V. Attivo' : 'Imposta S.V.'}
        </button>

        {/* Dropdown Selezione Voto */}
        <div className="tactical-select-container-voto">
          <select
            value={c.senzaVoto ? '' : c.voto_base}
            disabled={c.senzaVoto}
            onChange={e => updateGiocatoreAdmin(c.id_relazione, { voto_base: e.target.value, senzaVoto: false })}
            className="tactical-voto-dropdown-select"
          >
            {c.senzaVoto && <option value="">-</option>}
            {opzioniVoto.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Stepper Incrementale per Bonus / Malus */}
        <div className="tactical-bonus-stepper-control">
          <button 
            type="button"
            className="tactical-step-btn minus"
            onClick={() => updateGiocatoreAdmin(c.id_relazione, { bonus_malus: (parseFloat(c.bonus_malus) - 0.5).toString() })}
          >
            -
          </button>
          <div className="tactical-bonus-current-value">
            <small>B/M</small>
            <span>{parseFloat(c.bonus_malus) > 0 ? `+${c.bonus_malus}` : c.bonus_malus}</span>
          </div>
          <button 
            type="button"
            className="tactical-step-btn plus"
            onClick={() => updateGiocatoreAdmin(c.id_relazione, { bonus_malus: (parseFloat(c.bonus_malus) + 0.5).toString() })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="tactical-app-container tactical-voti-page-wrapper">
      
      {/* HEADER DI SUITE */}
      <div className="tactical-voti-main-header">
        <button className="tactical-btn-back" onClick={() => navigate('/dashboard')}>
          ← Indietro
        </button>
        <h2 className="tactical-brand">Rettifica Voti</h2>
      </div>

      {/* PANNELLO FILTRI DI CAMPO */}
      <div className="tactical-card-filters">
        <div className="tactical-filter-select-group">
          <label>Seleziona Turno:</label>
          <select value={giornataId} onChange={e => setGiornataId(e.target.value)}>
            {giornate.map(g => <option key={g.id} value={g.id}>Giornata {g.numero_giornata}</option>)}
          </select>
        </div>
        <div className="tactical-filter-select-group">
          <label>Club Iscritto:</label>
          <select value={squadraId} onChange={e => setSquadraId(e.target.value)}>
            {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* STRUTTURA DINAMICA DEI CONTENUTI */}
      {loadingDati ? (
        <div className="tactical-voti-loading">Recupero dati dal registro tattico... ⏳</div>
      ) : !formazioneId ? (
        <div className="tactical-voti-empty-alert">
          🚨 ATTENZIONE: Il club selezionato non ha registrato nessuna formazione per questo turno di campionato. Rettifica d'ufficio disabilitata.
        </div>
      ) : (
        <div className="tactical-voti-split-layout">
          
          {/* COLONNA ELEMENTI DI INPUT (SINISTRA) */}
          <div className="tactical-voti-inputs-pane">
            <div className="tactical-voti-section-box">
              <div className="tactical-section-title-bar">Titolari d'Ufficio</div>
              <div className="tactical-cards-stack">
                {calciatoriList.filter(c => c.posizione <= 11).map(c => renderRowAdmin(c))}
              </div>
            </div>
            
            <div className="tactical-voti-section-box">
              <div className="tactical-section-title-bar warning">Riserve in Linea</div>
              <div className="tactical-cards-stack">
                {calciatoriList.filter(c => c.posizione > 11).map(c => renderRowAdmin(c, true))}
              </div>
            </div>
          </div>

          {/* SIDEBAR DESKTOP / DRAWER MOBILE (DESTRA) */}
          <div className={`tactical-voti-summary-pane ${isDrawerOpen ? 'drawer-is-open' : ''}`}>
            <div className="tactical-voti-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
            <div className="tactical-voti-sticky-card">
              
              <div className="tactical-drawer-mobile-header">
                <h3>Riepilogo Live Modifiche</h3>
                <button className="tactical-close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
              </div>
              
              <div className="tactical-score-large-display">
                <span className="tactical-score-title">PROIEZIONE PUNTEGGIO SQUADRA</span>
                <span className="tactical-score-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span>
              </div>

              <div className="tactical-summary-row">
                <span>Cambi eseguiti dal motore:</span>
                <span className={`tactical-badge-count ${calcoloRisultato.sostituzioniEffettuate > 0 ? 'active' : ''}`}>
                  {calcoloRisultato.sostituzioniEffettuate} di 4
                </span>
              </div>

              {/* Lista Compatta di Calcolo dei Punti */}
              <div className="tactical-components-clean-list">
                {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                  <div key={i} className={`tactical-component-row-item ${gc.isSub ? 'is-substituted' : ''} ${gc.isMalus ? 'is-empty-malus' : ''}`}>
                    <div className="tactical-comp-left-info">
                      <span className={`tactical-mini-role ${gc.ruolo}`}>{gc.ruolo}</span>
                      <div className="tactical-comp-name-details">
                        <span className="tactical-comp-player-name">{gc.nome}</span>
                        <small className="tactical-comp-type-label">{gc.tipo}</small>
                      </div>
                    </div>
                    <div className="tactical-comp-right-points">
                      <span className="tactical-comp-math-det">{gc.dettaglio}</span>
                      <strong className="tactical-comp-final-fanta">{gc.voto_fanta.toFixed(1)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="tactical-btn-save-desktop" 
                onClick={handleSalvaRettificaVotiAdmin} 
                disabled={saving}
              >
                {saving ? 'Consolidamento...' : '⚡ Consolida Voti d\'Autorità'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FISSA DI MANOVRA INFERIORE PER DISPOSITIVI MOBILE */}
      {formazioneId && !loadingDati && (
        <div className="tactical-voti-mobile-fixed-bar">
          <div className="tactical-m-bar-info">
            <span>Proiezione Live</span>
            <strong>{calcoloRisultato.totaleSquadra.toFixed(1)}</strong>
          </div>
          <div className="tactical-m-bar-actions">
            <button className="tactical-btn-m-secondary" onClick={() => setIsDrawerOpen(true)}>
              Riepilogo
            </button>
            <button className="tactical-btn-m-primary" onClick={handleSalvaRettificaVotiAdmin} disabled={saving}>
              {saving ? '...' : '💾 Salva'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModificaVoti;