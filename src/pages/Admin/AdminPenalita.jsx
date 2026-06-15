import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
// Importiamo il nostro componente riutilizzabile
import LogoSquadra from '../../components/LogoSquadra/LogoSquadra';
import './AdminPenalita.css';

// --- INNESTO NOTIFICHE: IMPORTIAMO L'HOOK PERSONALIZZATO ---
import { useNotification } from '../../context/NotificationContext';

const AdminPenalita = () => {
  const navigate = useNavigate();
  const [squadre, setSquadre] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // --- INNESTO NOTIFICHE: ESTRAIAMO LE FUNZIONI SHOWTOAST E SHOWCONFIRM ---
  const { showToast, showConfirm } = useNotification();

  const fetchSquadrePenalita = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('squadre')
        .select('id, nome, url_logo, penalita, punti_totali')
        .order('nome', { ascending: true });

      if (error) throw error;

      const squadreInizializzate = (data || []).map(s => ({
        ...s,
        penalitaInput: s.penalita != null ? s.penalita.toString() : '0'
      }));
      setSquadre(squadreInizializzate);
    } catch (err) {
      console.error("Errore recupero squadre penalità:", err);
      showToast("Impossibile caricare il registro sanzioni.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSquadrePenalita();
  }, []);

  const handleInputChange = (id, value) => {
    setSquadre(prev => prev.map(s => 
      s.id === id ? { ...s, penalitaInput: value } : s
    ));
  };

  const handleSalvaPenalita = (squadra) => {
    const valoreNumerico = parseFloat(squadra.penalitaInput);
    
    if (isNaN(valoreNumerico) || valoreNumerico < 0) {
      // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT NATIVO CON TOAST WARNING ---
      showToast("Inserisci un valore numerico valido e maggiore o uguale a 0.", "warning");
      return;
    }

    // --- MODIFICA NOTIFICHE: INNESTO DEL MODALE DI CONFERMA PRIMA DI SALVARE ---
    showConfirm(
      "Conferma Sanzione",
      `Stai per impostare la penalità di ${squadra.nome} a ${valoreNumerico} punti. Vuoi procedere?`,
      async () => {
        try {
          setSavingId(squadra.id);
          const { error } = await supabase
            .from('squadre')
            .update({ penalita: valoreNumerico })
            .eq('id', squadra.id);

          if (error) throw error;

          setSquadre(prev => prev.map(s => 
            s.id === squadra.id ? { ...s, penalita: valoreNumerico } : s
          ));
          
          // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT CON UN ELEGANTE TOAST SUCCESS ---
          showToast(`Penalità di ${valoreNumerico} pt aggiornata per ${squadra.nome}`, "success");
        } catch (err) {
          console.error("Errore salvataggio:", err);
          // --- MODIFICA NOTIFICHE: SOSTITUITO ALERT D'ERRORE ---
          showToast("Impossibile salvare la penalità su database.", "error");
        } finally {
          setSavingId(null);
        }
      }
    );
  };

  if (loading) return <div className="tactical-penalita-loading">Caricamento registro sanzioni... ⏳</div>;

  return (
    <div className="tactical-app-container tactical-penalita-page">
      <div className="tactical-penalita-header">
        <button className="tactical-btn-back" onClick={() => navigate('/dashboard')}>⬅️ Indietro</button>
        <h2 className="tactical-brand">Gestione Penalità</h2>
      </div>

      <div className="tactical-penalita-list">
        {squadre.map(squadra => (
          <div key={squadra.id} className={`tactical-penalita-card ${squadra.penalita > 0 ? 'has-penalty' : ''}`}>
            <div className="tactical-penalita-team-info">
              {/* Utilizzo del componente riutilizzabile */}
              <LogoSquadra url={squadra.url_logo} nomeSquadra={squadra.nome} dimensione="small" />
              
              <div className="tactical-penalita-team-meta">
                <span className="tactical-penalita-team-name">{squadra.nome}</span>
                <span className="tactical-penalita-team-points">
                  Punti: <strong className="tactical-highlight-value">{squadra.punti_totali || 0}</strong>
                </span>
              </div>
            </div>

            <div className="tactical-penalita-controls">
              <input 
                type="number" min="0" step="0.5" 
                value={squadra.penalitaInput} 
                onChange={(e) => handleInputChange(squadra.id, e.target.value)}
              />
              <button 
                className="tactical-btn-save" 
                disabled={savingId === squadra.id}
                onClick={() => handleSalvaPenalita(squadra)}
              >
                {savingId === squadra.id ? '...' : 'Applica'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPenalita;