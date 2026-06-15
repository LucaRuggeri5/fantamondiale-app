import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useUser } from '@clerk/clerk-react'; 
import { supabase } from '../../supabaseClient'; 
import './GestoreGiornata.css';

// --- INNESTO NOTIFICHE: IMPORTIAMO L'HOOK PERSONALIZZATO DAL CONTEXT ---
import { useNotification } from '../../context/NotificationContext';

const GestoreGiornata = () => {
  const { user } = useUser(); 
  const navigate = useNavigate(); 
  const [giornate, setGiornate] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [editingId, setEditingId] = useState(null); 
  const [adminLegaId, setAdminLegaId] = useState(null); 

  // --- INNESTO NOTIFICHE: RECUPERIAMO LE FUNZIONI CENTRALIZZATE ---
  const { showToast, showConfirm } = useNotification();

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
          // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST WARNING ---
          showToast("Attenzione: non risulti associato a nessuna lega come amministratore.", "warning");
          setLoading(false);
        }
      } catch (err) {
        console.error("Errore recupero info admin:", err);
        showToast("Errore nel recupero delle credenziali della lega.", "error");
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
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST ERROR ---
      showToast("Impossibile caricare le giornate di gioco.", "error");
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

  // --- MODIFICA NOTIFICHE: ADESSO USA IL MODALE ASINCRONO CONTESTUALE ---
  const apriConfermaElimina = (giornataId, numero) => {
    showConfirm(
      "Elimina Giornata",
      `Stai per eliminare definitivamente la Giornata ${numero} dal calendario. Questa azione rimuoverà tutte le scadenze impostate per questo turno.`,
      async () => {
        try {
          const { error } = await supabase
            .from('giornate')
            .delete()
            .eq('id', giornataId);

          if (error) throw error;

          showToast(`Giornata ${numero} eliminata con successo.`, "success");
          
          if (editingId === giornataId) {
            resetForm();
          }
          
          fetchGiornate(adminLegaId); 
        } catch (err) {
          console.error("Errore durante l'eliminazione della giornata:", err);
          showToast("Impossibile eliminare la giornata. Verifica se ci sono dati o classifiche collegate.", "error");
        }
      }
    );
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
      showToast("Errore: Mancano le informazioni sulla tua lega di appartenenza.", "error");
      return;
    }

    if (!numeroGiornata || !aperturaFormazioni || !scadenzaFormazione || !scadenzaVoti) {
      showToast("Compila tutti i campi obbligatori del form.", "warning");
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
        showToast(`Giornata ${numeroGiornata} aggiornata con successo.`, "success");
      } else {
        const { error } = await supabase
          .from('giornate')
          .insert([payload]);
        if (error) throw error;
        showToast(`Nuova giornata inserita nel calendario (Turno ${numeroGiornata}).`, "success");
      }
      resetForm();
      fetchGiornate(adminLegaId); 
    } catch (err) {
      console.error(err);
      showToast("Errore durante il salvataggio dei dati su database.", "error");
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

  if (loading) return <div className="tactical-loading">Caricamento calendario di controllo... ⏳</div>;

  return (
    <div className="tactical-app-container tactical-giornate-page">
      <div className="tactical-giornate-header">
        <div className="tactical-header-title-container">
          <button className="tactical-btn-back" onClick={() => navigate('/dashboard')}>
            ⬅️ Indietro
          </button>
          <h2 className="tactical-brand">Configurazione Giornate</h2>
        </div>
        <p className="tactical-subtitle">Pannello di controllo del calendario per impostare blocchi formazioni e stati della giornata</p>
      </div>

      <div className="tactical-giornate-workspace">
        {/* Form di Inserimento / Modifica */}
        <form className="tactical-form-card" onSubmit={handleSalvaGiornata}>
          <h3 className="tactical-card-title">{editingId ? '📝 Modifica Turno' : '➕ Crea Nuova Giornata'}</h3>
          
          <div className="tactical-input-group">
            <label>Numero Giornata:</label>
            <input 
              type="number" 
              value={numeroGiornata} 
              onChange={(e) => setNumeroGiornata(e.target.value)}
              placeholder="Es. 1"
              min="1"
            />
          </div>

          <div className="tactical-input-group">
            <label>Inserimento Formazioni:</label>
            <input 
              type="datetime-local" 
              value={aperturaFormazioni} 
              onChange={(e) => setAperturaFormazioni(e.target.value)}
            />
          </div>

          <div className="tactical-input-group">
            <label>Consegna Formazioni:</label>
            <input 
              type="datetime-local" 
              value={scadenzaFormazione} 
              onChange={(e) => setScadenzaFormazione(e.target.value)}
            />
          </div>

          <div className="tactical-input-group">
            <label>Inserimento Voti:</label>
            <input 
              type="datetime-local" 
              value={scadenzaVoti} 
              onChange={(e) => setScadenzaVoti(e.target.value)}
            />
          </div>

          <div className="tactical-form-actions">
            <button type="submit" className="tactical-btn tactical-btn-primary">
              {editingId ? 'Salva Modifiche' : 'Crea Giornata'}
            </button>
            {editingId && (
              <button type="button" className="tactical-btn tactical-btn-secondary" onClick={resetForm}>
                Annulla
              </button>
            )}
          </div>
        </form>

        {/* Griglia delle Card dei Turni */}
        <div className="tactical-list-section">
          <h3 className="tactical-section-title">Turni Configurati</h3>
          
          {giornate.length === 0 ? (
            <div className="tactical-no-data-box">
              Nessuna giornata presente. Creane una usando il form laterale.
            </div>
          ) : (
            <div className="tactical-cards-grid">
              {giornate.map(g => {
                const statoReale = calcolaStatoInTempoReale(g);
                return (
                  <div key={g.id} className={`tactical-status-card border-stato-${statoReale.replace(' ', '-')}`}>
                    
                    <div className="tactical-status-card-header">
                      <span className="tactical-status-card-title">Giornata {g.numero_giornata}</span>
                      <span className={`tactical-timer-badge stato-${statoReale.replace(' ', '-')}`}>
                        {statoReale}
                      </span>
                    </div>

                    <div className="tactical-status-card-body">
                      <div className="tactical-data-row">
                        <span className="tactical-data-label">Inizio Formazioni:</span>
                        <span className="tactical-data-value">{formattaDataLeggibile(g.apertura_formazioni)}</span>
                      </div>
                      <div className="tactical-data-row">
                        <span className="tactical-data-label">Blocco Consegna:</span>
                        <span className="tactical-data-value">{formattaDataLeggibile(g.scadenza_formazione)}</span>
                      </div>
                      <div className="tactical-data-row">
                        <span className="tactical-data-label">Scadenza Voti:</span>
                        <span className="tactical-data-value">{formattaDataLeggibile(g.scadenza_voti)}</span>
                      </div>
                    </div>

                    <div className="tactical-status-card-actions">
                      <button 
                        type="button" 
                        className="tactical-action-btn edit" 
                        onClick={() => handleEditClick(g)}
                      >
                      Modifica
                      </button>
                      <button 
                        type="button" 
                        className="tactical-action-btn delete" 
                        onClick={() => apriConfermaElimina(g.id, g.numero_giornata)}
                      >
                      Elimina
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestoreGiornata;