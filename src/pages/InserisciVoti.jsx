import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../supabaseClient';
import './InserisciVoti.css';

const InserisciVoti = () => {
  const { giornataId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  // Stati per la gestione dei dati e caricamenti
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [giornataInfo, setGiornataInfo] = useState(null);
  const [formazioneId, setFormazioneId] = useState(null);
  const [calciatoriList, setCalciatoriList] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Genera i voti disponibili da 10 a 0 scendendo di 0.5
  const opzioniVoto = useMemo(() => {
    const voti = [];
    for (let i = 10; i >= 0; i -= 0.5) {
      voti.push(i);
    }
    return voti;
  }, []);

  // Effetto principale per caricare i dati della giornata e della formazione del fantallenatore
  useEffect(() => {
    const caricaDatiVoti = async () => {
      try {
        setLoading(true);
        if (!user || !giornataId) return;

        // Recuperiamo le info della giornata corrente
        const { data: gioData } = await supabase.from('giornate').select('*').eq('id', giornataId).single();
        setGiornataInfo(gioData);

        // Controllo scadenze temporali
        const adesso = new Date();
        if (adesso < new Date(gioData.scadenza_formazione) || adesso >= new Date(gioData.scadenza_voti)) {
          alert(adesso < new Date(gioData.scadenza_formazione) ? "Il turno non è ancora chiuso." : "I termini sono scaduti.");
          navigate('/dashboard');
          return;
        }

        // Recuperiamo la squadra dell'utente loggato
        const { data: utente } = await supabase.from('utenti').select('squadra_id').eq('id', user.id).single();
        if (!utente?.squadra_id) return navigate('/dashboard');

        // Controlliamo se esiste una formazione inviata
        const { data: form } = await supabase.from('formazioni').select('id').eq('giornata_id', giornataId).eq('squadra_id', utente.squadra_id).maybeSingle();
        if (!form) {
          alert("Nessuna formazione schierata.");
          return navigate('/dashboard');
        }
        setFormazioneId(form.id);

        // Scarichiamo la lista dei calciatori in formazione
        const { data: fcData } = await supabase.from('formazioni_calciatori').select(`
          id, posizione, ruolo, calciatore_id, voto_base, bonus_malus, voto_fanta, calciatori_reali!calciatore_id (id, nome)
        `).eq('formazione_id', form.id).order('posizione', { ascending: true });

        // Mappiamo i dati impostando valori di default adatti a un Junior Dev
        setCalciatoriList(fcData.map(fc => {
          const infoC = Array.isArray(fc.calciatori_reali) ? fc.calciatori_reali[0] : fc.calciatori_reali;
          return {
            id_relazione: fc.id,
            calciatore_id: fc.calciatore_id,
            posizione: fc.posizione,
            ruolo: fc.ruolo,
            nome: infoC?.nome || 'Calciatore Sconosciuto',
            voto_base: fc.voto_base != null ? fc.voto_base.toString() : '6', // Default a 6
            bonus_malus: fc.bonus_malus != null ? fc.bonus_malus.toString() : '0',
            voto_fanta: fc.voto_fanta || 6,
            senzaVoto: fc.voto_base == null
          };
        }));
      } catch (err) {
        console.error("Errore nel caricamento dei dati: ", err);
      } finally {
        setLoading(false);
      }
    };
    caricaDatiVoti();
  }, [user, giornataId, navigate]);

  // Calcolo automatico delle sostituzioni e dei totali di giornata
  const calcoloRisultato = useMemo(() => {
    let sost = 0;
    let totale = 0;
    const conteggiati = [];
    // Separiamo i panchinari per gestire i subentri
    const panchina = calciatoriList.filter(c => c.posizione > 11).map(p => ({ ...p, utilizzato: false }));

    // Analizziamo gli 11 titolari
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
        // Logica sostituzione: max 4 cambi, stesso ruolo, deve avere un voto valido
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
          // Se non ci sono panchinari disponibili, il giocatore prende 0 (Malus)
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

  // Funzione per aggiornare i voti nello stato locale
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

  // Funzione per salvare tutti i dati su Supabase
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
      navigate('/dashboard');
    } catch (err) {
      alert("Errore durante il salvataggio dei voti");
    } finally {
      setSaving(false);
    }
  };

  // Renderizzatore della singola riga giocatore
  const renderRow = (c, isRiserva = false) => (
    <div key={c.id_relazione} className={`voti-player-card ${isRiserva ? 'riserva' : ''} ${c.senzaVoto ? 'player-sv' : ''}`}>
      <div className="player-main-info">
        <div className="player-meta-side">
          <span className={`role-indicator-voti role-${c.ruolo}`}>{c.ruolo}</span>
          <strong className="voti-player-name">{c.nome}</strong>
          {isRiserva && <span className="panchina-order">PAN # {c.posizione - 11}</span>}
        </div>
        <div className={`tot-display-badge ${c.senzaVoto ? 'sv' : ''} ${c.voto_fanta >= 7 ? 'high-score' : ''}`}>
          {c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}
        </div>
      </div>

      <div className="voti-controls-grid">
        {/* Bottone Senza Voto */}
        <button 
          type="button"
          className={`btn-toggle-sv ${c.senzaVoto ? 'active' : ''}`}
          onClick={() => updateGiocatore(c.id_relazione, { senzaVoto: !c.senzaVoto })}
        >
          {c.senzaVoto ? '✓ S.V.' : 'Imposta S.V.'}
        </button>

        {/* Dropdown Voto Base */}
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

        {/* Stepper Incrementale per Bonus e Malus */}
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

  if (loading) {
    return <div className="voti-loading">Caricamento Mappa Tattica...</div>;
  }

  return (
    <div className="voti-page-container">
      {/* Intestazione Tattica */}
      <div className="voti-header">
        <button className="btn-back-voti" onClick={() => navigate('/dashboard')}>
          ← Indietro
        </button>
        <div className="voti-title-group">
          <h2>VOTI GIORNATA {giornataInfo?.numero_giornata}</h2>
        </div>
      </div>

      <div className="voti-main-layout">
        {/* Colonna di Input dei Calciatori */}
        <div className="voti-inputs-column">
          <div className="voti-section-box">
            <div className="section-title-bar">TITOLARI SCHIERATI</div>
            <div className="cards-stack">
              {calciatoriList.filter(c => c.posizione <= 11).map(c => renderRow(c))}
            </div>
          </div>
          
          <div className="voti-section-box">
            <div className="section-title-bar riserve-bar">LINEA DI PANCHINA</div>
            <div className="cards-stack">
              {calciatoriList.filter(c => c.posizione > 11).map(c => renderRow(c, true))}
            </div>
          </div>
        </div>

        {/* Sidebar Riepilogativa (Desktop ed espansione Mobile) */}
        <div className={`voti-summary-column ${isDrawerOpen ? 'drawer-open' : ''}`}>
          <div className="voti-drawer-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="summary-sticky-card">
            <div className="drawer-header-mobile">
              <h3>PROIEZIONE LIVE SQUADRA</h3>
              <button className="close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>
            
            <div className="score-main-display">
              <span className="score-label">PUNTEGGIO TOTALE LIVE</span>
              <span className="score-number-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span>
            </div>

            <div className="sub-row-summary">
              <span>Sostituzioni Effettuate:</span>
              <span className={`sub-badge ${calcoloRisultato.sostituzioniEffettuate > 0 ? 'active' : ''}`}>
                {calcoloRisultato.sostituzioniEffettuate} / 4
              </span>
            </div>

            {/* Listato compatto dei calcoli effettuati */}
            <div className="components-clean-list">
              {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                <div key={i} className={`component-item-row ${gc.isSub ? 'is-substituted' : ''} ${gc.isMalus ? 'is-empty-malus' : ''}`}>
                  <div className="comp-left-info">
                    <span className={`mini-role role-${gc.ruolo}`}>{gc.ruolo}</span>
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
              {saving ? 'SALVATAGGIO...' : '💾 SALVA VOTI FORMICAZIONE'}
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar per visualizzazione Mobile */}
      <div className="mobile-action-bar">
        <div className="m-bar-info">
          <span>Punti Live</span>
          <strong>{calcoloRisultato.totaleSquadra.toFixed(1)}</strong>
        </div>
        <div className="m-bar-buttons">
          <button className="btn-m-secondary" onClick={() => setIsDrawerOpen(true)}>
            RIEPILOGO
          </button>
          <button className="btn-m-primary" onClick={handleSalvaTuttiVoti} disabled={saving}>
            {saving ? '...' : '💾 SALVA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InserisciVoti;