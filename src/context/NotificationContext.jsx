import React, { createContext, useState, useContext } from 'react';

// 1. Creiamo il Context vero e proprio (la nostra "frequenza radio")
const NotificationContext = createContext();

// 2. Creiamo il Provider. Questo componente avvolgerà tutta la nostra app.
export const NotificationProvider = ({ children }) => {
  
  // --- STATI PER IL TOAST (NOTIFICA TEMPORANEA) ---
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success' // può essere 'success', 'error', 'warning'
  });

  // --- STATI PER IL MODALE DI CONFERMA ---
  const [confirm, setConfirm] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null, // Qui salveremo la funzione da eseguire se l'utente clicca "Sì"
  });

  // --- FUNZIONI DI CONTROLLO PER IL TOAST ---
  
  // Funzione per mostrare una notifica. Sparisce da sola dopo 3 secondi.
  const showToast = (message, type = 'success') => {
    // Impostiamo i dati del toast e lo attiviamo
    setToast({ show: true, message, type });
    
    // Fissiamo un timer per chiudere automaticamente il toast dopo 3000 millisecondi (3 secondi)
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Funzione per chiudere manualmente il toast (es. se l'utente ci clicca sopra)
  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  // --- FUNZIONI DI CONTROLLO PER IL MODALE ---

  // Funzione per aprire il modale di conferma. Richiede un'azione (funzione callback) da eseguire in caso di successo.
  const showConfirm = (title, message, onConfirmAction) => {
    setConfirm({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirmAction(); // Esegue l'azione reale (es. elimina squadra)
        hideConfirm();     // Chiude il modale subito dopo
      }
    });
  };

  // Funzione per chiudere il modale (se l'utente clicca "Annulla" o se l'azione è completata)
  const hideConfirm = () => {
    setConfirm({
      show: false,
      title: '',
      message: '',
      onConfirm: null
    });
  };

  return (
    // Esponiamo sia i dati (toast, confirm) che le funzioni (showToast, showConfirm, ecc.) 
    // in modo che qualsiasi componente figlio possa utilizzarli.
    <NotificationContext.Provider value={{ toast, confirm, showToast, hideToast, showConfirm, hideConfirm }}>
      {children} {/* Qui dentro verranno renderizzati tutti i componenti della nostra app */}
    </NotificationContext.Provider>
  );
};

// 3. Creiamo un Hook Personalizzato ultra-semplice per usare questo context al volo nelle pagine
export const useNotification = () => {
  return useContext(NotificationContext);
};