import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import BandieraNazionale from '../../components/BandieraNazionale/BandieraNazionale'; 
import './ListoneCalciatori.css';

const ListoneCalciatori = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Array globale con TUTTI i calciatori attivi del database (superando il limite di 1000)
  const [tuttiICalciatori, setTuttiICalciatori] = useState([]);
  
  const [cercaNome, setCercaNome] = useState('');
  const [ruoloSelezionato, setRuoloSelezionato] = useState('TUTTI');
  const [nazioneEspansa, setNazioneEspansa] = useState(null);

  const ordineRuoli = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };
  const isFiltrato = cercaNome.trim() !== '' || ruoloSelezionato !== 'TUTTI';

  // 1. PAGINAZIONE CICLICA AUTOMATICA: Scarica l'intero database in background senza interruzioni
  useEffect(() => {
    const fetchTuttiICalciatori = async () => {
      try {
        setLoading(true);
        let listaCompleta = [];
        let rigaIniziale = 0;
        let rigaFinale = 999;
        let continuaScaricamento = true;

        // Cicla automaticamente finché Supabase restituisce record (supera il blocco dei 1000)
        while (continuaScaricamento) {
          const { data, error } = await supabase
            .from('calciatori_reali')
            .select('*')
            .eq('stato', 'attivo')
            .range(rigaIniziale, rigaFinale);

          if (error) throw error;

          if (data && data.length > 0) {
            listaCompleta = [...listaCompleta, ...data];
            
            // Se i record restituiti sono inferiori a 1000, significa che siamo arrivati alla fine della tabella
            if (data.length < 1000) {
              continuaScaricamento = false;
            } else {
              // Sposta il range in avanti per il prossimo blocco (es. 1000-1999)
              rigaIniziale += 1000;
              rigaFinale += 1000;
            }
          } else {
            continuaScaricamento = false;
          }
        }

        setTuttiICalciatori(listaCompleta);
      } catch (err) {
        console.error("Errore durante il recupero totale dei calciatori:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTuttiICalciatori();
  }, []);

  // 2. ESTRAZIONE DINAMICA DELLE 48 NAZIONALI (Ordinate alfabeticamente)
  const nazioni = useMemo(() => {
    const listaNazioni = tuttiICalciatori
      .map(c => c.nazionale)
      .filter(n => n && n.trim() !== '');
    return [...new Set(listaNazioni)].sort((a, b) => a.localeCompare(b));
  }, [tuttiICalciatori]);

  // 3. MAPPA DEI CALCIATORI DIVISI PER NAZIONE (Già pronti in memoria per l'accordion)
  const calciatoriPerNazione = useMemo(() => {
    const mappa = {};
    
    // Inizializza la mappa per ogni nazione trovata
    nazioni.forEach(nazione => {
      mappa[nazione] = [];
    });

    // Raggruppa i calciatori nella propria nazione di appartenenza
    tuttiICalciatori.forEach(c => {
      if (mappa[c.nazionale]) {
        mappa[c.nazionale].push(c);
      }
    });

    // Ordina i giocatori di ogni singola nazione per Ruolo (P, D, C, A) e Nome
    Object.keys(mappa).forEach(nazione => {
      mappa[nazione].sort((a, b) => {
        const pesoA = ordineRuoli[a.ruolo] || 99;
        const pesoB = ordineRuoli[b.ruolo] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.nome.localeCompare(b.nome);
      });
    });

    return mappa;
  }, [tuttiICalciatori, nazioni]);

  // 4. FILTRO DI RICERCA LOCALE ISTANTANEO (Per nome o ruolo)
  const calciatoriFiltrati = useMemo(() => {
    if (!isFiltrato) return [];

    return tuttiICalciatori.filter(c => {
      const matchRuolo = ruoloSelezionato === 'TUTTI' || c.ruolo === ruoloSelezionato;
      const matchNome = cercaNome.trim() === '' || c.nome.toLowerCase().includes(cercaNome.toLowerCase());
      return matchRuolo && matchNome;
    }).sort((a, b) => {
      // Ordina i risultati filtrati prima per Nazionale, poi per Ruolo e Nome
      if (a.nazionale !== b.nazionale) return a.nazionale.localeCompare(b.nazionale);
      const pesoA = ordineRuoli[a.ruolo] || 99;
      const pesoB = ordineRuoli[b.ruolo] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.nome.localeCompare(b.nome);
    });
  }, [tuttiICalciatori, cercaNome, ruoloSelezionato, isFiltrato]);

  // Gestore apertura/chiusura dei blocchi nazionali (Istantaneo perché i dati sono già in memoria)
  const toggleNazione = (nazione) => {
    setNazioneEspansa(nazioneEspansa === nazione ? null : nazione);
  };

  if (loading) {
    return <div className="player-loading">Sincronizzazione Database Mondiale in corso... ⏳</div>;
  }

  return (
    <div className="player-page-container">
      <button className="listone-back-btn" onClick={() => navigate('/dashboard')}>
        ← Torna Indietro
      </button>

      <div className="player-page-header">
        <h2>Listone Calciatori</h2>
        <p className="player-page-subtitle">Tocca una Nazionale per scoprire la lista completa dei suoi 26 convocati.</p>
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
        {isFiltrato 
          ? `Risultati ricerca: ${calciatoriFiltrati.length} calciatori trovati` 
          : `Competizione Mondiale: ${nazioni.length} Nazionali caricate (${tuttiICalciatori.length} calciatori totali)`
        }
      </p>

      {/* CONTENUTO DINAMICO */}
      <div className="listone-main-wrapper">
        {!isFiltrato ? (
          /* 1. SE NON CI SONO FILTRI: MOSTRA I BLOCCHI DELLE NAZIONALI (ACCORDION ISTANTANEO) */
          <div className="nazioni-blocks-container">
            {nazioni.map(nazione => {
              const isOpen = nazioneEspansa === nazione;
              const listaGiocatori = calciatoriPerNazione[nazione] || [];

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
                      <span className="nazione-count-badge">
                        {listaGiocatori.length} convocati
                      </span>
                      <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {/* Contenuto interno ad apertura immediata */}
                  {isOpen && (
                    <div className="nazione-block-players animate-fade-in">
                      {listaGiocatori.length === 0 ? (
                        <div className="loading-players-mini">Nessun calciatore presente per questa nazione.</div>
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
          /* 2. SE CI SONO FILTRI ATTIVI: MOSTRA LA LISTA FILTRATA IN TEMPO REALE */
          <div className="listone-linear-list">
            {calciatoriFiltrati.length === 0 ? (
              <p className="no-data-msg">Nessun calciatore corrisponde ai criteri impostati.</p>
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