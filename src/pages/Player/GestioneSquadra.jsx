import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Connessione client Supabase
import './GestioneSquadra.css';

const GestioneSquadra = ({ currentUser }) => {
  const [loading, setLoading] = useState(true); // Tracciamento del caricamento iniziale dal DB
  const [squadra, setSquadra] = useState(null); // Contiene l'oggetto squadra letto dalla tabella
  const [nuovoNome, setNuovoNome] = useState(''); // Valore reattivo legato al campo di input testuale
  const [saving, setSaving] = useState(false); // Stato di blocco pulsanti durante la transazione di update
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' }); // Stato feedback (success, error, info)

  // Effetto di caricamento agganciato ai metadati dell'utente Clerk/Supabase
  useEffect(() => {
    const fetchSquadraUtente = async () => {
      // Se il profilo utente corrente non possiede ancora una squadra assegnata dall'admin
      if (!currentUser?.squadra_id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Estraiamo la riga della squadra corrispondente all'id associato
        const { data, error } = await supabase
          .from('squadre')
          .select('*')
          .eq('id', currentUser.squadra_id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSquadra(data);
          setNuovoNome(data.nome || ''); // Precompiliamo l'input con il nome attuale
        }
      } catch (err) {
        console.error("Errore caricamento squadra proprietaria:", err);
      } finally {
        setLoading(false); // Disattiva la schermata di caricamento
      }
    };

    fetchSquadraUtente();
  }, [currentUser]);

  // Gestore della sottomissione del form di modifica nome
  const handleSalvaNome = async (e) => {
    e.preventDefault(); // Impedisce il caricamento nativo della pagina del browser
    
    // Validazione stringa vuota o spazi bianchi isolati
    if (!nuovoNome.trim()) {
      setMessaggio({ testo: "Il nome della squadra non può essere vuoto.", tipo: "error" });
      return;
    }
    
    // Ottimizzazione: blocca l'operazione se il nome inserito coincide con quello memorizzato
    if (nuovoNome.trim() === squadra.nome) {
      setMessaggio({ testo: "Il nome inserito è uguale a quello attuale.", tipo: "info" });
      return;
    }

    try {
      setSaving(true); // Attiva lo stato di scrittura (disabilita i controlli)
      setMessaggio({ testo: '', tipo: '' }); // Svuota feedback precedenti

      // Aggiornamento della colonna 'nome' sulla riga corrispondente della tabella 'squadre'
      const { error } = await supabase
        .from('squadre')
        .update({ nome: nuovoNome.trim() })
        .eq('id', squadra.id);

      if (error) throw error;

      // Sincronizzazione atomica dello stato locale
      setSquadra(prev => ({ ...prev, nome: nuovoNome.trim() }));
      setMessaggio({ testo: "Nome della squadra aggiornato con successo! 🔄", tipo: "success" });
    } catch (err) {
      console.error("Errore durante l'aggiornamento del nome:", err);
      setMessaggio({ testo: "Impossibile aggiornare il nome. Riprova più tardi.", tipo: "error" });
    } finally {
      setSaving(false); // Sblocca i controlli della maschera
    }
  };

  // Schermata di caricamento asincrono iniziale
  if (loading) {
    return <div className="tactical-gestione-loading">Caricamento impostazioni squadra... ⏳</div>;
  }

  // Fallback difensivo se l'utente non è agganciato a nessun club nella tabella utenti
  if (!squadra) {
    return (
      <div className="tactical-app-container tactical-gestione-page">
        <div className="tactical-no-squadra-box">
          <h3>Nessuna squadra associata 🚫</h3>
          <p>Non risulti ancora associato a nessun club nel tuo profilo utente. Contatta l'amministratore per verificare l'assegnazione della squadra.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tactical-app-container tactical-gestione-page">
      {/* Intestazione Titolo Modulo */}
      <div className="tactical-gestione-page-header">
        <h2 className="tactical-brand">Gestione Squadra</h2>
        <p className="tactical-gestione-page-subtitle">Modifica le informazioni del tuo club.</p>
      </div>

      {/* Scheda Riepilogativa Stato Corrente */}
      <div className="tactical-gestione-card-info">
        <div className="tactical-info-row">
          <span className="tactical-info-label">Allenatore</span>
          <span className="tactical-info-value">{currentUser?.nome_utente || 'N/D'}</span>
        </div>
        <div className="tactical-info-row">
          <span className="tactical-info-label">Nome Attuale Club</span>
          <span className="tactical-info-value tactical-club-attuale">{squadra.nome}</span>
        </div>
      </div>

      {/* Pannello Form Configurazione */}
      <div className="tactical-gestione-form-box">
        <h3>Modifica Nome Squadra</h3>
        <form onSubmit={handleSalvaNome} className="tactical-form-edit-squadra">
          
          <div className="tactical-input-group">
            <label htmlFor="nomeSquadra">Nuovo Nome del Club</label>
            <input
              id="nomeSquadra"
              type="text"
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value)}
              placeholder="Inserisci il nuovo nome..."
              maxLength={40}
              disabled={saving} // Disabilitato in fase di salvataggio
            />
          </div>

          {/* Feedback Visivo Condizionale */}
          {messaggio.testo && (
            <div className={`tactical-form-feedback-msg ${messaggio.tipo}`}>
              {messaggio.testo}
            </div>
          )}

          {/* Pulsante Sottomissione Tattico */}
          <button type="submit" className="tactical-btn-salva-squadra" disabled={saving}>
            {saving ? 'Salvataggio in corso... ⏳' : 'Salva Modifiche 💾'}
          </button>
          
        </form>
      </div>
    </div>
  );
};

export default GestioneSquadra;