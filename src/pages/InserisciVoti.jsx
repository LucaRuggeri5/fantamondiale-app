import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './InserisciVoti.css';

const InserisciVoti = () => {
  const { giornataId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [giornataInfo, setGiornataInfo] = useState(null);
  const [formazioneId, setFormazioneId] = useState(null);
  const [calciatoriList, setCalciatoriList] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [calcoloRisultato, setCalcoloRisultato] = useState({
    totaleSquadra: 0,
    sostituzioniEffettuate: 0,
    giocatoriConteggiati: []
  });

  useEffect(() => {
    const caricaDatiVoti = async () => {
      try {
        setLoading(true);
        if (!user || !giornataId) return;

        const { data: gioData } = await supabase.from('giornate').select('*').eq('id', giornataId).single();
        setGiornataInfo(gioData);

        const adesso = new Date();
        if (adesso < new Date(gioData.scadenza_formazione) || adesso >= new Date(gioData.scadenza_voti)) {
          alert(adesso < new Date(gioData.scadenza_formazione) ? "Il turno non è ancora chiuso." : "I termini sono scaduti.");
          navigate('/dashboard');
          return;
        }

        const { data: utente } = await supabase.from('utenti').select('squadra_id').eq('id', user.id).single();
        if (!utente?.squadra_id) return navigate('/dashboard');

        const { data: form } = await supabase.from('formazioni').select('id').eq('giornata_id', giornataId).eq('squadra_id', utente.squadra_id).maybeSingle();
        if (!form) {
          alert("Nessuna formazione schierata.");
          return navigate('/calendario');
        }
        setFormazioneId(form.id);

        const { data: fcData } = await supabase.from('formazioni_calciatori').select(`
          id, posizione, ruolo, calciatore_id, voto_base, bonus_malus, voto_fanta, calciatori_reali!calciatore_id (id, nome)
        `).eq('formazione_id', form.id).order('posizione', { ascending: true });

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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    caricaDatiVoti();
  }, [user, giornataId, navigate]);

  useEffect(() => {
    if (calciatoriList.length === 0) return;

    let sost = 0, totale = 0;
    const conteggiati = [];
    const panchina = calciatoriList.filter(c => c.posizione > 11).map(p => ({ ...p, utilizzato: false }));

    calciatoriList.filter(c => c.posizione <= 11).forEach(t => {
      const baseNum = parseFloat(t.voto_base);
      if (!t.senzaVoto && !isNaN(baseNum)) {
        const fanta = baseNum + (parseFloat(t.bonus_malus) || 0);
        conteggiati.push({ nome: t.nome, ruolo: t.ruolo, tipo: 'Titolare', voto_fanta: fanta, dettaglio: `${baseNum} + ${t.bonus_malus}` });
        totale += fanta;
      } else {
        const sub = sost < 4 && panchina.find(p => p.ruolo === t.ruolo && !p.utilizzato && !p.senzaVoto && !isNaN(parseFloat(p.voto_base)));
        if (sub) {
          sub.utilizzato = true; sost++;
          const fanta = parseFloat(sub.voto_base) + (parseFloat(sub.bonus_malus) || 0);
          conteggiati.push({ nome: sub.nome, ruolo: sub.ruolo, tipo: 'Subentrato', voto_fanta: fanta, dettaglio: `${sub.voto_base} + ${sub.bonus_malus}` });
          totale += fanta;
        } else {
          conteggiati.push({ nome: t.nome, ruolo: t.ruolo, tipo: 'Non Sostituito', voto_fanta: 0, dettaglio: 'S.V.' });
        }
      }
    });
    setCalcoloRisultato({ totaleSquadra: totale, sostituzioniEffettuate: sost, giocatoriConteggiati: conteggiati });
  }, [calciatoriList]);

  const updateGiocatore = (id, campi) => {
    setCalciatoriList(prev => prev.map(c => {
      if (c.id_relazione !== id) return c;
      const proxy = { ...c, ...campi };
      if ('voto_base' in campi) proxy.senzaVoto = campi.voto_base.trim() === '';
      const b = parseFloat(proxy.voto_base), bm = parseFloat(proxy.bonus_malus) || 0;
      proxy.voto_fanta = !isNaN(b) ? b + bm : 0;
      return proxy;
    }));
  };

  const handleSalvaTuttiVoti = async () => {
    try {
      setSaving(true);
      const updates = calciatoriList.map(c => ({
        id: c.id_relazione, formazione_id: formazioneId, calciatore_id: c.calciatore_id, ruolo: c.ruolo, posizione: c.posizione,
        voto_base: c.senzaVoto || c.voto_base === '' ? null : parseFloat(c.voto_base),
        bonus_malus: parseFloat(c.bonus_malus) || 0, voto_fanta: c.senzaVoto ? 0 : c.voto_fanta
      }));

      await supabase.from('formazioni_calciatori').upsert(updates);
      await supabase.from('formazioni').update({ punteggio_totale: calcoloRisultato.totaleSquadra }).eq('id', formazioneId);

      alert("Voti salvati!"); navigate('/calendario');
    } catch (err) {
      alert("Errore di salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="voti-loading">Caricamento... ⏳</div>;

  const renderRow = (c, isRiserva = false) => (
    <div key={c.id_relazione} className={`voti-player-row ${isRiserva ? 'riserva' : ''} ${c.senzaVoto ? 'player-sv' : ''}`}>
      <div className="col-player">
        {isRiserva && <span className="order-num">#{c.posizione - 11}</span>}
        <span className={`badge-ruolo ${c.ruolo}`}>{c.ruolo}</span>
        <span className="giocatore-nome-txt">{c.nome}</span>
      </div>
      <div className="voti-player-row-controls">
        <div className="input-cell cell-sv"><span className="m-lbl">S.V.</span><input type="checkbox" checked={c.senzaVoto} onChange={() => updateGiocatore(c.id_relazione, { senzaVoto: !c.senzaVoto, voto_base: c.senzaVoto ? '6' : '' })} /></div>
        <div className="input-cell cell-voto"><span className="m-lbl">Voto</span><input type="number" step="0.5" placeholder="-" value={c.voto_base} disabled={c.senzaVoto} onChange={e => updateGiocatore(c.id_relazione, { voto_base: e.target.value })} /></div>
        <div className="input-cell cell-bm"><span className="m-lbl">B/M</span><input type="number" step="0.5" placeholder="0" value={c.bonus_malus} onChange={e => updateGiocatore(c.id_relazione, { bonus_malus: e.target.value })} /></div>
        <div className="input-cell cell-tot"><span className="m-lbl">Tot</span><span className="tot-val">{c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}</span></div>
      </div>
    </div>
  );

  return (
    <div className="voti-page-container">
      <div className="voti-header">
        <button className="btn-back-voti" onClick={() => navigate('/calendario')}>⬅️ Indietro</button>
        <h2>Giornata {giornataInfo?.numero_giornata} 📊</h2>
      </div>

      <div className="voti-main-layout">
        <div className="voti-inputs-column">
          <div className="voti-section-card"><h3>Titolari</h3>{calciatoriList.filter(c => c.posizione <= 11).map(c => renderRow(c))}</div>
          <div className="voti-section-card margin-top-card"><h3>Panchina</h3>{calciatoriList.filter(c => c.posizione > 11).map(c => renderRow(c, true))}</div>
        </div>

        {/* SIDEBAR DESKTOP / DRAWER MOBILE */}
        <div className={`voti-summary-column ${isDrawerOpen ? 'drawer-open' : ''}`}>
          <div className="voti-drawer-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="summary-sticky-card">
            <div className="drawer-header-mobile"><h3>Riepilogo</h3><button onClick={() => setIsDrawerOpen(false)}>✕</button></div>
            <div className="score-main-display"><span className="score-label">TOTALE LIVE</span><span className="score-number-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span></div>
            <div className="sub-row"><span>Cambi:</span><span className="sub-badge">{calcoloRisultato.sostituzioniEffettuate} / 4</span></div>
            <div className="components-list">
              {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                <div key={i} className="component-item-row">
                  <div><b>[{gc.ruolo}]</b> {gc.nome} <small>({gc.tipo})</small></div>
                  <div className="comp-points">{gc.voto_fanta.toFixed(1)}</div>
                </div>
              ))}
            </div>
            <button className="btn-salva-desktop" onClick={handleSalvaTuttiVoti} disabled={saving}>{saving ? 'Salvataggio...' : '💾 Salva Voti'}</button>
          </div>
        </div>
      </div>

      {/* FOOTER BAR FISSA SU MOBILE */}
      <div className="mobile-action-bar">
        <div className="m-bar-info"><span>Totale:</span><strong>{calcoloRisultato.totaleSquadra.toFixed(1)}</strong></div>
        <div className="m-bar-buttons">
          <button className="btn-m-secondary" onClick={() => setIsDrawerOpen(true)}>Riepilogo 📋</button>
          <button className="btn-m-primary" onClick={handleSalvaTuttiVoti} disabled={saving}>{saving ? '...' : '💾 Salva'}</button>
        </div>
      </div>
    </div>
  );
};

export default InserisciVoti;