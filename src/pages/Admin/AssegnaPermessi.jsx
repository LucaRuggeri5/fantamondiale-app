import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './AssegnaPermessi.css';

const AssegnaPermessi = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [utentiLega, setUtentiLega] = useState([]);
  const [adminContext, setAdminContext] = useState(null);

  const loadUtentiData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: currentAdmin, error: aErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      if (aErr) throw aErr;
      setAdminContext(currentAdmin);

      if (currentAdmin.lega_id) {
        const { data: iscritti, error: iErr } = await supabase
          .from('utenti')
          .select('*')
          .eq('lega_id', currentAdmin.lega_id)
          .order('nome_utente', { ascending: true });
        if (iErr) throw iErr;
        setUtentiLega(iscritti || []);
      }
    } catch (err) {
      console.error("Errore caricamento utenti permessi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUtentiData();
  }, [user]);

  const toggleRuoloUtente = async (utenteId, ruoloAttuale) => {
    if (utenteId === adminContext.id) {
      alert("Non puoi revocare i permessi a te stesso!");
      return;
    }

    const nuovoRuolo = ruoloAttuale === 'admin' ? 'player' : 'admin';
    const conferma = window.confirm(`Vuoi davvero cambiare il ruolo di questo utente in ${nuovoRuolo.toUpperCase()}?`);
    if (!conferma) return;

    try {
      const { error } = await supabase
        .from('utenti')
        .update({ ruolo: nuovoRuolo })
        .eq('id', utenteId);

      if (error) throw error;
      
      // Aggiorna lo stato locale senza ricaricare tutta la pagina
      setUtentiLega(prev => prev.map(u => u.id === utenteId ? { ...u, ruolo: nuovoRuolo } : u));
    } catch (err) {
      console.error(err);
      alert("Impossibile aggiornare i privilegi dell'utente.");
    }
  };

  if (loading) return <div className="permessi-loading">Caricamento elenco privilegi... 👑</div>;

  return (
    <div className="permessi-page-container">
      <div className="permessi-header">
        <h2>Assegna Permessi Admin 👑</h2>
        <p className="permessi-subtitle">Promuovi i partecipanti ad Amministratori della lega o revoca i loro accessi di controllo.</p>
      </div>

      <div className="permessi-list">
        {utentiLega.map((ut) => (
          <div key={ut.id} className="utente-permessi-card">
            <div className="ut-info">
              <span className="ut-avatar">👤</span>
              <div className="ut-meta">
                <h4>{ut.nome_utente}</h4>
                <p>{ut.email}</p>
              </div>
            </div>
            <div className="ut-action">
              <span className={`badge-status ${ut.ruolo}`}>
                {ut.ruolo === 'admin' ? '👑 Admin' : '🛡️ Player'}
              </span>
              <button 
                className={`btn-toggle-role ${ut.ruolo === 'admin' ? 'demote' : 'promote'}`}
                onClick={() => toggleRuoloUtente(ut.id, ut.ruolo)}
                disabled={ut.id === adminContext?.id}
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