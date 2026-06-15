import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Gestisce lo spostamento tra le pagine
import { supabase } from '../../supabaseClient'; // Connessione diretta a Supabase
import { useUser } from '@clerk/clerk-react'; // Hook per recuperare l'utente attivo da Clerk
import './AssegnaPermessi.css';

// --- INNESTO NOTIFICHE: IMPORTIAMO L'HOOK PERSONALIZZATO DAL CONTEXT ---
import { useNotification } from '../../context/NotificationContext';

const AssegnaPermessi = () => {
  const { user } = useUser(); // Estraiamo l'utente corrente autenticato da Clerk
  const navigate = useNavigate(); // Inizializziamo la navigazione di React Router
  const [loading, setLoading] = useState(true); // Stato per gestire la schermata di caricamento
  const [utentiLega, setUtentiLega] = useState([]); // Array contenente tutti i membri della lega
  const [adminContext, setAdminContext] = useState(null); // Contesto dell'admin corrente estratto dal DB

  // --- INNESTO NOTIFICHE: ESTRAIAMO LE FUNZIONI DI FEEDBACK DAL NOSTRO CONTEXT ---
  const { showToast, showConfirm } = useNotification();

  // Funzione per caricare le informazioni dal database
  const loadUtentiData = async () => {
    try {
      setLoading(true); // Attiva lo stato di caricamento grafico
      if (!user) return; // Se l'utente non è ancora pronto su Clerk, esce

      // 1. Recuperiamo i dettagli dell'utente admin corrente nel nostro database
      const { data: currentAdmin, error: aErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (aErr) throw aErr; // Se c'è un errore nel recupero dell'admin, lancia l'eccezione
      setAdminContext(currentAdmin); // Salva l'utente loggato nello stato locale

      // 2. Se l'admin appartiene a una lega, carichiamo tutti i membri di quella lega
      if (currentAdmin.lega_id) {
        const { data: iscritti, error: iErr } = await supabase
          .from('utenti')
          .select('*')
          .eq('lega_id', currentAdmin.lega_id)
          .order('nome_utente', { ascending: true }); // Ordine alfabetico dei membri
        
        if (iErr) throw iErr; // Se c'è un errore nel recupero degli iscritti, lancia l'eccezione
        setUtentiLega(iscritti || []); // Salva la lista dei membri nello stato locale
      }
    } catch (err) {
      console.error("Errore caricamento utenti permessi:", err);
      // --- MODIFICA NOTIFICHE: TOAST DI ERRORE IN CASO DI PROBLEMI CON IL DATABASE ---
      showToast("Impossibile caricare l'elenco dei permessi.", "error");
    } finally {
      setLoading(false); // Spegne la schermata di caricamento in ogni caso
    }
  };

  // Esegue il caricamento ogni volta che l'utente Clerk cambia o viene rilevato
  useEffect(() => {
    loadUtentiData();
  }, [user]);

  // Funzione per invertire il ruolo (Admin <-> Player)
  const toggleRuoloUtente = (utenteId, nomeUtente, ruoloAttuale) => {
    // Controllo di sicurezza fondamentale: evita l'autodeclassamento del creatore/admin
    if (utenteId === adminContext?.id) {
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT CON UN TOAST DI WARNING DEL DESIGN SYSTEM ---
      showToast("Non puoi revocare i permessi di amministrazione a te stesso!", "warning");
      return;
    }

    // Calcoliamo il nuovo valore in base a quello precedente
    const nuovoRuolo = ruoloAttuale === 'admin' ? 'player' : 'admin';
    const etichettaRuolo = nuovoRuolo === 'admin' ? 'AMMINISTRATORE' : 'PLAYER';

    // --- MODIFICA NOTIFICHE: UTILIZZO DI SHOWCONFIRM AL POSTO DI WINDOW.CONFIRM ---
    showConfirm(
      "Modifica Privilegi", // Titolo del modale
      `Vuoi davvero cambiare il ruolo di "${nomeUtente}" in ${etichettaRuolo}?`, // Messaggio descrittivo
      async () => {
        // Questa callback asincrona viene eseguita solo se l'utente clicca sul tasto di conferma nel modale
        try {
          // Aggiorniamo la riga specifica dell'utente su Supabase
          const { error } = await supabase
            .from('utenti')
            .update({ ruolo: nuovoRuolo })
            .eq('id', utenteId);

          if (error) throw error; // Se l'aggiornamento fallisce, lancia l'errore
          
          // Modifichiamo lo stato locale in modo ottimistico per riflettere il cambio senza ricaricare la pagina
          setUtentiLega(prev => prev.map(u => u.id === utenteId ? { ...u, ruolo: nuovoRuolo } : u));
          
          // --- MODIFICA NOTIFICHE: TOAST DI SUCCESS AD OPERAZIONE COMPLETATA CON SUCCESSO ---
          showToast(`Ruolo di ${nomeUtente} aggiornato a ${etichettaRuolo}!`, "success");
        } catch (err) {
          console.error("Errore durante l'aggiornamento dei ruoli:", err);
          // --- MODIFICA NOTIFICHE: TOAST DI ERRORE IN CASO DI FALLIMENTO QUERY ---
          showToast("Impossibile aggiornare i privilegi dell'utente su database.", "error");
        }
      }
    );
  };

  // Schermata di caricamento iniziale stilizzata
  if (loading) {
    return <div className="tactical-permessi-loading">Caricamento elenco privilegi... 👑</div>;
  }

  return (
    <div className="tactical-app-container tactical-permessi-page">
      {/* Blocco Intestazione */}
      <div className="tactical-permessi-header">
        <div className="tactical-permessi-title-wrapper">
          <button className="tactical-btn-back" onClick={() => navigate('/dashboard')}>
            ⬅️ Indietro
          </button>
          <h2 className="tactical-brand">Assegna Permessi Admin</h2>
        </div>
        <p className="tactical-permessi-subtitle">
          Promuovi i partecipanti ad Amministratori della lega o revoca i loro accessi di controllo.
        </p>
      </div>

      {/* Lista Utenti */}
      <div className="tactical-permessi-list">
        {utentiLega.map((ut) => (
          <div key={ut.id} className="tactical-permessi-card">
            
            {/* Informazioni Utente */}
            <div className="tactical-ut-info">
              <span className="tactical-ut-avatar">👤</span>
              <div className="tactical-ut-meta">
                <h4>{ut.nome_utente}</h4>
                <p>{ut.email}</p>
              </div>
            </div>
            
            {/* Azioni e Badge */}
            <div className="tactical-ut-action">
              <span className={`tactical-badge-status ${ut.ruolo}`}>
                {ut.ruolo === 'admin' ? '👑 Admin' : '🛡️ Player'}
              </span>
              
              <button 
                className={`tactical-btn-toggle-role ${ut.ruolo === 'admin' ? 'demote' : 'promote'}`}
                // Passiamo anche ut.nome_utente alla funzione per rendere il messaggio del modale dinamico
                onClick={() => toggleRuoloUtente(ut.id, ut.nome_utente, ut.ruolo)}
                disabled={ut.id === adminContext?.id} // Pulsante disabilitato se l'utente corrisponde a se stessi
              >
                {ut.ruolo === 'admin' ? 'Declassa' : 'Promuovi'}
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default AssegnaPermessi;