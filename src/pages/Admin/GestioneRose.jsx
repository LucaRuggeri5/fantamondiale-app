import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import BandieraNazionale from '../../components/BandieraNazionale/BandieraNazionale';
import './GestioneRose.css';

// Definiamo i limiti massimi per ogni ruolo come costante pulita
const LIMITI_RUOLI = {
  P: 3,
  D: 8,
  C: 8,
  A: 6
};

const GestioneRose = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [squadreLega, setSquadreLega] = useState([]);
  const [selectedSquadraId, setSelectedSquadraId] = useState('');

  const [rosaAttuale, setRosaAttuale] = useState([]);
  const [listoneCalciatori, setListoneCalciatori] = useState([]);
  const [calciatoriOccupatiIds, setCalciatoriOccupatiIds] = useState([]);
  const [filtroRuolo, setFiltroRuolo] = useState('P');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stato UX Mobile-First: gestisce il tab attivo sui dispositivi mobili
  const [activeTabMobile, setActiveTabMobile] = useState('market'); // 'market' o 'rosa'

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
      const { data: rosa, error: rErr } = await supabase
        .from('rose_squadre')
        .select('calciatore_id, calciatori_reali(*)')
        .eq('squadra_id', selectedSquadraId);
      if (rErr) throw rErr;
      
      const rosaOrdinata = (rosa?.map(item => item.calciatori_reali) || []).sort((a, b) => 
        a.nome.localeCompare(b.nome)
      );
      setRosaAttuale(rosaOrdinata);

      const { data: occupati, error: oErr } = await supabase
        .from('rose_squadre')
        .select('calciatore_id')
        .eq('lega_id', adminUser.lega_id);
      if (oErr) throw oErr;
      setCalciatoriOccupatiIds(occupati?.map(o => o.calciatore_id) || []);

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

  // Conteggi dinamici dei ruoli per la squadra selezionata
  const conteggioRuoli = useMemo(() => {
    const dei = { P: 0, D: 0, C: 0, A: 0 };
    rosaAttuale.forEach(p => { if (dei[p.ruolo] !== undefined) dei[p.ruolo]++; });
    return dei;
  }, [rosaAttuale]);

  // Listone filtrato memorizzato per massimizzare le performance di scrolling
  const calciatoriFiltrati = useMemo(() => {
    return listoneCalciatori.filter(p => 
      p.ruolo === filtroRuolo && 
      p.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [listoneCalciatori, filtroRuolo, searchQuery]);

  const handleAggiungiCalciatore = async (player) => {
    const ruoloPlayer = player.ruolo;
    const attualePerRuolo = conteggioRuoli[ruoloPlayer] || 0;
    const limiteMassimo = LIMITI_RUOLI[ruoloPlayer];

    if (attualePerRuolo >= limiteMassimo) {
      alert(`Impossibile aggiungere ${player.nome}. Il limite massimo per il ruolo "${ruoloPlayer}" è di ${limiteMassimo} calciatori.`);
      return;
    }

    try {
      const { error: insErr } = await supabase
        .from('rose_squadre')
        .insert([
          {
            lega_id: adminUser.lega_id,
            squadra_id: selectedSquadraId,
            calciatore_id: player.id
          }
        ]);
      if (insErr) throw insErr;
      await loadRosaESvincolati();
    } catch (err) {
      console.error(err);
    }
  };

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
    }
  };

  if (loading) return <div className="admin-rose-loading">Caricamento strumenti di amministrazione... 👑</div>;

  return (
    <div className="admin-rose-container">
      {/* Intestazione */}
      <div className="admin-rose-header">
        <button className="btn-back-rose" onClick={() => navigate('/dashboard')}>
          ← Indietro
        </button>
        <div className="admin-title-group">
          <h2>Gestione Rose</h2>
        </div>
      </div>

      {/* Box Selezione Squadra */}
      <div className="squadra-select-box">
        <label htmlFor="club-select">Club da Modificare</label>
        <select
          id="club-select"
          value={selectedSquadraId}
          onChange={(e) => setSelectedSquadraId(e.target.value)}
          className="admin-select"
        >
          <option value="">-- Seleziona una squadra --</option>
          {squadreLega.map(sq => (
            <option key={sq.id} value={sq.id}>{sq.nome}</option>
          ))}
        </select>
      </div>

      {selectedSquadraId ? (
        <div className="workspace-wrapper">
          
          {/* NAVIGAZIONE A TAB SOLO SU MOBILE */}
          <div className="mobile-tabs-nav">
            <button 
              className={`tab-nav-btn ${activeTabMobile === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTabMobile('market')}
            >
              Acquista
            </button>
            <button 
              className={`tab-nav-btn ${activeTabMobile === 'rosa' ? 'active' : ''}`}
              onClick={() => setActiveTabMobile('rosa')}
            >
              Rosa ({rosaAttuale.length}/25)
            </button>
          </div>

          <div className="workspace-grid">
            
            {/* TAB/COLONNA SINISTRA: LISTONE MERCATO */}
            <div className={`workspace-column market-pool-box ${activeTabMobile === 'market' ? 'show-mobile' : 'hide-mobile'}`}>
              <div className="column-header">
                <h3>Acquista Calciatori</h3>
                <span className="badge-count-liberi">{calciatoriFiltrati.length}</span>
              </div>

              <div className="filter-controls">
                <div className="search-wrapper">
                  <input
                    type="text"
                    placeholder="Cerca calciatore..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
                  )}
                </div>
                
                <div className="role-btn-group">
                  {['P', 'D', 'C', 'A'].map(r => (
                    <button
                      key={r}
                      className={`role-filter-btn ${r} ${filtroRuolo === r ? 'active' : ''}`}
                      onClick={() => setFiltroRuolo(r)}
                    >
                      <span className="role-letter">{r}</span>
                      <span className="role-fraction">{conteggioRuoli[r]}/{LIMITI_RUOLI[r]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-players-list scrollable">
                {calciatoriFiltrati.length === 0 ? (
                  <p className="empty-notice">Nessun calciatore trovato.</p>
                ) : (
                  calciatoriFiltrati.map(player => {
                    const isOccupato = calciatoriOccupatiIds.includes(player.id);
                    const limiteRaggiunto = conteggioRuoli[player.ruolo] >= LIMITI_RUOLI[player.ruolo];
                    
                    return (
                      <div key={player.id} className={`player-admin-card ${isOccupato ? 'disabled-item' : ''}`}>
                        <div className="player-info-side">
                          <span className={`role-indicator ${player.ruolo}`}>{player.ruolo}</span>
                          <div className="player-meta">
                            <div className="player-name-row">
                              <BandieraNazionale nazione={player.nazionale} className="admin-flag" />
                              <strong className="player-name-txt">{player.nome}</strong>
                            </div>
                          </div>
                        </div>
                        {isOccupato ? (
                          <span className="status-occupied">🔒 Bloccato</span>
                        ) : limiteRaggiunto ? (
                          <span className="status-limit-reached">⚠️ Pieno</span>
                        ) : (
                          <button
                            className="btn-admin-action add"
                            onClick={() => handleAggiungiCalciatore(player)}
                          >
                            Acquista
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* TAB/COLONNA DESTRA: ROSA ATTUALE COMPATTA */}
            <div className={`workspace-column current-rosa-box ${activeTabMobile === 'rosa' ? 'show-mobile' : 'hide-mobile'}`}>
              <div className="column-header flex-header">
                <h3>Rosa Attuale</h3>
                <span className="badge-count-rosa">{rosaAttuale.length} / 25</span>
              </div>

              {/* Riepilogo Ruoli Orizzontale con alert cromatico */}
              <div className="team-roles-summary">
                {['P', 'D', 'C', 'A'].map(r => (
                  <div key={r} className={`summary-chip ${r} ${conteggioRuoli[r] >= LIMITI_RUOLI[r] ? 'full' : ''}`}>
                    {r}: <strong>{conteggioRuoli[r]}/{LIMITI_RUOLI[r]}</strong>
                  </div>
                ))}
              </div>

              {rosaAttuale.length === 0 ? (
                <div className="empty-notice-box">
                  <p className="empty-notice">La rosa di questo club è vuota.<br/>Usa il pannello "Acquista" per ingaggiare calciatori.</p>
                </div>
              ) : (
                <div className="admin-players-list scrollable-rosa">
                  {rosaAttuale.map(player => (
                    <div key={player.id} className="player-admin-card current-team-row">
                      <div className="player-info-side">
                        <span className={`role-indicator ${player.ruolo}`}>{player.ruolo}</span>
                        <div className="player-meta">
                          <div className="player-name-row">
                            <BandieraNazionale nazione={player.nazionale} className="admin-flag" />
                            <strong className="player-name-txt-white">{player.nome}</strong>
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn-admin-action delete"
                        onClick={() => handleRimuoviCalciatore(player.id)}
                      >
                        Svincola 🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div className="select-squadra-placeholder">
          <div className="placeholder-icon">📋</div>
          <h3>Nessun club selezionato</h3>
          <p>Scegli una squadra dal menu in alto per visualizzare la rosa attuale ed effettuare operazioni di mercato.</p>
        </div>
      )}
    </div>
  );
};

export default GestioneRose;