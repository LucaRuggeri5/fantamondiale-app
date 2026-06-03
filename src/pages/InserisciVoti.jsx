import React, { useState, useEffect, useMemo } from 'react';
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

  // Genera le opzioni del voto da 0 a 10 con passi di 0.5
  const opzioniVoto = useMemo(() => {
    const voti = [];
    for (let i = 10; i >= 0; i -= 0.5) {
      voti.push(i);
    }
    return voti;
  }, []);

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
            voto_base: fc.voto_base != null ? fc.voto_base.toString() : '6', // Preimpostato a 6 se vuoto
            bonus_malus: fc.bonus_malus != null ? fc.bonus_malus.toString() : '0',
            voto_fanta: fc.voto_fanta || 6,
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

  // Motore di calcolo delle sostituzioni e dei punteggi live
  const calcoloRisultato = useMemo(() => {
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
        // Cerca sostituto dello stesso ruolo in panchina non ancora utilizzato e con voto valido
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

  const updateGiocatore = (id, campi) => {
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

  const handleSalvaTuttiVoti = async () => {
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

      alert("Voti salvati con successo!"); 
      navigate('/calendario');
    } catch (err) {
      alert("Errore durante il salvataggio dei voti");
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (c, isRiserva = false) => (
    <div key={c.id_relazione} className={`voti-player-card ${isRiserva ? 'riserva' : ''} ${c.senzaVoto ? 'player-sv' : ''}`}>
      <div className="player-main-info">
        <div className="player-meta-side">
          <span className={`role-indicator-voti ${c.ruolo}`}>{c.ruolo}</span>
          <strong className="voti-player-name">{c.nome}</strong>
          {isRiserva && <span className="panchina-order">Pan. #{c.posizione - 11}</span>}
        </div>
        <div className={`tot-display-badge ${c.senzaVoto ? 'sv' : ''}`}>
          {c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}
        </div>
      </div>

      <div className="voti-controls-grid">
        {/* Switch S.V. */}
        <button 
          type="button"
          className={`btn-toggle-sv ${c.senzaVoto ? 'active' : ''}`}
          onClick={() => updateGiocatore(c.id_relazione, { senzaVoto: !c.senzaVoto })}
        >
          {c.senzaVoto ? '✓ Senza Voto' : 'Imposta S.V.'}
        </button>

        {/* Menu a Tendina Voto Base */}
        <div className="select-container-voto">
          <select
            value={c.senzaVoto ? '' : c.voto_base}
            disabled={c.senzaVoto}
            onChange={e => updateGiocatore(c.id_relazione, { voto_base: e.target.value, senzaVoto: false })}
            className="voto-dropdown-select"
          >
            {c.senzaVoto && <option value="">-</option>}
            {opzioniVoto.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Pulsantiera Incrementale Rapida per Bonus/Malus */}
        <div className="bonus-stepper-control">
          <button 
            type="button"
            className="step-btn minus"
            onClick={() => updateGiocatore(c.id_relazione, { bonus_malus: (parseFloat(c.bonus_malus) - 0.5).toString() })}
          >
            -
          </button>
          <div className="bonus-current-value">
            <small>B/M</small>
            <span>{parseFloat(c.bonus_malus) > 0 ? `+${c.bonus_malus}` : c.bonus_malus}</span>
          </div>
          <button 
            type="button"
            className="step-btn plus"
            onClick={() => updateGiocatore(c.id_relazione, { bonus_malus: (parseFloat(c.bonus_malus) + 0.5).toString() })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="voti-page-container">
      {/* Intestazione */}
      <div className="voti-header">
        <button className="btn-back-voti" onClick={() => navigate('/calendario')}>
          ← Indietro
        </button>
        <div className="voti-title-group">
          <h2>Giornata {giornataInfo?.numero_giornata}</h2>
        </div>
      </div>

      <div className="voti-main-layout">
        {/* COLONNA INPUT GIOCATORI */}
        <div className="voti-inputs-column">
          <div className="voti-section-box">
            <div className="section-title-bar">Titolari</div>
            <div className="cards-stack">
              {calciatoriList.filter(c => c.posizione <= 11).map(c => renderRow(c))}
            </div>
          </div>
          
          <div className="voti-section-box">
            <div className="section-title-bar warning">Panchina</div>
            <div className="cards-stack">
              {calciatoriList.filter(c => c.posizione > 11).map(c => renderRow(c, true))}
            </div>
          </div>
        </div>

        {/* SIDEBAR DESKTOP / DRAWER MOBILE (Riepilogo Compatto Senza Scrolling) */}
        <div className={`voti-summary-column ${isDrawerOpen ? 'drawer-open' : ''}`}>
          <div className="voti-drawer-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="summary-sticky-card">
            <div className="drawer-header-mobile">
              <h3>Riepilogo Calcolo Live</h3>
              <button className="close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>
            
            <div className="score-main-display">
              <span className="score-label">PROIEZIONE PUNTEGGIO SQUADRA</span>
              <span className="score-number-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span>
            </div>

            <div className="sub-row-summary">
              <span>Sostituzioni Effettuate:</span>
              <span className={`sub-badge ${calcoloRisultato.sostituzioniEffettuate > 0 ? 'active' : ''}`}>
                {calcoloRisultato.sostituzioniEffettuate} di 4
              </span>
            </div>

            {/* Listato Ottimizzato ad un'unica schermata */}
            <div className="components-clean-list">
              {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                <div key={i} className={`component-item-row ${gc.isSub ? 'is-substituted' : ''} ${gc.isMalus ? 'is-empty-malus' : ''}`}>
                  <div className="comp-left-info">
                    <span className={`mini-role ${gc.ruolo}`}>{gc.ruolo}</span>
                    <div className="comp-name-details">
                      <span className="comp-player-name">{gc.nome}</span>
                      <small className="comp-type-label">{gc.tipo}</small>
                    </div>
                  </div>
                  <div className="comp-right-points">
                    <span className="comp-math-det">{gc.dettaglio}</span>
                    <strong className="comp-final-fanta">{gc.voto_fanta.toFixed(1)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <button 
              className="btn-salva-desktop" 
              onClick={handleSalvaTuttiVoti} 
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : '💾 Salva Voti Formazione'}
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER BAR NAVIGATION MOBILE */}
      <div className="mobile-action-bar">
        <div className="m-bar-info">
          <span>Live Punti</span>
          <strong>{calcoloRisultato.totaleSquadra.toFixed(1)}</strong>
        </div>
        <div className="m-bar-buttons">
          <button className="btn-m-secondary" onClick={() => setIsDrawerOpen(true)}>
            Vedi Riepilogo 📋
          </button>
          <button className="btn-m-primary" onClick={handleSalvaTuttiVoti} disabled={saving}>
            {saving ? '...' : '💾 Salva'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InserisciVoti;