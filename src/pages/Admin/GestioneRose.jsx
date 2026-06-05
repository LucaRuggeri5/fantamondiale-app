import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '@clerk/clerk-react';
import BandieraNazionale from '../../components/BandieraNazionale/BandieraNazionale';
import './GestioneRose.css';

// Costante immutabile per il controllo dei vincoli di rosa della federazione interna
const LIMITI_RUOLI = {
  P: 3,
  D: 8,
  C: 8,
  A: 6
};

/**
 * Pannello di Controllo Mercato e Rose riservato all'Amministratore di Lega.
 * Permette operazioni massive di acquisto/svincolo con layout sincronizzato Desktop/Mobile.
 */
const GestioneRose = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // Stati di caricamento asincroni distinti per non bloccare l'intera UI
  const [loading, setLoading] = useState(true);
  const [loadingListone, setLoadingListone] = useState(false);
  
  // Contesto amministrativo e selezione del club target
  const [adminUser, setAdminUser] = useState(null);
  const [squadreLega, setSquadreLega] = useState([]);
  const [selectedSquadraId, setSelectedSquadraId] = useState('');

  // Liste dati per la sincronizzazione dei blocchi di mercato
  const [rosaAttuale, setRosaAttuale] = useState([]);
  const [listoneCalciatori, setListoneCalciatori] = useState([]);
  const [calciatoriOccupatiIds, setCalciatoriOccupatiIds] = useState([]);
  
  // Filtri attivi sul listone di mercato
  const [filtroRuolo, setFiltroRuolo] = useState('P');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UX Mobile-First: gestisce la visualizzazione a schede sui display ridotti
  const [activeTabMobile, setActiveTabMobile] = useState('market');

  /**
   * Effettua il recupero dei dati dell'utente loggato e mappa i club iscritti alla stessa lega.
   */
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

  /**
   * Estrae i calciatori assegnati alla squadra selezionata e compila la lista di blocco globale della lega.
   */
  const loadRosaESvincolati = async () => {
    if (!selectedSquadraId || !adminUser?.lega_id) {
      setRosaAttuale([]);
      return;
    }

    try {
      // 1. Estrazione della rosa del club selezionato
      const { data: rosa, error: rErr } = await supabase
        .from('rose_squadre')
        .select('calciatore_id, calciatori_reali(*)')
        .eq('squadra_id', selectedSquadraId);
      
      if (rErr) throw rErr;
      
      const rosaOrdinata = (rosa?.map(item => item.calciatori_reali) || [])
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome));
      
      setRosaAttuale(rosaOrdinata);

      // 2. Estrazione degli ID vincolati per l'intera lega per prevenire duplicazioni di mercato
      const { data: occupati, error: oErr } = await supabase
        .from('rose_squadre')
        .select('calciatore_id')
        .eq('lega_id', adminUser.lega_id);
      
      if (oErr) throw oErr;
      setCalciatoriOccupatiIds(occupati?.map(o => o.calciatore_id) || []);

    } catch (err) {
      console.error("Errore nel caricamento dei dati della rosa:", err);
    }
  };

  // Caricamento del profilo amministratore all'avvio
  useEffect(() => {
    loadAdminContext();
  }, [user]);

  // Re-idratazione dati della squadra ad ogni cambio di selezione del menu a tendina
  useEffect(() => {
    loadRosaESvincolati();
  }, [selectedSquadraId]);

  // Effetto di interrogazione con protezione Debounce per la ricerca testuale e filtri ruolo
  useEffect(() => {
    const fetchListoneFiltrato = async () => {
      if (!selectedSquadraId || !adminUser?.lega_id) return;

      try {
        setLoadingListone(true);
        
        let query = supabase
          .from('calciatori_reali')
          .select('*')
          .eq('stato', 'attivo')
          .eq('ruolo', filtroRuolo)
          .order('nome', { ascending: true })
          .range(0, 400);

        if (searchQuery.trim() !== '') {
          query = query.ilike('nome', `%${searchQuery}%`);
        }

        const { data: listone, error: lErr } = await query;
        if (lErr) throw lErr;

        setListoneCalciatori(listone || []);
      } catch (err) {
        console.error("Errore nel caricamento del listone filtrato:", err);
      } finally {
        setLoadingListone(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchListoneFiltrato();
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [filtroRuolo, searchQuery, selectedSquadraId, adminUser]);

  // Conteggio memorizzato per evitare ricalcoli inutili durante lo scrolling del listone
  const conteggioRuoli = useMemo(() => {
    const contatori = { P: 0, D: 0, C: 0, A: 0 };
    rosaAttuale.forEach(p => {
      if (contatori[p.ruolo] !== undefined) contatori[p.ruolo]++;
    });
    return contatori;
  }, [rosaAttuale]);

  /**
   * Effettua l'acquisto del calciatore previa verifica dei vincoli numerici per quel ruolo.
   */
  const handleAggiungiCalciatore = async (player) => {
    const ruoloPlayer = player.ruolo;
    const attualePerRuolo = conteggioRuoli[ruoloPlayer] || 0;
    const limiteMassimo = LIMITI_RUOLI[ruoloPlayer];

    if (attualePerRuolo >= limiteMassimo) {
      alert(`Impossibile aggiungere ${player.nome}. Limite per il ruolo "${ruoloPlayer}" raggiunto (${limiteMassimo}).`);
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
      console.error("Errore durante l'inserimento a database:", err);
    }
  };

  /**
   * Elimina la riga di associazione svincolando il calciatore istantaneamente.
   */
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
      console.error("Errore durante la rimozione da database:", err);
    }
  };

  if (loading) {
    return (
      <div className="tactical-app-container tactical-rose-loading">
        <span className="tactical-spinner-text">Caricamento strumenti federali di amministrazione... 👑</span>
      </div>
    );
  }

  return (
    <div className="tactical-app-container tactical-rose-container">
      
      {/* INTESTAZIONE DI CONTROLLO */}
      <div className="tactical-rose-header">
        <button className="tactical-btn-back-suite" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="tactical-title-group">
          <h2>Gestione Rose & Mercato</h2>
        </div>
      </div>

      {/* SELETTORE CLUB TARGET */}
      <div className="tactical-select-club-box">
        <label htmlFor="club-select">Seleziona Club da Modificare d'Autorità</label>
        <select
          id="club-select"
          value={selectedSquadraId}
          onChange={(e) => setSelectedSquadraId(e.target.value)}
          className="tactical-select-input-suite"
        >
          <option value="">-- Scegli una squadra dal registro --</option>
          {squadreLega.map(sq => (
            <option key={sq.id} value={sq.id}>{sq.nome}</option>
          ))}
        </select>
      </div>

      {selectedSquadraId ? (
        <div className="tactical-workspace-wrapper">
          
          {/* NAVIGAZIONE A TAB SOLO PER DISPOSITIVI MOBILE */}
          <div className="tactical-mobile-tabs-nav">
            <button 
              className={`tactical-tab-btn ${activeTabMobile === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTabMobile('market')}
            >
              Acquista Svincolati
            </button>
            <button 
              className={`tactical-tab-btn ${activeTabMobile === 'rosa' ? 'active' : ''}`}
              onClick={() => setActiveTabMobile('rosa')}
            >
              Rosa Attuale ({rosaAttuale.length}/25)
            </button>
          </div>

          <div className="tactical-workspace-grid">
            
            {/* SEZIONE MERCATO: LISTONE ACQUISTI */}
            <div className={`tactical-column-card ${activeTabMobile === 'market' ? 'show-mobile' : 'hide-mobile'}`}>
              <div className="tactical-column-card-header">
                <h3>Acquista Calciatori Svincolati</h3>
              </div>

              {/* FILTRI DI RICERCA INTERNI */}
              <div className="tactical-filter-panel">
                <div className="tactical-search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Cerca per cognome calciatore..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="tactical-market-search"
                  />
                  {searchQuery && (
                    <button className="tactical-clear-search" onClick={() => setSearchQuery('')}>×</button>
                  )}
                </div>
                
                {/* GRUPPO FILTRI RUOLO CON DIGITAZIONE FRAZIONARIA */}
                <div className="tactical-role-grid-selector">
                  {['P', 'D', 'C', 'A'].map(r => (
                    <button
                      key={r}
                      className={`tactical-role-filter-tab ${r} ${filtroRuolo === r ? 'active' : ''}`}
                      onClick={() => setFiltroRuolo(r)}
                    >
                      <span className="role-main-letter">{r}</span>
                      <span className="role-sub-fraction">{conteggioRuoli[r]}/{LIMITI_RUOLI[r]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LISTA GIOCATORI ACQUISTABILI */}
              <div className="tactical-scrollable-pool">
                {loadingListone ? (
                  <p className="tactical-market-async-loader">Interrogazione registro atleti in corso... ⏳</p>
                ) : listoneCalciatori.length === 0 ? (
                  <p className="tactical-empty-notice-txt">Nessun atleta corrispondente ai criteri inseriti.</p>
                ) : (
                  listoneCalciatori.map(player => {
                    const isOccupato = calciatoriOccupatiIds.includes(player.id);
                    const limiteRaggiunto = conteggioRuoli[player.ruolo] >= LIMITI_RUOLI[player.ruolo];
                    
                    return (
                      <div key={player.id} className={`tactical-market-row-item ${isOccupato ? 'item-locked' : ''}`}>
                        <div className="tactical-player-core-side">
                          <span className={`tactical-badge-role-indicator ${player.ruolo}`}>{player.ruolo}</span>
                          <div className="tactical-player-identity">
                            <BandieraNazionale nazione={player.nazionale} className="tactical-flag-margin" />
                            <span className="tactical-player-fullname">{player.nome}</span>
                          </div>
                        </div>
                        
                        {isOccupato ? (
                          <span className="tactical-status-tag locked">🔒 Riservato</span>
                        ) : limiteRaggiunto ? (
                          <span className="tactical-status-tag capped">⚠️ Slot Pieno</span>
                        ) : (
                          <button
                            className="tactical-action-btn-trigger add"
                            onClick={() => handleAggiungiCalciatore(player)}
                          >
                            Ingaggia
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SEZIONE SQUADRA: DETTAGLIO ROSA INTERNA */}
            <div className={`tactical-column-card ${activeTabMobile === 'rosa' ? 'show-mobile' : 'hide-mobile'}`}>
              <div className="tactical-column-card-header tactical-space-between-header">
                <h3>Rosa Attuale del Club</h3>
                <span className="tactical-global-badge-count">{rosaAttuale.length} / 25</span>
              </div>

              {/* CHIPS RIEPILOGATIVE ORIZZONTALI */}
              <div className="tactical-horizontal-summary-bar">
                {['P', 'D', 'C', 'A'].map(r => (
                  <div key={r} className={`tactical-summary-chip-item ${r} ${conteggioRuoli[r] >= LIMITI_RUOLI[r] ? 'is-filled' : ''}`}>
                    {r}: {conteggioRuoli[r]}/{LIMITI_RUOLI[r]}
                  </div>
                ))}
              </div>

              {rosaAttuale.length === 0 ? (
                <div className="tactical-empty-placeholder-box">
                  <p>L'organico del club selezionato è attualmente vuoto.<br/>Utilizza lo specchietto di sinistra per completare gli ingaggi.</p>
                </div>
              ) : (
                <div className="tactical-scrollable-pool">
                  {rosaAttuale.map(player => (
                    <div key={player.id} className="tactical-market-row-item tactical-owned-row">
                      <div className="tactical-player-core-side">
                        <span className={`tactical-badge-role-indicator ${player.ruolo}`}>{player.ruolo}</span>
                        <div className="tactical-player-identity">
                          <BandieraNazionale nazione={player.nazionale} className="tactical-flag-margin" />
                          <span className="tactical-player-fullname primary-white">{player.nome}</span>
                        </div>
                      </div>
                      <button
                        className="tactical-action-btn-trigger remove"
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
        /* STATO DI ATTESA SELEZIONE */
        <div className="tactical-unselected-placeholder-screen">
          <div className="tactical-placeholder-glyph">📋</div>
          <h3>Nessun Club Sotto Esame</h3>
          <p>Usa il menu a tendina superiore per caricare l'anagrafica di un club e gestire i contratti dei fanta-atleti.</p>
        </div>
      )}
    </div>
  );
};

export default GestioneRose;