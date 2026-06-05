import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './AdminPenalita.css';

const AdminPenalita = () => {
  const navigate = useNavigate();
  const [squadre, setSquadre] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // Caricamento elenco squadre
  const fetchSquadrePenalita = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('squadre')
        .select('id, nome, url_logo, penalita, punti_totali')
        .order('nome', { ascending: true });

      if (error) throw error;

      // Se il campo penalità nel db è null, lo esponiamo graficamente come 0
      const squadreInizializzate = (data || []).map(s => ({
        ...s,
        penalitaInput: s.penalita != null ? s.penalita.toString() : '0'
      }));
      setSquadre(squadreInizializzate);
    } catch (err) {
      console.error("Errore recupero squadre penalità:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSquadrePenalita();
  }, []);

  // Gestione del cambiamento dell'input numerico locale
  const handleInputChange = (id, value) => {
    setSquadre(prev => prev.map(s => 
      s.id === id ? { ...s, penalitaInput: value } : s
    ));
  };

  // Salvataggio su Supabase per singola squadra
  const handleSalvaPenalita = async (squadra) => {
    const valoreNumerico = parseFloat(squadra.penalitaInput);
    
    if (isNaN(valoreNumerico) || valoreNumerico < 0) {
      alert("Inserisci un valore numerico valido e maggiore o uguale a 0.");
      return;
    }

    try {
      setSavingId(squadra.id);
      
      const { error } = await supabase
        .from('squadre')
        .update({ penalita: valoreNumerico })
        .eq('id', squadra.id);

      if (error) throw error;

      // Aggiorna lo stato locale per confermare il salvataggio avvenuto
      setSquadre(prev => prev.map(s => 
        s.id === squadra.id ? { ...s, penalita: valoreNumerico } : s
      ));

      alert(`Penalità di ${valoreNumerico} punti applicata con successo a: ${squadra.nome}`);
    } catch (err) {
      console.error("Errore salvataggio penalità:", err);
      alert("Impossibile salvare la penalità su database.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="tactical-penalita-loading">Caricamento registro sanzioni... ⏳</div>;
  }

  return (
    <div className="tactical-app-container tactical-penalita-page">
      {/* Intestazione */}
      <div className="tactical-penalita-header">
        <button className="tactical-btn-back" onClick={() => navigate('/dashboard')}>
          ⬅️ Indietro
        </button>
        <h2 className="tactical-brand">Gestione Penalità</h2>
      </div>

      <div className="tactical-penalita-info-card">
        <p>
          ⚠️ <strong className="tactical-text-alert">Nota per l'Amministratore:</strong> I punti inseriti in questa sezione verranno detratti direttamente dal calcolo della classifica generale e della dashboard. Inserire <code className="tactical-code-badge">0</code> per azzerare la sanzione d'autorità.
        </p>
      </div>

      {/* Lista delle squadre */}
      <div className="tactical-penalita-list">
        {squadre.length === 0 ? (
          <div className="tactical-penalita-empty">Nessuna squadra trovata in questa lega.</div>
        ) : (
          squadre.map(squadra => (
            <div key={squadra.id} className={`tactical-penalita-card ${squadra.penalita > 0 ? 'has-penalty' : ''}`}>
              <div className="tactical-penalita-team-info">
                {squadra.url_logo ? (
                  <img src={squadra.url_logo} alt={squadra.nome} className="tactical-penalita-logo" />
                ) : (
                  <div className="tactical-penalita-logo-placeholder">⚽</div>
                )}
                <div className="tactical-penalita-team-meta">
                  <span className="tactical-penalita-team-name">{squadra.nome}</span>
                  <span className="tactical-penalita-team-points">
                    Punti sul campo: <strong className="tactical-highlight-value">{squadra.punti_totali || 0}</strong>
                  </span>
                </div>
              </div>

              <div className="tactical-penalita-controls">
                <div className="tactical-penalita-input-group">
                  <label>Punti Malus:</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.5" 
                    value={squadra.penalitaInput} 
                    onChange={(e) => handleInputChange(squadra.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <button 
                  className="tactical-btn-save" 
                  disabled={savingId === squadra.id}
                  onClick={() => handleSalvaPenalita(squadra)}
                >
                  {savingId === squadra.id ? '...' : 'Applica'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPenalita;