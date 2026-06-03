import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Importato per gestire il ritorno
import { useUser } from '@clerk/clerk-react'; // Importiamo il controllo utente di Clerk
import { supabase } from '../../supabaseClient'; // Connessione client Supabase
import './GestoreGiornata.css';

const GestoreGiornata = () => {
  const { user } = useUser(); // Otteniamo l'utente Clerk corrente
  const navigate = useNavigate(); // Inizializzazione dell'hook di navigazione
  const [giornate, setGiornate] = useState([]); // Elenco di tutte le giornate
  const [loading, setLoading] = useState(true); // Stato di caricamento iniziale
  const [editingId, setEditingId] = useState(null); // ID della giornata che stiamo modificando (se applicabile)
  const [adminLegaId, setAdminLegaId] = useState(null); // ID della lega gestita da questo admin
  
  // Campi del form per l'inserimento o la modifica di una giornata
  const [numeroGiornata, setNumeroGiornata] = useState('');
  const [aperturaFormazioni, setAperturaFormazioni] = useState(''); // Gestisce l'inizio inserimento
  const [scadenzaFormazione, setScadenzaFormazione] = useState('');
  const [scadenzaVoti, setScadenzaVoti] = useState('');

  // Effetto iniziale per recuperare la lega dell'admin corrente
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
          fetchGiornate(data.lega_id); // Carichiamo le giornate associate a questa lega
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

  // Funzione per leggere i turni dal database filtrandoli per lega
  const fetchGiornate = async (legaId) => {
    const targetLega = legaId || adminLegaId;
    if (!targetLega) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('giornate')
        .select('*')
        .eq('lega_id', targetLega)
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

  // Funzione helper per calcolare lo stato temporale in tempo reale (per visualizzazione tabellare)
  const calcolaStatoInTempoReale = (g) => {
    const adesso = new Date();
    const inizioFormazioni = new Date(g.apertura_formazioni);
    const fineFormazioni = new Date(g.scadenza_formazione);
    const fineVoti = new Date(g.scadenza_voti);

    if (adesso < inizioFormazioni) return 'in programma';
    if (adesso >= inizioFormazioni && adesso < fineFormazioni) return 'in corso';
    if (adesso >= fineFormazioni && adesso < fineVoti) return 'fase calcolo';
    return 'conclusa';
  };

  // Funzione per convertire il formato ISO di Supabase nel formato richiesto dagli input datetime-local
  const formatDataPerInput = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000; // Calcolo dell'offset del fuso orario locale
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Attiva la modalità di modifica caricando i dati esistenti nei rispettivi stati del form
  const handleEditClick = (g) => {
    setEditingId(g.id);
    setNumeroGiornata(g.numero_giornata);
    setAperturaFormazioni(formatDataPerInput(g.apertura_formazioni)); // Impostiamo la nuova data nel form
    setScadenzaFormazione(formatDataPerInput(g.scadenza_formazione));
    setScadenzaVoti(formatDataPerInput(g.scadenza_voti));
  };

  // Svuota tutti i campi del form ripristinando lo stato di creazione
  const resetForm = () => {
    setEditingId(null);
    setNumeroGiornata('');
    setAperturaFormazioni(''); // Resettiamo il campo
    setScadenzaFormazione('');
    setScadenzaVoti('');
  };

  // Gestore del salvataggio dei dati (sia per insert che per update)
  const handleSalvaGiornata = async (e) => {
    e.preventDefault();
    
    if (!adminLegaId) {
      alert("Errore: Mancano le informazioni sulla tua lega di appartenenza.");
      return;
    }

    if (!numeroGiornata || !aperturaFormazioni || !scadenzaFormazione || !scadenzaVoti) {
      alert("Compila tutti i campi obbligatori.");
      return;
    }

    // Costruiamo l'oggetto payload convertendo le date locali in stringhe ISO UTC globali
    const payload = {
      numero_giornata: parseInt(numeroGiornata, 10),
      apertura_formazioni: new Date(aperturaFormazioni).toISOString(), // Inviamo la nuova colonna
      scadenza_formazione: new Date(scadenzaFormazione).toISOString(),
      scadenza_voti: new Date(scadenzaVoti).toISOString(),
      lega_id: adminLegaId 
    };

    try {
      if (editingId) {
        // In fase di update escludiamo la lega_id per sicurezza
        const { lega_id, ...updatePayload } = payload;

        const { error } = await supabase
          .from('giornate')
          .update(updatePayload)
          .eq('id', editingId);
        if (error) throw error;
        alert("Giornata aggiornata con successo.");
      } else {
        // Creazione di un nuovo record di giornata
        const { error } = await supabase
          .from('giornate')
          .insert([payload]);
        if (error) throw error;
        alert("Nuova giornata inserita nel calendario.");
      }
      resetForm();
      fetchGiornate(adminLegaId); // Aggiorniamo la lista a schermo
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio dei dati.");
    }
  };

  if (loading) return <div className="admin-giornate-loading">Caricamento calendario di controllo... ⏳</div>;

  return (
    <div className="gestore-giornate-page">
      <div className="admin-giornate-header">
        <div className="admin-giornate-header-title-container">
          <button className="btn-back-giornate" onClick={() => navigate('/dashboard')}>
            ⬅️ Indietro
          </button>
          <h2>👑 Configurazione Turni & Scadenze</h2>
        </div>
        <p>Pannello di controllo del calendario per impostare blocchi formazioni e stati della giornata</p>
      </div>

      <div className="admin-giornate-workspace">
        {/* Form di Inserimento / Modifica */}
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
            <label>Inizio / Apertura Inserimento Formazioni:</label>
            <input 
              type="datetime-local" 
              value={aperturaFormazioni} 
              onChange={(e) => setAperturaFormazioni(e.target.value)}
            />
          </div>

          <div className="form-input-group">
            <label>Scadenza / Blocco Consegna Formazioni:</label>
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

        {/* Tabella riassuntiva dei turni configurati */}
        <div className="giornate-list-section">
          <h3>Turni Configurati</h3>
          <div className="giornate-table-responsive">
            <table className="giornate-admin-table">
              <thead>
                <tr>
                  <th>Turno</th>
                  <th>Apertura Formazioni</th>
                  <th>Scadenza Formazione</th>
                  <th>Stato Reale</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {giornate.map(g => {
                  const statoReale = calcolaStatoInTempoReale(g);
                  return (
                    <tr key={g.id} className={`row-stato-${statoReale}`}>
                      <td className="txt-bold">Giornata {g.numero_giornata}</td>
                      <td>{new Date(g.apertura_formazioni).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{new Date(g.scadenza_formazione).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className={`badge-stato-turno ${statoReale.replace(' ', '-')}`}>
                          {statoReale}
                        </span>
                      </td>
                      <td>
                        <button className="btn-table-edit" onClick={() => handleEditClick(g)}>✏️ Modifica</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestoreGiornata;