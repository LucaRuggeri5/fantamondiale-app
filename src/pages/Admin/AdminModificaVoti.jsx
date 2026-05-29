import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import '../InserisciVoti.css'; // Riutilizziamo lo stile CSS esistente per coerenza visiva

const AdminModificaVoti = () => {
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingDati, setLoadingDati] = useState(false);
  const [saving, setSaving] = useState(false);

  // Liste per i Filtri Globali Admin
  const [giornate, setGiornate] = useState([]);
  const [squadre, setSquadre] = useState([]);

  // Selezioni Correnti
  const [giornataId, setGiornataId] = useState('');
  const [squadraId, setSquadraId] = useState('');

  // Strutture Voti e Calcolo Live
  const [formazioneId, setFormazioneId] = useState(null);
  const [calciatoriList, setCalciatoriList] = useState([]);
  const [calcoloRisultato, setCalcoloRisultato] = useState({
    totaleSquadra: 0,
    sostituzioniEffettuate: 0,
    giocatoriConteggiati: []
  });

  // Caricamento Iniziale Filtri
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
        console.error(err);
      } finally {
        setLoadingSetup(false);
      }
    };
    fetchSetupVotiAdmin();
  }, []);

  // Recupero Dati Formazione ed Elementi Schierati per la combinazione Squadra/Giornata
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
        if (!formData) {
          return; // Nessuna formazione inserita da questa squadra per questo turno
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
        console.error("Errore recupero voti admin:", err);
      } finally {
        setLoadingDati(false);
      }
    };

    caricaDatiVotiAdmin();
  }, [giornataId, squadraId]);

  // Algoritmo di Ricalcolo Dinamico dei Subentri (Dal tuo InserisciVoti.jsx)
  useEffect(() => {
    if (calciatoriList.length === 0) return;

    const titolari = calciatoriList.filter(c => c.posizione <= 11);
    const panchina = calciatoriList.filter(c => c.posizione > 11);

    let sostituzioniEffettuate = 0;
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
        if (sostituzioniEffettuate < 4) {
          const sostituto = panchinaStato.find(p => 
            p.ruolo === t.ruolo && !p.utilizzato && !p.senzaVoto && !isNaN(parseFloat(p.voto_base))
          );
          if (sostituto) {
            sostituto.utilizzato = true;
            sostituzioniEffettuate++;
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
            voto_fanta: 0, dettaglio: 'Senza Voto / Riserve Esaurite'
          });
        }
      }
    });

    setCalcoloRisultato({ totaleSquadra, sostituzioniEffettuate, giocatoriConteggiati: conteggiati });
  }, [calciatoriList]);

  const handleInputChange = (idRelazione, campo, valore) => {
    setCalciatoriList(prev => prev.map(c => {
      if (c.id_relazione !== idRelazione) return c;
      const aggiornato = { ...c, [campo]: valore };
      if (campo === 'voto_base') aggiornato.senzaVoto = valore.trim() === '';
      const vBase = parseFloat(aggiornato.voto_base);
      const vBm = parseFloat(aggiornato.bonus_malus) || 0;
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

      const { error: upsertErr } = await supabase
        .from('formazioni_calciatori')
        .upsert(updates);

      if (upsertErr) throw upsertErr;

      const { error: formUpdateErr } = await supabase
        .from('formazioni')
        .update({ punteggio_totale: calcoloRisultato.totaleSquadra })
        .eq('id', formazioneId);

      if (formUpdateErr) throw formUpdateErr;

      alert("Voti rettificati e punteggio aggiornato con successo dall'Admin!");
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio autoritativo dei voti.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSetup) return <div className="voti-loading">Apertura Registro Voti Generale... ⏳</div>;

  const titolari = calciatoriList.filter(c => c.posizione <= 11);
  const panchina = calciatoriList.filter(c => c.posizione > 11);

  return (
    <div className="voti-page-container">
      <div className="voti-header" style={{ borderBottom: '3px solid #20bf6b', paddingBottom: '15px' }}>
        <h2>📊 Pannello Admin: Rettifica Voti & Calcolo Classifiche</h2>
        <p style={{ color: '#20bf6b', fontWeight: 'bold' }}>✓ Permette di editare a consuntivo i voti e aggiornare istantaneamente i tabellini totali.</p>
      </div>

      {/* FILTRI DI SELEZIONE SQUADRA / GIORNATA */}
      <div style={{ display: 'flex', gap: '15px', background: '#2f3542', padding: '15px', borderRadius: '8px', margin: '15px 0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Seleziona Turno:</label>
          <select value={giornataId} onChange={(e) => setGiornataId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px' }}>
            {giornate.map(g => (
              <option key={g.id} value={g.id}>Giornata {g.numero_giornata} ({g.stato})</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#fff' }}>Seleziona Formazione Squadra:</label>
          <select value={squadraId} onChange={(e) => setSquadraId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px' }}>
            {squadre.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingDati ? (
        <div className="voti-loading">Recupero dati dal database... ⏳</div>
      ) : !formazioneId ? (
        <div style={{ padding: '30px', background: '#ffeaa7', borderRadius: '8px', color: '#d35400', fontWeight: 'bold', textAlign: 'center', marginTop: '20px' }}>
          🚨 ATTENZIONE: La squadra selezionata non ha inserito nessuna formazione per questo turno. Non è possibile inserire voti.
        </div>
      ) : (
        <div className="voti-main-layout">
          <div className="voti-inputs-column">
            <div className="voti-section-card">
              <h3>Titolari d'Ufficio</h3>
              <div className="voti-table-header">
                <span className="col-player">Calciatore</span>
                <span className="col-sv">S.V.</span>
                <span className="col-voto">Voto</span>
                <span className="col-bm">B/M</span>
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
              <h3>Riserve in Panchina</h3>
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
            <div className="summary-sticky-card" style={{ borderTop: '4px solid #20bf6b' }}>
              <h3>Ricalcolo d'Autorità</h3>
              <div className="score-main-display">
                <span className="score-label">TOTALE SQUADRA</span>
                <span className="score-number-value" style={{ color: '#20bf6b' }}>{calcoloRisultato.totaleSquadra.toFixed(1)}</span>
              </div>
              <div className="substitution-counter-row">
                <span>Sostituzioni applicate:</span>
                <span className="sub-count-badge active">
                  {calcoloRisultato.sostituzioniEffettuate} / 4
                </span>
              </div>
              <button className="btn-salva-voti-complessivo" onClick={handleSalvaRettificaVotiAdmin} disabled={saving} style={{ background: '#20bf6b' }}>
                {saving ? 'Modifica in corso...' : '⚡ Consolida Voti Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModificaVoti;