import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './GestioneSquadra.css';

const GestioneSquadra = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [squadra, setSquadra] = useState(null);
  const [nuovoNome, setNuovoNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });

  useEffect(() => {
    const fetchSquadraUtente = async () => {
      if (!currentUser?.squadra_id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('squadre')
          .select('*')
          .eq('id', currentUser.squadra_id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSquadra(data);
          setNuovoNome(data.nome || '');
        }
      } catch (err) {
        console.error("Errore caricamento squadra proprietaria:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSquadraUtente();
  }, [currentUser]);

  const handleSalvaNome = async (e) => {
    e.preventDefault();
    if (!nuovoNome.trim()) {
      setMessaggio({ testo: "Il nome della squadra non può essere vuoto.", tipo: "error" });
      return;
    }
    if (nuovoNome.trim() === squadra.nome) {
      setMessaggio({ testo: "Il nome inserito è uguale a quello attuale.", tipo: "info" });
      return;
    }

    try {
      setSaving(true);
      setMessaggio({ testo: '', tipo: '' });

      const { error } = await supabase
        .from('squadre')
        .update({ nome: nuovoNome.trim() })
        .eq('id', squadra.id);

      if (error) throw error;

      setSquadra(prev => ({ ...prev, nome: nuovoNome.trim() }));
      setMessaggio({ testo: "Nome della squadra aggiornato con successo! 🔄", tipo: "success" });
    } catch (err) {
      console.error("Errore durante l'aggiornamento del nome:", err);
      setMessaggio({ testo: "Impossibile aggiornare il nome. Riprova più tardi.", tipo: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="gestione-loading">Caricamento impostazioni squadra... ⏳</div>;

  if (!squadra) {
    return (
      <div className="gestione-page-container">
        <div className="no-squadra-box">
          <h3>Nessuna squadra associata 🚫</h3>
          <p>Non risulti ancora associato a nessun club nel tuo profilo utente. Contatta l'amministratore per verificare l'assegnazione della squadra.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gestione-page-container">
      <div className="gestione-page-header">
        <h2>Gestione Squadra</h2>
        <p className="gestione-page-subtitle">Modifica le informazioni relative alla tua squadra.</p>
      </div>

      <div className="gestione-card-info">
        <div className="info-row">
          <span className="info-label">Allenatore:</span>
          <span className="info-value">{currentUser?.nome_utente || 'N/D'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Nome Attuale Club:</span>
          <span className="info-value club-attuale">{squadra.nome}</span>
        </div>
      </div>

      <div className="gestione-form-box">
        <h3>Modifica Nome Squadra</h3>
        <form onSubmit={handleSalvaNome} className="form-edit-squadra">
          <div className="input-group">
            <label htmlFor="nomeSquadra">Nuovo Nome del Club</label>
            <input
              id="nomeSquadra"
              type="text"
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value)}
              placeholder="Inserisci il nuovo nome..."
              maxLength={40}
              disabled={saving}
            />
          </div>

          {messaggio.testo && (
            <div className={`form-feedback-msg ${messaggio.tipo}`}>
              {messaggio.testo}
            </div>
          )}

          <button type="submit" className="btn-salva-squadra" disabled={saving}>
            {saving ? 'Salvataggio in corso... ⏳' : 'Salva Modifiche 💾'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GestioneSquadra;