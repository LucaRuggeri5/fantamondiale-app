import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './Onboarding.css';

/**
 * Gate d'ingresso iniziale alla Tactical Suite.
 * Consente l'aggancio a una chiamata di lega esistente o la fondazione di un nuovo torneo.
 */
const Onboarding = ({ onJoinLeague }) => {
  const [code, setCode] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useUser();

  // Esegue l'innesto del giocatore in una lega esistente tramite codice unico
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
        setError('Codice lega errato o inesistente. Verifica le credenziali!');
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
      setError('Innestamento fallito. Riprova la connessione al database.');
    } finally {
      setLoading(false);
    }
  };

  // Crea una nuova lega d'autorità sul database assegnando il ruolo di admin
  const handleCreate = async () => {
    if (!leagueName.trim()) {
      setError('Inserisci una denominazione valida per la tua lega!');
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

      alert(`Lega "${newLeague.nome}" fondata con successo! Condividi il Codice: ${generatoCodice}`);
      onJoinLeague(newLeague.id);

    } catch (err) {
      console.error("Errore creazione lega:", err);
      setError('Fondazione della lega fallita. Riprova l\'operazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tactical-app-container tactical-onboarding-wrapper">
      <div className="tactical-onboarding-center">
        
        {/* INTESTAZIONE */}
        <div className="tactical-onboarding-header">
          <h2 className="tactical-brand">Benvenuto nel FantaMondiale</h2>
          <p className="tactical-onboarding-subtitle"> Inizializza il tuo profilo inserendoti in un torneo o fondandone uno nuovo.</p>
        </div>

        {/* MESSAGGI DI ERRORE */}
        {error && <div className="tactical-error-banner">{error}</div>}

        <div className="tactical-onboarding-split-cards">
          
          {/* BLOCCO UNISCITI A LEGA */}
          <div className="tactical-onboarding-card">
            <h3>Unisciti a una Lega</h3>
            <p className="tactical-card-desc">Inserisci le credenziali di accesso fornite dal tuo Admin.</p>
            
            <form onSubmit={handleJoin}>
              <input 
                type="text" 
                placeholder="Codice lega (es. 13CM9U)" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="tactical-onboarding-input"
                disabled={loading}
              />
              <button type="submit" className="tactical-btn-onboarding secondary" disabled={loading}>
                {loading ? 'Verifica credenziali...' : 'Innestati nel Torneo'}
              </button>
            </form>
          </div>

          {/* DIVIDER STRUTTURALE */}
          <div className="tactical-onboarding-divider">
            <span>oppure</span>
          </div>

          {/* BLOCCO CREA LEGA */}
          <div className="tactical-onboarding-card">
            <h3>Fonda la tua Lega</h3>
            <p className="tactical-card-desc">Diventa Commissario del torneo e genera il codice di invito.</p>
            
            <input 
              type="text" 
              placeholder="Nome del nuovo torneo" 
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="tactical-onboarding-input"
              disabled={loading}
            />
            
            <button onClick={handleCreate} className="tactical-btn-onboarding primary" disabled={loading}>
              {loading ? 'Fondazione registro...' : 'Inizializza Nuova Lega'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Onboarding;