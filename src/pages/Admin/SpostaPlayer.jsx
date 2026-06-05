import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Gestisce il reindirizzamento tra moduli
import { supabase } from '../../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './SpostaPlayer.css';

const SpostaPlayer = () => {
  const { user } = useUser();
  const navigate = useNavigate(); // Hook di navigazione della plancia
  const [loading, setLoading] = useState(true);
  const [utentiLega, setUtentiLega] = useState([]);
  const [squadreLega, setSquadreLega] = useState([]);
  const [adminContext, setAdminContext] = useState(null);

  const loadSpostaData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Recupera i dati dell'amministratore per estrarre il lega_id di competenza
      const { data: curAdmin, error: aErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      if (aErr) throw aErr;
      setAdminContext(curAdmin);

      if (curAdmin.lega_id) {
        // 1. Recupera tutti gli iscritti associati alla stessa lega
        const { data: iscritti, error: iErr } = await supabase
          .from('utenti')
          .select('*')
          .eq('lega_id', curAdmin.lega_id)
          .order('nome_utente', { ascending: true });
        if (iErr) throw iErr;
        setUtentiLega(iscritti || []);

        // 2. Recupera tutti i club registrati all'interno della medesima lega
        const { data: club, error: cErr } = await supabase
          .from('squadre')
          .select('*')
          .eq('lega_id', curAdmin.lega_id)
          .order('nome', { ascending: true });
        if (cErr) throw cErr;
        setSquadreLega(club || []);
      }
    } catch (err) {
      console.error("Errore caricamento dati trasferimento:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpostaData();
  }, [user]);

  // Gestione del cambio di club dal menu a tendina
  const handleTeamChange = async (utenteId, nuovaSquadraId) => {
    // Se viene scelta la stringa vuota, l'utente viene impostato a null (svincolato)
    const valoreSquadra = nuovaSquadraId === "" ? null : nuovaSquadraId;

    try {
      const { error } = await supabase
        .from('utenti')
        .update({ squadra_id: valoreSquadra })
        .eq('id', utenteId);

      if (error) throw error;

      // Sincronizzazione immediata dello stato locale per evitare refresh di pagina
      setUtentiLega(prev => prev.map(u => u.id === utenteId ? { ...u, squadra_id: valoreSquadra } : u));
    } catch (err) {
      console.error(err);
      alert("Errore durante lo spostamento del player.");
    }
  };

  if (loading) {
    return <div className="tactical-sposta-loading">Preparazione spogliatoi e rose... ⚽</div>;
  }

  return (
    <div className="tactical-app-container tactical-sposta-page">
      {/* Intestazione di Sezione */}
      <div className="tactical-sposta-header">
        <div className="tactical-sposta-title-wrapper">
          <button className="tactical-btn-back" onClick={() => navigate('/dashboard')}>
            ⬅️ Indietro
          </button>
          <h2 className="tactical-brand">Sposta Player di Squadra</h2>
        </div>
        <p className="tactical-sposta-subtitle">
          Assegna i fantallenatori della lega al rispettivo club o rimuovili.
        </p>
      </div>

      {/* Lista di Trasferimento Fantallenatori */}
      <div className="tactical-sposta-list">
        {utentiLega.map((ut) => (
          <div key={ut.id} className="tactical-player-transfer-card">
            
            {/* Metadati Anagrafici Player */}
            <div className="tactical-transfer-meta">
              <h4>{ut.nome_utente}</h4>
              <span className="tactical-transfer-email">{ut.email}</span>
            </div>

            {/* Menu Dropdown Selettore Club */}
            <div className="tactical-transfer-select-wrapper">
              <label>Club Associato</label>
              <select
                value={ut.squadra_id || ""}
                onChange={(e) => handleTeamChange(ut.id, e.target.value)}
                className="tactical-select-transfer-dropdown"
              >
                <option value="">-- Svincolato / Nessuna squadra --</option>
                {squadreLega.map(sq => (
                  <option key={sq.id} value={sq.id}>{sq.nome}</option>
                ))}
              </select>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default SpostaPlayer;