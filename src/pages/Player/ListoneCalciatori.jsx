import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import BandieraNazionale from '../../components/BandieraNazionale/BandieraNazionale'; 
import './ListoneCalciatori.css';

const ListoneCalciatori = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // Lista delle sole nazioni distinte presenti nel DB
  const [nazioni, setNazioni] = useState([]);
  
  // Calciatori della singola nazione attualmente espansa (mappa id_nazione -> array calciatori)
  const [calciatoriPerNazione, setCalciatoriPerNazione] = useState({});
  const [loadingNazione, setLoadingNazione] = useState(null); // Tiene traccia di quale nazione sta caricando

  // Stato per i risultati di ricerca globale (quando filtri per nome o ruolo)
  const [calciatoriFiltrati, setCalciatoriFiltrati] = useState([]);

  const [cercaNome, setCercaNome] = useState('');
  const [ruoloSelezionato, setRuoloSelezionato] = useState('TUTTI');
  const [nazioneEspansa, setNazioneEspansa] = useState(null);

  const ordineRuoli = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };
  const isFiltrato = cercaNome.trim() !== '' || ruoloSelezionato !== 'TUTTI';

  // 1. CARICAMENTO INIZIALE: Prende solo l'elenco UNICO delle nazionali (pochissimi dati, velocissimo)
  useEffect(() => {
    const fetchNazioni = async () => {
      try {
        setLoading(true);
        
        // Seleziona solo la colonna nazionale dei calciatori attivi
        const { data, error } = await supabase
          .from('calciatori_reali')
          .select('nazionale')
          .eq('stato', 'attivo');

        if (error) throw error;

        // Estrae i valori unici eliminando i duplicati ed eventuali valori nulli
        const listaNazioniUniche = [
          ...new Set(data.map(item => item.nazionale).filter(Boolean))
        ].sort((a, b) => a.localeCompare(b));

        setNazioni(listaNazioniUniche);
      } catch (err) {
        console.error("Errore caricamento elenco nazionali:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNazioni();
  }, []);

  // 2. QUERY DI RICERCA GLOBALE: Si attiva solo se l'utente digita un nome o filtra per ruolo
  useEffect(() => {
    const gestisciRicercaGlobale = async () => {
      if (!isFiltrato) {
        setCalciatoriFiltrati([]);
        return;
      }

      try {
        setLoadingSearch(true);
        let query = supabase
          .from('calciatori_reali')
          .select('*')
          .eq('stato', 'attivo')
          .order('nazionale', { ascending: true })
          .order('ruolo', { ascending: true })
          .order('nome', { ascending: true });

        if (ruoloSelezionato !== 'TUTTI') {
          query = query.eq('ruolo', ruoloSelezionato);
        }

        if (cercaNome.trim() !== '') {
          query = query.ilike('nome', `%${cercaNome}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setCalciatoriFiltrati(data || []);
      } catch (err) {
        console.error("Errore nella ricerca dei calciatori:", err);
      } finally {
        setLoadingSearch(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      gestisciRicercaGlobale();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [cercaNome, ruoloSelezionato, isFiltrato]);

  // 3. CARICAMENTO ON-DEMAND (LAZY LOADING): Chiamato solo al click sulla singola Nazionale
  const toggleNazione = async (nazione) => {
    if (nazioneEspansa === nazione) {
      setNazioneEspansa(null);
      return;
    }

    setNazioneEspansa(nazione);

    // Se abbiamo già scaricato i calciatori di questa nazione in precedenza, non rifacciamo la query
    if (calciatoriPerNazione[nazione]) return;

    try {
      setLoadingNazione(nazione);
      
      const { data, error } = await supabase
        .from('calciatori_reali')
        .select('*')
        .eq('stato', 'attivo')
        .eq('nazionale', nazione);

      if (error) throw error;

      // Ordina localmente i giocatori di questa specifica nazionale per Ruolo e Nome
      const calciatoriOrdinati = (data || []).sort((a, b) => {
        const pesoA = ordineRuoli[a.ruolo] || 99;
        const pesoB = ordineRuoli[b.ruolo] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.nome.localeCompare(b.nome);
      });

      // Salva i dati nello stato locale mappandoli sotto il nome della nazione
      setCalciatoriPerNazione(prev => ({
        ...prev,
        [nazione]: calciatoriOrdinati
      }));

    } catch (err) {
      console.error(`Errore caricamento rosa per ${nazione}:`, err);
    } finally {
      setLoadingNazione(null);
    }
  };

  if (loading) return <div className="player-loading">Inizializzazione Nazionali in corso... ⏳</div>;

  return (
    <div className="player-page-container">
      <button className="listone-back-btn" onClick={() => navigate('/dashboard')}>
        ← Torna Indietro
      </button>

      <div className="player-page-header">
        <h2>Listone Calciatori</h2>
        <p className="player-page-subtitle">Tocca una Nazionale per scoprire la lista completa dei suoi convocati.</p>
      </div>

      {/* FILTRI DI RICERCA */}
      <div className="listone-filtri-box">
        <input 
          type="text" 
          placeholder="Cerca calciatore per nome in tutto il database..." 
          className="search-calciatore-input"
          value={cercaNome}
          onChange={(e) => setCercaNome(e.target.value)}
        />
        
        <div className="ruolo-filter-row">
          {['TUTTI', 'P', 'D', 'C', 'A'].map(r => (
            <button
              key={r}
              className={`filter-role-btn ${ruoloSelezionato === r ? 'active' : ''} ${r}`}
              onClick={() => setRuoloSelezionato(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* CONTEGGIO RISULTATI */}
      <p className="risultati-count">
        {loadingSearch ? (
          <span>Ricerca nel database globale... ⏳</span>
        ) : isFiltrato 
          ? `Risultati ricerca: ${calciatoriFiltrati.length} calciatori trovati` 
          : `Competizione Mondiale: ${nazioni.length} Nazionali registrate`
        }
      </p>

      {/* CONTENUTO DINAMICO */}
      <div className="listone-main-wrapper">
        {!isFiltrato ? (
          /* 1. SE NON CI SONO FILTRI: ELENCO NAZIONALI CON RICHIESTA ON-CLICK */
          <div className="nazioni-blocks-container">
            {nazioni.map(nazione => {
              const isOpen = nazioneEspansa === nazione;
              const listaGiocatori = calciatoriPerNazione[nazione] || [];
              const staCaricandoLaRosa = loadingNazione === nazione;

              return (
                <div key={nazione} className={`nazione-block-card ${isOpen ? 'is-open' : ''}`}>
                  <div 
                    className="nazione-block-header clickable" 
                    onClick={() => toggleNazione(nazione)}
                  >
                    <h3>
                      <BandieraNazionale nazione={nazione} />
                      {nazione.toUpperCase()}
                    </h3>
                    <div className="header-right-zone">
                      {/* Se abbiamo già i dati mostra la lunghezza reale, altrimenti mostra un indicatore generico prima del click */}
                      <span className="nazione-count-badge">
                        {calciatoriPerNazione[nazione] ? `${listaGiocatori.length} convocati` : 'Vedi rosa'}
                      </span>
                      <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {/* Visualizza la lista solo se espanso */}
                  {isOpen && (
                    <div className="nazione-block-players animate-fade-in">
                      {staCaricandoLaRosa ? (
                        <div className="loading-players-mini">Scaricamento convocati da Supabase... ⏳</div>
                      ) : listaGiocatori.length === 0 ? (
                        <div className="loading-players-mini">Nessun calciatore trovato per questa nazione.</div>
                      ) : (
                        listaGiocatori.map(c => (
                          <div key={c.id} className={`listone-player-mini-row border-${c.ruolo}`}>
                            <div className="mini-row-left">
                              <span className={`listone-ruolo-badge ${c.ruolo}`}>{c.ruolo}</span>
                              <span className="calc-name">{c.nome}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 2. SE CI SONO FILTRI ATTIVI: LISTA LINEARE DIRETTAMENTE DAL DATABASE */
          <div className="listone-linear-list">
            {calciatoriFiltrati.length === 0 ? (
              <p className="no-data-msg">Nessun calciatore corrisponde ai criteri impostati nel DB globale.</p>
            ) : (
              calciatoriFiltrati.map(c => (
                <div key={c.id} className={`calciatore-listone-row border-${c.ruolo}`}>
                  <div className="left-calc-info">
                    <span className={`listone-ruolo-badge ${c.ruolo}`}>{c.ruolo}</span>
                    <div className="name-nat-block">
                      <span className="calc-name">{c.nome}</span>
                      <span className="calc-nat">
                        <BandieraNazionale nazione={c.nazionale} />
                        {c.nazionale || 'N/D'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListoneCalciatori;