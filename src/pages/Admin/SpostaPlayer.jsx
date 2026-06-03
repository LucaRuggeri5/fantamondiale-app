import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Importato per gestire il ritorno
import { supabase } from '../../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './SpostaPlayer.css';

const SpostaPlayer = () => {
  const { user } = useUser();
  const navigate = useNavigate(); // Inizializzazione dell'hook di navigazione
  const [loading, setLoading] = useState(true);
  const [utentiLega, setUtentiLega] = useState([]);
  const [squadreLega, setSquadreLega] = useState([]);
  const [adminContext, setAdminContext] = useState(null);

  const loadSpostaData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: curAdmin, error: aErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      if (aErr) throw aErr;
      setAdminContext(curAdmin);

      if (curAdmin.lega_id) {
        // 1. Recupera tutti gli utenti della lega
        const { data: iscritti, error: iErr } = await supabase
          .from('utenti')
          .select('*')
          .eq('lega_id', curAdmin.lega_id)
          .order('nome_utente', { ascending: true });
        if (iErr) throw iErr;
        setUtentiLega(iscritti || []);

        // 2. Recupera tutte le squadre registrate in questa lega
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

  const handleTeamChange = async (utenteId, nuovaSquadraId) => {
    const valoreSquadra = nuovaSquadraId === "" ? null : nuovaSquadraId;

    try {
      const { error } = await supabase
        .from('utenti')
        .update({ squadra_id: valoreSquadra })
        .eq('id', utenteId);

      if (error) throw error;

      setUtentiLega(prev => prev.map(u => u.id === utenteId ? { ...u, squadra_id: valoreSquadra } : u));
    } catch (err) {
      console.error(err);
      alert("Errore durante lo spostamento del player.");
    }
  };

  if (loading) return <div className="sposta-loading">Preparazione spogliatoi e rose... ⚽</div>;

  return (
    <div className="sposta-page-container">
      <div className="sposta-header">
        <div className="sposta-header-title-container">
          <button className="btn-back-sposta" onClick={() => navigate('/dashboard')}>
            ⬅️ Indietro
          </button>
          <h2>Sposta Player di Squadra ⚽</h2>
        </div>
        <p className="sposta-subtitle">Assegna i fantallenatori della lega al rispettivo club o rimuovili per lasciarli svincolati.</p>
      </div>

      <div className="sposta-list">
        {utentiLega.map((ut) => (
          <div key={ut.id} className="player-transfer-card">
            <div className="transfer-meta">
              <h4>{ut.nome_utente}</h4>
              <span className="transfer-email">{ut.email}</span>
            </div>

            <div className="transfer-select-wrapper">
              <label>Club Associato:</label>
              <select
                value={ut.squadra_id || ""}
                onChange={(e) => handleTeamChange(ut.id, e.target.value)}
                className="select-transfer-dropdown"
              >
                <option value="">-- Svincolato / Nessuna squadra --</option>
                {squadreLega.map(sq => (
                  <option key={sq.id} value={sq.id}>🛡️ {sq.nome}</option>
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