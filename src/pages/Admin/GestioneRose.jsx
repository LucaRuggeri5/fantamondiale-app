import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import './GestioneRose.css';

const GestioneRose = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [squadreLega, setSquadreLega] = useState([]);
  const [selectedSquadraId, setSelectedSquadraId] = useState('');

  const [rosaAttuale, setRosaAttuale] = useState([]);
  const [listoneCalciatori, setListoneCalciatori] = useState([]);
  const [calciatoriOccupatiIds, setCalciatoriOccupatiIds] = useState([]);
  const [filtroRuolo, setFiltroRuolo] = useState('P');
  const [searchQuery, setSearchQuery] = useState('');

  // Carica i dati iniziali dell'amministratore e le squadre della sua lega
  const loadAdminContext = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data: utente, error: uErr } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single();
      if (uErr) throw uErr;
      setAdminUser(utente);

      if (utente.lega_id) {
        const { data: squadre, error: sErr } = await supabase
          .from('squadre')
          .select('*')
          .eq('lega_id', utente.lega_id)
          .order('nome', { ascending: true });
        if (sErr) throw sErr;
        setSquadreLega(squadre || []);
      }
    } catch (err) {
      console.error("Errore nel caricamento del contesto admin:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carica la rosa della squadra selezionata e calcola i calciatori occupati nella lega
  const loadRosaESvincolati = async () => {
    if (!selectedSquadraId || !adminUser?.lega_id) {
      setRosaAttuale([]);
      return;
    }

    try {
      // 1. Carica la rosa della squadra selezionata
      const { data: rosa, error: rErr } = await supabase
        .from('rose_squadre')
        .select('calciatore_id, calciatori_reali(*)')
        .eq('squadra_id', selectedSquadraId);
      if (rErr) throw rErr;
      setRosaAttuale(rosa?.map(item => item.calciatori_reali) || []);

      // 2. Trova tutti i calciatori già occupati nella lega attuale per bloccare i duplicati
      const { data: occupati, error: oErr } = await supabase
        .from('rose_squadre')
        .select('calciatore_id')
        .eq('lega_id', adminUser.lega_id);
      if (oErr) throw oErr;
      setCalciatoriOccupatiIds(occupati?.map(o => o.calciatore_id) || []);

      // 3. Carica il listone completo dei calciatori attivi
      if (listoneCalciatori.length === 0) {
        const { data: listone, error: lErr } = await supabase
          .from('calciatori_reali')
          .select('*')
          .eq('stato', 'attivo')
          .order('nome', { ascending: true });
        if (lErr) throw lErr;
        setListoneCalciatori(listone || []);
      }
    } catch (err) {
      console.error("Errore nel caricamento dei calciatori:", err);
    }
  };

  useEffect(() => {
    loadAdminContext();
  }, [user]);

  useEffect(() => {
    loadRosaESvincolati();
  }, [selectedSquadraId]);

  // Aggiunge un calciatore alla rosa del club selezionato
  const handleAggiungiCalciatore = async (calciatoreId) => {
    try {
      const { error: insErr } = await supabase
        .from('rose_squadre')
        .insert([
          {
            lega_id: adminUser.lega_id,
            squadra_id: selectedSquadraId,
            calciatore_id: calciatoreId
          }
        ]);
      if (insErr) throw insErr;
      await loadRosaESvincolati();
    } catch (err) {
      console.error(err);
      alert("Errore nell'inserimento del calciatore. Controlla che non sia già stato preso.");
    }
  };

  // Rimuove un calciatore dalla rosa (Svincolo)
  const handleRimuoviCalciatore = async (calciatoreId) => {
    try {
      const { error: delErr } = await supabase
        .from('rose_squadre')
        .delete()
        .eq('squadra_id', selectedSquadraId)
        .eq('calciatore_id', calciatoreId);
      if (delErr) throw delErr;
      await loadRosaESvincolati();
    } catch (err) {
      console.error(err);
      alert("Impossibile rimuovere il calciatore.");
    }
  };

  if (loading) return <div className="admin-rose-loading">Caricamento strumenti di amministrazione... 👑</div>;

  return (
    <div className="admin-rose-container">
      <div className="admin-rose-header">
        <h2>Pannello Mercato & Rose 👑</h2>
        <p>Seleziona una squadra della tua lega per gestirne la rosa di calciatori reali.</p>
      </div>

      {/* Selettore Squadra */}
      <div className="squadra-select-box">
        <label>Seleziona Club:</label>
        <select
          value={selectedSquadraId}
          onChange={(e) => setSelectedSquadraId(e.target.value)}
          className="admin-select"
        >
          <option value="">-- Scegli una Squadra --</option>
          {squadreLega.map(sq => (
            <option key={sq.id} value={sq.id}>{sq.nome}</option>
          ))}
        </select>
      </div>

      {selectedSquadraId && (
        <div className="workspace-grid">



          {/* Colonna Sinistra: Listone Calciatori Liberi per inserimento */}
          <div className="workspace-column market-pool-box">
            <h3>Aggiungi Calciatori</h3>

            {/* Filtri di ricerca */}
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Cerca per nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              <div className="role-btn-group">
                {['P', 'D', 'C', 'A'].map(r => (
                  <button
                    key={r}
                    className={`role-filter-btn ${filtroRuolo === r ? 'active' : ''}`}
                    onClick={() => setFiltroRuolo(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista Calciatori Filtrata */}
            <div className="admin-players-list scrollable">
              {listoneCalciatori
                .filter(p => p.ruolo === filtroRuolo && p.nome.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(player => {
                  const isOccupato = calciatoriOccupatiIds.includes(player.id);
                  return (
                    <div key={player.id} className={`player-admin-card ${isOccupato ? 'disabled-item' : ''}`}>
                      <div>
                        <strong>{player.nome}</strong>
                        <span className="nation-txt">🌍 {player.nazionale}</span>
                      </div>
                      {isOccupato ? (
                        <span className="status-occupied">🔒 Occupato</span>
                      ) : (
                        <button
                          className="btn-admin-action add"
                          onClick={() => handleAggiungiCalciatore(player.id)}
                        >
                          ➕ Aggiungi
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Colonna Destra: Rosa Corrente della squadra */}
          <div className="workspace-column current-rosa-box">
            <h3>Rosa Attuale ({rosaAttuale.length} calciatori)</h3>
            {rosaAttuale.length === 0 ? (
              <p className="empty-notice">Nessun calciatore inserito in questo club.</p>
            ) : (
              <div className="admin-players-list">
                {rosaAttuale.map(player => (
                  <div key={player.id} className="player-admin-card row-item">
                    <div>
                      <span className={`role-indicator ${player.ruolo}`}>{player.ruolo}</span>
                      <strong className="player-name-txt">{player.nome}</strong>
                      <span className="nation-txt">🌍 {player.nazionale}</span>
                    </div>
                    <button
                      className="btn-admin-action delete"
                      onClick={() => handleRimuoviCalciatore(player.id)}
                    >
                      🗑️ Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default GestioneRose;