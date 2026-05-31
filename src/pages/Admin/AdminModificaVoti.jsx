import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './AdminModificaVoti.css'; // Nuovo file CSS dedicato e isolato

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Gestione drawer riepilogo su mobile
  const [calcoloRisultato, setCalcoloRisultato] = useState({
    totaleSquadra: 0,
    sostituzioniEffettuate: 0,
    giocatoriConteggiati: []
  });

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
        if (!formData) return; // Nessuna formazione schierata per questa squadra

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
            voto_base: fc.voto_base != null ? fc.voto_base.toString() : '',
            bonus_malus: fc.bonus_malus != null ? fc.bonus_malus.toString() : '0',
            voto_fanta: fc.voto_fanta || 0,
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
  useEffect(() => {
    if (calciatoriList.length === 0) return;

    let sost = 0, totale = 0;
    const conteggiati = [];
    const panchina = calciatoriList.filter(c => c.posizione > 11).map(p => ({ ...p, utilizzato: false }));

    calciatoriList.filter(c => c.posizione <= 11).forEach(t => {
      const baseNum = parseFloat(t.voto_base);
      if (!t.senzaVoto && !isNaN(baseNum)) {
        const fanta = baseNum + (parseFloat(t.bonus_malus) || 0);
        conteggiati.push({ nome: t.nome, ruolo: t.ruolo, tipo: 'Titolare', voto_fanta: fanta });
        totale += fanta;
      } else {
        const sub = sost < 4 && panchina.find(p => p.ruolo === t.ruolo && !p.utilizzato && !p.senzaVoto && !isNaN(parseFloat(p.voto_base)));
        if (sub) {
          sub.utilizzato = true; sost++;
          const fanta = parseFloat(sub.voto_base) + (parseFloat(sub.bonus_malus) || 0);
          conteggiati.push({ nome: sub.nome, ruolo: sub.ruolo, tipo: 'Subentrato', voto_fanta: fanta });
          totale += fanta;
        } else {
          conteggiati.push({ nome: t.nome, ruolo: t.ruolo, tipo: 'Non Sostituito', voto_fanta: 0 });
        }
      }
    });
    setCalcoloRisultato({ totaleSquadra: totale, sostituzioniEffettuate: sost, giocatoriConteggiati: conteggiati });
  }, [calciatoriList]);

  // Handler unico per aggiornare le proprietà modificate negli input
  const updateGiocatoreAdmin = (id, campi) => {
    setCalciatoriList(prev => prev.map(c => {
      if (c.id_relazione !== id) return c;
      const proxy = { ...c, ...campi };
      if ('voto_base' in campi) proxy.senzaVoto = campi.voto_base.trim() === '';
      const b = parseFloat(proxy.voto_base), bm = parseFloat(proxy.bonus_malus) || 0;
      proxy.voto_fanta = !isNaN(b) ? b + bm : 0;
      return proxy;
    }));
  };

  // Salvataggio definitivo dei dati su Supabase
  const handleSalvaRettificaVotiAdmin = async () => {
    if (!formazioneId) return;
    try {
      setSaving(true);
      const updates = calciatoriList.map(c => ({
        id: c.id_relazione, formazione_id: formazioneId, calciatore_id: c.calciatore_id, ruolo: c.ruolo, posizione: c.posizione,
        voto_base: c.senzaVoto || c.voto_base === '' ? null : parseFloat(c.voto_base),
        bonus_malus: parseFloat(c.bonus_malus) || 0, voto_fanta: c.senzaVoto ? 0 : c.voto_fanta
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

  // Renderizzatore della riga calciatore (Struttura fluida ottimizzata)
  const renderRowAdmin = (c, isRiserva = false) => (
    <div key={c.id_relazione} className={`admin-voti-player-row ${isRiserva ? 'riserva' : ''} ${c.senzaVoto ? 'player-sv' : ''}`}>
      <div className="admin-col-player">
        {isRiserva && <span className="admin-order-num">#{c.posizione - 11}</span>}
        <span className={`admin-badge-ruolo admin-ruolo-${c.ruolo}`}>{c.ruolo}</span>
        <span className="admin-giocatore-nome">{c.nome}</span>
      </div>
      <div className="admin-voti-player-controls">
        <div className="admin-input-cell">
          <span className="admin-mobile-label">S.V.</span>
          <input type="checkbox" checked={c.senzaVoto} onChange={() => updateGiocatoreAdmin(c.id_relazione, { senzaVoto: !c.senzaVoto, voto_base: c.senzaVoto ? '6' : '' })} />
        </div>
        <div className="admin-input-cell">
          <span className="admin-mobile-label">Voto</span>
          <input type="number" step="0.5" placeholder="-" value={c.voto_base} disabled={c.senzaVoto} onChange={e => updateGiocatoreAdmin(c.id_relazione, { voto_base: e.target.value })} />
        </div>
        <div className="admin-input-cell">
          <span className="admin-mobile-label">B/M</span>
          <input type="number" step="0.5" placeholder="0" value={c.bonus_malus} onChange={e => updateGiocatoreAdmin(c.id_relazione, { bonus_malus: e.target.value })} />
        </div>
        <div className="admin-input-cell">
          <span className="admin-mobile-label">Tot</span>
          <span className="admin-tot-val">{c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-voti-page-wrapper">
      {/* HEADER PRINCIPALE */}
      <div className="admin-voti-main-header">
        <button className="admin-btn-back" onClick={() => navigate(-1)}>⬅️ Indietro</button>
        <h2>Rettifica Voti & Calcolo Classifiche ⚡</h2>
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
          <label>Seleziona Formazione Squadra:</label>
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
          🚨 ATTENZIONE: La squadra selezionata non ha inserito nessuna formazione per questo turno. Inserimento disabilitato.
        </div>
      ) : (
        <div className="admin-voti-split-layout">
          {/* ELENCO DEI CALCIATORI */}
          <div className="admin-voti-inputs-pane">
            <div className="admin-voti-section-box"><h3>Titolari d'Ufficio</h3>{calciatoriList.filter(c => c.posizione <= 11).map(c => renderRowAdmin(c))}</div>
            <div className="admin-voti-section-box admin-mt-12"><h3>Riserves in Panchina</h3>{calciatoriList.filter(c => c.posizione > 11).map(c => renderRowAdmin(c, true))}</div>
          </div>

          {/* COLONNA INFORMAZIONI E COMPONENTI (SIDEBAR / DRAWER) */}
          <div className={`admin-voti-summary-pane ${isDrawerOpen ? 'drawer-is-open' : ''}`}>
            <div className="admin-voti-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
            <div className="admin-voti-sticky-card">
              <div className="admin-drawer-mobile-header"><h3>Riepilogo Live Admin</h3><button onClick={() => setIsDrawerOpen(false)}>✕</button></div>
              <div className="admin-score-large-display"><span className="admin-score-title">TOTALE SQUADRA</span><span className="admin-score-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span></div>
              <div className="admin-summary-row"><span>Sostituzioni applicate:</span><span className="admin-badge-count">{calcoloRisultato.sostituzioniEffettuate} / 4</span></div>
              <div className="admin-components-scroll-list">
                {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                  <div key={i} className="admin-component-row-item">
                    <div><b>[{gc.ruolo}]</b> {gc.nome} <small>({gc.tipo})</small></div>
                    <div className="admin-comp-points-val">{gc.voto_fanta.toFixed(1)}</div>
                  </div>
                ))}
              </div>
              <button className="admin-btn-save-desktop" onClick={handleSalvaRettificaVotiAdmin} disabled={saving}>{saving ? 'Salvataggio...' : '⚡ Consolida Voti'}</button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FISSA DI CONTROLLO INFERIORE PER MOBILE */}
      {formazioneId && !loadingDati && (
        <div className="admin-voti-mobile-fixed-bar">
          <div className="admin-m-bar-info"><span>Totale Live:</span><strong>{calcoloRisultato.totaleSquadra.toFixed(1)}</strong></div>
          <div className="admin-m-bar-actions">
            <button className="admin-btn-m-secondary" onClick={() => setIsDrawerOpen(true)}>Riepilogo 📋</button>
            <button className="admin-btn-m-primary" onClick={handleSalvaRettificaVotiAdmin} disabled={saving}>{saving ? '...' : '⚡ Salva'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModificaVoti;