import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useUser } from '@clerk/clerk-react'; 
import { supabase } from '../../supabaseClient'; 
import './GestoreGiornata.css';

const GestoreGiornata = () => {
  const { user } = useUser(); 
  const navigate = useNavigate(); 
  const [giornate, setGiornate] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [editingId, setEditingId] = useState(null); 
  const [adminLegaId, setAdminLegaId] = useState(null); 
  
  // STATO PER L'ALERT PERSONALIZZATO
  // Se è null, l'alert è chiuso. Se contiene un oggetto { id, numero }, l'alert si apre per quel turno.
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Campi del form per l'inserimento o la modifica di una giornata
  const [numeroGiornata, setNumeroGiornata] = useState('');
  const [aperturaFormazioni, setAperturaFormazioni] = useState(''); 
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

  // Funzione helper per calcolare lo stato temporale in tempo reale
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

  // Converte il formato ISO di Supabase nel formato richiesto dagli input datetime-local
  const formatDataPerInput = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Attiva la modalità di modifica caricando i dati esistenti
  const handleEditClick = (g) => {
    setEditingId(g.id);
    setNumeroGiornata(g.numero_giornata);
    setAperturaFormazioni(formatDataPerInput(g.apertura_formazioni)); 
    setScadenzaFormazione(formatDataPerInput(g.scadenza_formazione));
    setScadenzaVoti(formatDataPerInput(g.scadenza_voti));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Questa funzione apre l'alert personalizzato salvando i dati del turno da eliminare
  const apriConfermaElimina = (giornataId, numero) => {
    setDeleteTarget({ id: giornataId, numero: numero });
  };

  // Funzione che esegue la cancellazione effettiva su Supabase
  const handleEliminaEffettiva = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase
        .from('giornate')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      alert(`Giornata ${deleteTarget.numero} eliminata con successo.`);
      
      if (editingId === deleteTarget.id) {
        resetForm();
      }
      
      setDeleteTarget(null); // Chiude l'alert personalizzato ripristinando lo stato a null
      fetchGiornate(adminLegaId); 
    } catch (err) {
      console.error("Errore durante l'eliminazione della giornata:", err);
      alert("Impossibile eliminare la giornata. Verifica se ci sono dati collegati.");
      setDeleteTarget(null);
    }
  };

  // Svuota tutti i campi del form
  const resetForm = () => {
    setEditingId(null);
    setNumeroGiornata('');
    setAperturaFormazioni(''); 
    setScadenzaFormazione('');
    setScadenzaVoti('');
  };

  // Gestore del salvataggio dei dati (insert o update)
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

    const payload = {
      numero_giornata: parseInt(numeroGiornata, 10),
      apertura_formazioni: new Date(aperturaFormazioni).toISOString(), 
      scadenza_formazione: new Date(scadenzaFormazione).toISOString(),
      scadenza_voti: new Date(scadenzaVoti).toISOString(),
      lega_id: adminLegaId 
    };

    try {
      if (editingId) {
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

  const formattaDataLeggibile = (isoString) => {
    return new Date(isoString).toLocaleString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
              min="1"
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

        {/* Griglia delle Card dei Turni */}
        <div className="giornate-list-section">
          <h3>Turni Configurati</h3>
          
          {giornate.length === 0 ? (
            <div className="no-giornate-box">
              Nessuna giornata presente. Creane una usando il form laterale.
            </div>
          ) : (
            <div className="giornate-cards-grid">
              {giornate.map(g => {
                const statoReale = calcolaStatoInTempoReale(g);
                return (
                  <div key={g.id} className={`giornata-status-card border-stato-${statoReale.replace(' ', '-')}`}>
                    
                    <div className="giornata-card-header">
                      <span className="giornata-card-title">Giornata {g.numero_giornata}</span>
                      <span className={`badge-stato-turno ${statoReale.replace(' ', '-')}`}>
                        {statoReale}
                      </span>
                    </div>

                    <div className="giornata-card-body">
                      <div className="data-row">
                        <span className="data-label">🟢 Apertura Formazioni:</span>
                        <span className="data-value">{formattaDataLeggibile(g.apertura_formazioni)}</span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">🔴 Blocco Consegna:</span>
                        <span className="data-value">{formattaDataLeggibile(g.scadenza_formazione)}</span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">👑 Scadenza Voti Admin:</span>
                        <span className="data-value">{formattaDataLeggibile(g.scadenza_voti)}</span>
                      </div>
                    </div>

                    <div className="giornata-card-actions">
                      <button 
                        type="button" 
                        className="btn-card-edit" 
                        onClick={() => handleEditClick(g)}
                      >
                        ✏️ Modifica
                      </button>
                      <button 
                        type="button" 
                        className="btn-card-delete" 
                        onClick={() => apriConfermaElimina(g.id, g.numero_giornata)}
                      >
                        🗑️ Elimina
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RENDER DELL'ALERT DI ELIMINAZIONE PERSONALIZZATO (MODAL) */}
      {deleteTarget && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-modal">
            <div className="custom-alert-icon">⚠️</div>
            <h4 className="custom-alert-title">Sei assolutamente sicuro?</h4>
            <p className="custom-alert-text">
              Stai per eliminare definitivamente la <strong>Giornata {deleteTarget.numero}</strong> dal calendario di gioco del FantaMondiale.
            </p>
            <p className="custom-alert-warning">
              Questa azione è irreversibile e rimuoverà tutte le scadenze impostate per questo turno.
            </p>
            <div className="custom-alert-actions">
              <button 
                type="button" 
                className="btn-alert-cancel" 
                onClick={() => setDeleteTarget(null)}
              >
                No, Annulla
              </button>
              <button 
                type="button" 
                className="btn-alert-confirm" 
                onClick={handleEliminaEffettiva}
              >
                Sì, Elimina Turno
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestoreGiornata;