import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react'; // <-- IMPORTANTE: serve per identificare l'admin
import { supabase } from '../../supabaseClient';
import './GestoreGiornata.css';

const GestoreGiornata = () => {
  const { user } = useUser(); // Utente Clerk corrente
  const [giornate, setGiornate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [adminLegaId, setAdminLegaId] = useState(null); // <-- Stato per salvare la lega dell'admin
  
  // Campi form per inserimento/modifica - Stato iniziale rigorosamente in minuscolo
  const [numeroGiornata, setNumeroGiornata] = useState('');
  const [scadenzaFormazione, setScadenzaFormazione] = useState('');
  const [scadenzaVoti, setScadenzaVoti] = useState('');
  const [stato, setStato] = useState('in programma');

  // 1. Recupera i dati dell'admin (in particolare la sua lega_id)
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('utenti')
          .select('lega_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data?.lega_id) {
          setAdminLegaId(data.lega_id);
          // Una volta ottenuta la lega, carichiamo le giornate filtrate per quella lega
          fetchGiornate(data.lega_id);
        } else {
          alert("Attenzione: non risulti associato a nessuna lega come amministratore.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Errore recupero info admin:", err);
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [user]);

  // 2. Legge le giornate filtrate per la lega dell'utente
  const fetchGiornate = async (legaId) => {
    const targetLega = legaId || adminLegaId;
    if (!targetLega) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('giornate')
        .select('*')
        .eq('lega_id', targetLega) // <-- IMPORTANTE: vedi solo i turni della tua lega
        .order('numero_giornata', { ascending: true });

      if (error) throw error;
      setGiornate(data || []);
    } catch (err) {
      console.error("Errore lettura giornate:", err);
      alert("Impossibile caricare le giornate di gioco.");
    } finally {
      setLoading(false);
    }
  };

  const formatDataPerInput = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleEditClick = (g) => {
    setEditingId(g.id);
    setNumeroGiornata(g.numero_giornata);
    setScadenzaFormazione(formatDataPerInput(g.scadenza_formazione));
    setScadenzaVoti(formatDataPerInput(g.scadenza_voti));
    setStato(g.stato || 'in programma');
  };

  const resetForm = () => {
    setEditingId(null);
    setNumeroGiornata('');
    setScadenzaFormazione('');
    setScadenzaVoti('');
    setStato('in programma');
  };

  const handleSalvaGiornata = async (e) => {
    e.preventDefault();
    
    if (!adminLegaId) {
      alert("Errore: Mancano le informazioni sulla tua lega di appartenenza.");
      return;
    }

    if (!numeroGiornata || !scadenzaFormazione || !scadenzaVoti) {
      alert("Compila tutti i campi obbligatori.");
      return;
    }

    // Costruiamo il payload includendo dinamicamente la lega_id dell'admin
    const payload = {
      numero_giornata: parseInt(numeroGiornata, 10),
      scadenza_formazione: new Date(scadenzaFormazione).toISOString(),
      scadenza_voti: new Date(scadenzaVoti).toISOString(),
      stato: stato,
      lega_id: adminLegaId // <-- RISOLVE L'ERRORE DI COSTRUTTO NOT-NULL
    };

    try {
      if (editingId) {
        // Rimuoviamo lega_id dal payload in fase di update per sicurezza (non cambia)
        const { lega_id, ...updatePayload } = payload;

        const { error } = await supabase
          .from('giornate')
          .update(updatePayload)
          .eq('id', editingId);
        if (error) throw error;
        alert("Giornata aggiornata con successo.");
      } else {
        const { error } = await supabase
          .from('giornate')
          .insert([payload]);
        if (error) throw error;
        alert("Nuova giornata inserita nel calendario.");
      }
      resetForm();
      fetchGiornate(adminLegaId);
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio dei dati.");
    }
  };

  if (loading) return <div className="admin-giornate-loading">Caricamento calendario di controllo... ⏳</div>;

  return (
    <div className="gestore-giornate-page">
      <div className="admin-giornate-header">
        <h2>👑 Configurazione Turni & Scadenze</h2>
        <p>Pannello di controllo del calendario per impostare blocchi formazioni e stati della giornata</p>
      </div>

      <div className="admin-giornate-workspace">
        <form className="giornata-form-card" onSubmit={handleSalvaGiornata}>
          <h3>{editingId ? '📝 Modifica Turno' : '➕ Crea Nuova Giornata'}</h3>
          
          <div className="form-input-group">
            <label>Numero Giornata / Turno:</label>
            <input 
              type="number" 
              value={numeroGiornata} 
              onChange={(e) => setNumeroGiornata(e.target.value)}
              placeholder="Es. 1"
            />
          </div>

          <div className="form-input-group">
            <label>Scadenza Consegna Formazioni:</label>
            <input 
              type="datetime-local" 
              value={scadenzaFormazione} 
              onChange={(e) => setScadenzaFormazione(e.target.value)}
            />
          </div>

          <div className="form-input-group">
            <label>Scadenza Inserimento Voti Admin:</label>
            <input 
              type="datetime-local" 
              value={scadenzaVoti} 
              onChange={(e) => setScadenzaVoti(e.target.value)}
            />
          </div>

          <div className="form-input-group">
            <label>Stato del Turno:</label>
            <select value={stato} onChange={(e) => setStato(e.target.value)}>
              <option value="in programma">In programma</option>
              <option value="in corso">In corso</option>
              <option value="fase calcolo">Fase calcolo</option>
              <option value="conclusa">Conclusa</option>
            </select>
          </div>

          <div className="form-actions-row">
            <button type="submit" className="btn-submit-giornata">
              {editingId ? 'Salva Modifiche' : 'Crea Giornata'}
            </button>
            {editingId && (
              <button type="button" className="btn-cancel-giornata" onClick={resetForm}>
                Annulla
              </button>
            )}
          </div>
        </form>

        <div className="giornate-list-section">
          <h3>Turni Configurati</h3>
          <div className="giornate-table-responsive">
            <table className="giornate-admin-table">
              <thead>
                <tr>
                  <th>Turno</th>
                  <th>Scadenza Formazione</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {giornate.map(g => (
                  <tr key={g.id} className={`row-stato-${g.stato?.replace(/\s+/g, '-').toLowerCase()}`}>
                    <td className="txt-bold">Giornata {g.numero_giornata}</td>
                    <td>{new Date(g.scadenza_formazione).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <span className={`badge-stato-turno ${g.stato?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {g.stato === 'fase calcolo' ? 'fase calcolo' : g.stato}
                      </span>
                    </td>
                    <td>
                      <button className="btn-table-edit" onClick={() => handleEditClick(g)}>✏️ Modifica</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestoreGiornata;