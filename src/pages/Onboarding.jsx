import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './Onboarding.css';

const Onboarding = ({ onJoinLeague }) => {
  const [code, setCode] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useUser();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setLoading(true);
      setError('');

      const { data: league, error: leagueError } = await supabase
        .from('leghe')
        .select('id')
        .eq('codice_accesso', code.trim().toUpperCase())
        .maybeSingle();

      if (leagueError || !league) {
        setError('Codice lega errato o inesistente. Riprova!');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('utenti')
        .update({ 
          lega_id: league.id, 
          ruolo: 'player' 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onJoinLeague(league.id);

    } catch (err) {
      console.error("Errore join league:", err);
      setError('Errore durante l\'accesso alla lega. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!leagueName.trim()) {
      setError('Inserisci un nome valido per la tua lega!');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const generatoCodice = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: newLeague, error: createError } = await supabase
        .from('leghe')
        .insert([
          { 
            nome: leagueName.trim(), 
            codice_accesso: generatoCodice 
          }
        ])
        .select()
        .single();

      if (createError) throw createError;

      const { error: updateError } = await supabase
        .from('utenti')
        .update({ 
          lega_id: newLeague.id, 
          ruolo: 'admin' 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      alert(`Lega "${newLeague.nome}" creata! Codice: ${generatoCodice}`);
      onJoinLeague(newLeague.id);

    } catch (err) {
      console.error("Errore creazione lega:", err);
      setError('Errore durante la creazione della lega. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <h2>Benvenuto nel FantaMondiale! 👋</h2>
      <p className="onboarding-subtitle">Entra in una lega o creane una nuova per iniziare.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="onboarding-card">
        <h3>Unisciti a una Lega</h3>
        <form onSubmit={handleJoin}>
          <input 
            type="text" 
            placeholder="Codice lega (es. MONDIALE26)" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="onboarding-input"
            disabled={loading}
          />
          <button type="submit" className="onboarding-btn secondary" disabled={loading}>
            {loading ? 'Verifica...' : 'Entra nella Lega'}
          </button>
        </form>
      </div>

      <div className="divider">oppure</div>

      <div className="onboarding-card">
        <h3>Crea la tua Lega</h3>
        <p className="card-desc">Diventa Admin del torneo e invita i tuoi amici.</p>
        
        <input 
          type="text" 
          placeholder="Nome della tua lega" 
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          className="onboarding-input"
          disabled={loading}
        />
        
        <button onClick={handleCreate} className="onboarding-btn primary" disabled={loading}>
          {loading ? 'Creazione...' : 'Crea Nuova Lega'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;