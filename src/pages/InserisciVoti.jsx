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

        // 1. Legge informazioni sulla giornata corrente
        const { data: gioData, error: gioErr } = await supabase
          .from('giornate')
          .select('*')
          .eq('id', giornataId)
          .single();

        if (gioErr) throw gioErr;
        setGiornataInfo(gioData);

        // --- NUOVA LOGICA TEMPORALE ESPLICITA ---
        const adesso = new Date();
        const fineFormazioni = new Date(gioData.scadenza_formazione);
        const fineVoti = new Date(gioData.scadenza_voti);

        // La "Fase Calcolo" è attiva solo tra la fine delle formazioni e la chiusura del turno
        const isFaseCalcoloAttiva = adesso >= fineFormazioni && adesso < fineVoti;

        if (!isFaseCalcoloAttiva) {
          if (adesso < fineFormazioni) {
            alert("Il turno non è ancora chiuso. Potrai inserire i voti solo dopo la scadenza della consegna formazioni.");
          } else {
            alert("I termini per l'inserimento dei voti di questo turno sono scaduti.");
          }
          navigate('/dashboard');
          return;
        }
        // ---------------------------------------

        const { data: utenteData, error: utenteErr } = await supabase
          .from('utenti')
          .select('squadra_id')
          .eq('id', user.id)
          .single();

        if (utenteErr) throw utenteErr;
        if (!utenteData?.squadra_id) {
          alert("Nessuna squadra associata al tuo account.");
          navigate('/dashboard');
          return;
        }

        const { data: formData, error: formErr } = await supabase
          .from('formazioni')
          .select('id')
          .eq('giornata_id', giornataId)
          .eq('squadra_id', utenteData.squadra_id)
          .maybeSingle();

        if (formErr) throw formErr;
        if (!formData) {
          alert("Non hai schierato alcuna formazione per questo turno. Impossibile calcolare i voti.");
          navigate('/calendario');
          return;
        }

        setFormazioneId(formData.id);

        const { data: fcData, error: fcErr } = await supabase
          .from('formazioni_calciatori')
          .select(`
            id,
            posizione,
            ruolo,
            calciatore_id,
            voto_base,
            bonus_malus,
            voto_fanta,
            calciatori_reali!calciatore_id (id, nome)
          `)
          .eq('formazione_id', formData.id)
          .order('posizione', { ascending: true });

        if (fcErr) throw fcErr;

        const normalizzati = fcData.map(fc => {
          const infoC = Array.isArray(fc.calciatori_reali) ? fc.calciatori_reali[0] : fc.calciatori_reali;
          return {
            id_relazione: fc.id,
            calciatore_id: fc.calciatore_id,
            posizione: fc.posizione,
            ruolo: fc.ruolo,
            nome: infoC?.nome || 'Calciatore Sconosciuto',
            voto_base: fc.voto_base !== null && fc.voto_base !== undefined ? fc.voto_base.toString() : '',
            bonus_malus: fc.bonus_malus !== null && fc.bonus_malus !== undefined ? fc.bonus_malus.toString() : '0',
            voto_fanta: fc.voto_fanta || 0,
            senzaVoto: fc.voto_base === null || fc.voto_base === undefined
          };
        });

        setCalciatoriList(normalizzati);
      } catch (err) {
        console.error("Errore inizializzazione:", err);
      } finally {
        setLoading(false);
      }
    };

    caricaDatiVoti();
  }, [user, giornataId, navigate]);

  // Algoritmo di calcolo automatico dei subentri (Max 4 cambi per ruolo)
  useEffect(() => {
    if (calciatoriList.length === 0) return;

    const titolari = calciatoriList.filter(c => c.posizione <= 11);
    const panchina = calciatoriList.filter(c => c.posizione > 11);

    // RISOLTO: Uniformata la variabile in minuscolo per evitare il ReferenceError
    let contatoreSostituzioni = 0;
    const conteggiati = [];
    let totaleSquadra = 0;

    const panchinaStato = panchina.map(p => ({ ...p, utilizzato: false }));

    titolari.forEach(t => {
      const baseNum = parseFloat(t.voto_base);
      const haVotoValido = !t.senzaVoto && !isNaN(baseNum);

      if (haVotoValido) {
        const bm = parseFloat(t.bonus_malus) || 0;
        const fantaVoto = baseNum + bm;
        conteggiati.push({
          nome: t.nome, ruolo: t.ruolo, tipo: 'Titolare',
          voto_fanta: fantaVoto, dettaglio: `${baseNum} (Voto) + ${bm >= 0 ? '+' : ''}${bm} (B/M)`
        });
        totaleSquadra += fantaVoto;
      } else {
        let subentrato = false;
        
        // Controllo se abbiamo ancora slot sostituzioni disponibili (Max 4 totali)
        if (contatoreSostituzioni < 4) {
          const sostituto = panchinaStato.find(p => 
            p.ruolo === t.ruolo && !p.utilizzato && !p.senzaVoto && !isNaN(parseFloat(p.voto_base))
          );
          if (sostituto) {
            sostituto.utilizzato = true;
            contatoreSostituzioni++;
            subentrato = true;
            const sBase = parseFloat(sostituto.voto_base);
            const sBm = parseFloat(sostituto.bonus_malus) || 0;
            const sFanta = sBase + sBm;
            conteggiati.push({
              nome: sostituto.nome, ruolo: sostituto.ruolo, tipo: `Subentrato (Panchina)`,
              voto_fanta: sFanta, dettaglio: `${sBase} (Voto) + ${sBm >= 0 ? '+' : ''}${sBm} (B/M)`
            });
            totaleSquadra += sFanta;
          }
        }
        if (!subentrato) {
          conteggiati.push({
            nome: t.nome, ruolo: t.ruolo, tipo: 'Non Sostituito',
            voto_fanta: 0, dettaglio: 'Senza Voto / Panchina Esaurita'
          });
        }
      }
    });

    setCalcoloRisultato({ 
      totaleSquadra, 
      sostituzioniEffettuate: contatoreSostituzioni, 
      giocatoriConteggiati: conteggiati 
    });
  }, [calciatoriList]);

  const handleInputChange = (idRelazione, campo, valore) => {
    setCalciatoriList(prev => prev.map(c => {
      if (c.id_relazione !== idRelazione) return c;
      const aggiornato = { ...c, [campo]: valore };
      
      if (campo === 'voto_base') aggiornato.senzaVoto = valore.trim() === '';
      
      const vBase = parseFloat(aggiornato.voto_base);
      const vBm = parseFloat(aggiornato.bonus_malus) || 0;
      
      // Manteniamo aggiornato il voto fanta istantaneo garantendo operazioni matematiche pulite
      aggiornato.voto_fanta = !isNaN(vBase) ? vBase + vBm : 0;
      return aggiornato;
    }));
  };

  const handleToggleSenzaVoto = (idRelazione) => {
    setCalciatoriList(prev => prev.map(c => {
      if (c.id_relazione !== idRelazione) return c;
      const invertito = !c.senzaVoto;
      return {
        ...c, senzaVoto: invertito,
        voto_base: invertito ? '' : '6',
        voto_fanta: invertito ? 0 : 6 + (parseFloat(c.bonus_malus) || 0)
      };
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

      const { error: upsertErr } = await supabase
        .from('formazioni_calciatori')
        .upsert(updates);

      if (upsertErr) throw upsertErr;

      const { error: formUpdateErr } = await supabase
        .from('formazioni')
        .update({ punteggio_totale: calcoloRisultato.totaleSquadra })
        .eq('id', formazioneId);

      if (formUpdateErr) throw formUpdateErr;

      alert("Voti salvati con successo! Il tuo punteggio totale è stato aggiornato.");
      navigate('/calendario');
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio: " + (err.message || "riprova più tardi"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="voti-loading">Analisi turno e rosa in corso... ⏳</div>;

  const titolari = calciatoriList.filter(c => c.posizione <= 11);
  const panchina = calciatoriList.filter(c => c.posizione > 11);

  return (
    <div className="voti-page-container">
      <div className="voti-header">
        <div className="voti-header-action-container">
          <button className="btn-back-voti" onClick={() => navigate('/calendario')}>
            ⬅️ Indietro
          </button>
          <h2>Inserimento Voti Giornata {giornataInfo?.numero_giornata} 📊</h2>
        </div>
        <p className="voti-subtitle">Inserisci i voti base e i bonus/malus. Il sistema gestirà i subentri in tempo reale.</p>
      </div>

      <div className="voti-main-layout">
        <div className="voti-inputs-column">
          <div className="voti-section-card">
            <h3>Titolari</h3>
            <div className="voti-table-header">
              <span className="col-player">Calciatore</span>
              <span className="col-sv">S.V.</span>
              <span className="col-voto">Voto</span>
              <span className="col-bm">Bonus</span>
              <span className="col-tot">Tot</span>
            </div>
            {titolari.map(c => (
              <div key={c.id_relazione} className={`voti-player-row ${c.senzaVoto ? 'player-sv' : ''}`}>
                <div className="col-player">
                  <span className={`badge-ruolo ${c.ruolo}`}>{c.ruolo}</span>
                  <span className="giocatore-nome-txt">{c.nome}</span>
                </div>
                <div className="col-sv">
                  <input type="checkbox" checked={c.senzaVoto} onChange={() => handleToggleSenzaVoto(c.id_relazione)} />
                </div>
                <div className="col-voto">
                  <input type="number" step="0.5" value={c.voto_base} disabled={c.senzaVoto} onChange={(e) => handleInputChange(c.id_relazione, 'voto_base', e.target.value)} />
                </div>
                <div className="col-bm">
                  <input type="number" step="0.5" value={c.bonus_malus} onChange={(e) => handleInputChange(c.id_relazione, 'bonus_malus', e.target.value)} />
                </div>
                <div className="col-tot">{c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}</div>
              </div>
            ))}
          </div>

          <div className="voti-section-card margin-top-card">
            <h3>Panchina</h3>
            {panchina.map(c => (
              <div key={c.id_relazione} className={`voti-player-row riserva ${c.senzaVoto ? 'player-sv' : ''}`}>
                <div className="col-player">
                  <span className="order-num">#{c.posizione - 11}</span>
                  <span className={`badge-ruolo ${c.ruolo}`}>{c.ruolo}</span>
                  <span className="giocatore-nome-txt">{c.nome}</span>
                </div>
                <div className="col-sv">
                  <input type="checkbox" checked={c.senzaVoto} onChange={() => handleToggleSenzaVoto(c.id_relazione)} />
                </div>
                <div className="col-voto">
                  <input type="number" step="0.5" value={c.voto_base} disabled={c.senzaVoto} onChange={(e) => handleInputChange(c.id_relazione, 'voto_base', e.target.value)} />
                </div>
                <div className="col-bm">
                  <input type="number" step="0.5" value={c.bonus_malus} onChange={(e) => handleInputChange(c.id_relazione, 'bonus_malus', e.target.value)} />
                </div>
                <div className="col-tot">{c.senzaVoto ? 'S.V.' : c.voto_fanta.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="voti-summary-column">
          <div className="summary-sticky-card">
            <h3>Riepilogo Live</h3>
            <div className="score-main-display">
              <span className="score-label">PUNTEGGIO SQUADRA</span>
              <span className="score-number-value">{calcoloRisultato.totaleSquadra.toFixed(1)}</span>
            </div>
            
            <div className="substitution-counter-row">
              <span>Sostituzioni effettuate:</span>
              <span className={`sub-count-badge ${calcoloRisultato.sostituzioniEffettuate > 0 ? 'active' : ''}`}>
                {calcoloRisultato.sostituzioniEffettuate} / 4
              </span>
            </div>

            <h4 className="components-title">Formazione Conteggiata:</h4>
            <div className="components-list">
              {calcoloRisultato.giocatoriConteggiati.map((gc, i) => (
                <div key={i} className={`component-item-row ${gc.voto_fanta === 0 ? 'zero-score' : ''}`}>
                  <div className="comp-meta">
                    <span className="comp-name"><b>[{gc.ruolo}]</b> {gc.nome}</span>
                    <span className="comp-type">{gc.tipo}</span>
                    <span className="comp-math">{gc.dettaglio}</span>
                  </div>
                  <span className="comp-points">{gc.voto_fanta.toFixed(1)}</span>
                </div>
              ))}
            </div>

            <button className="btn-salva-voti-complessivo" onClick={handleSalvaTuttiVoti} disabled={saving}>
              {saving ? 'Salvataggio...' : '💾 Salva Voti'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InserisciVoti;