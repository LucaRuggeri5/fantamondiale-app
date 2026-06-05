import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Gestisce lo spostamento tra le pagine
import { supabase } from '../../supabaseClient'; // Connessione diretta a Supabase
import { useUser } from '@clerk/clerk-react'; // Hook per recuperare l'utente attivo da Clerk
import './AssegnaPermessi.css';

const AssegnaPermessi = () => {
  const { user } = useUser(); // Estraiamo l'utente corrente autenticato
  const navigate = useNavigate(); // Inizializziamo la navigazione
  const [loading, setLoading] = useState(true); // Stato per la schermata di caricamento
  const [utentiLega, setUtentiLega] = useState([]); // Array contenente tutti i membri della lega
  const [adminContext, setAdminContext] = useState(null); // Contesto dell'admin corrente estratto dal DB

  // Funzione per caricare le informazioni dal database
  const loadUtentiData = async () => {
    try {
      setLoading(true);
      if (!user) return; // Se l'utente non è ancora caricato da Clerk, esce

      // 1. Recuperiamo i dettagli dell'utente admin corrente nel nostro database
      const { data: currentAdmin, error: aErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (aErr) throw aErr;
      setAdminContext(currentAdmin); // Salva l'utente loggato nello stato

      // 2. Se l'admin appartiene a una lega, carichiamo tutti i membri di quella lega
      if (currentAdmin.lega_id) {
        const { data: iscritti, error: iErr } = await supabase
          .from('utenti')
          .select('*')
          .eq('lega_id', currentAdmin.lega_id)
          .order('nome_utente', { ascending: true }); // Ordine alfabetico dei membri
        
        if (iErr) throw iErr;
        setUtentiLega(iscritti || []); // Salva la lista dei membri nello stato
      }
    } catch (err) {
      console.error("Errore caricamento utenti permessi:", err);
    } finally {
      setLoading(false); // Spegne il caricamento
    }
  };

  // Esegue il caricamento ogni volta che l'utente Clerk cambia o viene rilevato
  useEffect(() => {
    loadUtentiData();
  }, [user]);

  // Funzione per invertire il ruolo (Admin <-> Player)
  const toggleRuoloUtente = async (utenteId, ruoloAttuale) => {
    // Controllo di sicurezza fondamentale: evita l'autodeclassamento
    if (utenteId === adminContext.id) {
      alert("Non puoi revocare i permessi di amministrazione a te stesso!");
      return;
    }

    // Calcoliamo il nuovo valore in base a quello precedente
    const nuovoRuolo = ruoloAttuale === 'admin' ? 'player' : 'admin';
    const conferma = window.confirm(`Vuoi davvero cambiare il ruolo di questo utente in ${nuovoRuolo.toUpperCase()}?`);
    if (!conferma) return; // Se l'admin annulla il prompt, interrompiamo l'azione

    try {
      // Aggiorniamo la riga specifica su Supabase
      const { error } = await supabase
        .from('utenti')
        .update({ ruolo: nuovoRuolo })
        .eq('id', utenteId);

      if (error) throw error;
      
      // Modifichiamo lo stato locale in modo ottimistico per riflettere il cambio
      setUtentiLega(prev => prev.map(u => u.id === utenteId ? { ...u, ruolo: nuovoRuolo } : u));
    } catch (err) {
      console.error(err);
      alert("Impossibile aggiornare i privilegi dell'utente.");
    }
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
                onClick={() => toggleRuoloUtente(ut.id, ut.ruolo)}
                disabled={ut.id === adminContext?.id} // Disabilitato se l'utente corrisponde a se stessi
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