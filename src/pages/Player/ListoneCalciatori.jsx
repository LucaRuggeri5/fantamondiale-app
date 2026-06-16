import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import BandieraNazionale from '../../components/BandieraNazionale/BandieraNazionale'; 
import './ListoneCalciatori.css';

// --- IMPORT COMPONENTE BACK BUTTON TATTICO ---
import TacticalBackButton from '../../components/TacticalBackButton/TacticalBackButton';

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
            
            // Se i record restituiti sono inferiori a 1000, siamo arrivati alla fine della tabella
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

  // 2. ESTRAZIONE DINAMICA DELLE NAZIONALI (Ordinate alfabeticamente)
  const nazioni = useMemo(() => {
    const listaNazioni = tuttiICalciatori
      .map(c => c.nazionale)
      .filter(n => n && n.trim() !== '');
    return [...new Set(listaNazioni)].sort((a, b) => a.localeCompare(b));
  }, [tuttiICalciatori]);

  // 3. MAPPA DEI CALCIATORI DIVISI PER NAZIONE (Già pronti in memoria per l'accordion)
  const calciatoriPerNazione = useMemo(() => {
    const mappa = {};
    
    nazioni.forEach(nazione => {
      mappa[nazione] = [];
    });

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
      if (a.nazionale !== b.nazionale) return a.nazionale.localeCompare(b.nazionale);
      const pesoA = ordineRuoli[a.ruolo] || 99;
      const pesoB = ordineRuoli[b.ruolo] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.nome.localeCompare(b.nome);
    });
  }, [tuttiICalciatori, cercaNome, ruoloSelezionato, isFiltrato]);

  const toggleNazione = (nazione) => {
    setNazioneEspansa(nazioneEspansa === nazione ? null : nazione);
  };

  if (loading) {
    return <div className="tactical-listone-loading">Sincronizzazione Database Mondiale in corso... ⏳</div>;
  }

  return (
    <div className="tactical-app-container tactical-listone-page">
      {/* Intestazione e Pulsante di Ritorno */}
      <div className="tactical-listone-header-section">
        <div className="tactical-listone-header">
          <TacticalBackButton />
          <h2 className="tactical-brand">Listone Calciatori</h2>
        </div>
      </div>

      {/* FILTRI DI RICERCA SINTETIZZATI */}
      <div className="tactical-listone-filtri-box">
        <div className="tactical-input-search-wrapper">
          <input 
            type="text" 
            placeholder="Cerca calciatore per nome..." 
            className="tactical-search-calciatore-input"
            value={cercaNome}
            onChange={(e) => setCercaNome(e.target.value)}
          />
        </div>
        
        <div className="tactical-ruolo-filter-row">
          {['TUTTI', 'P', 'D', 'C', 'A'].map(r => (
            <button
              key={r}
              className={`tactical-filter-role-btn ${ruoloSelezionato === r ? 'is-active' : ''} tactical-role-${r}`}
              onClick={() => setRuoloSelezionato(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* CONTEGGIO METADATI RISULTATI */}
      <p className="tactical-risultati-count">
        {isFiltrato 
          ? `Risultati ricerca: ${calciatoriFiltrati.length} calciatori trovati` 
          : `Competizione Mondiale: ${nazioni.length} Nazionali caricate (${tuttiICalciatori.length} calciatori totali)`
        }
      </p>

      {/* CONTENUTO DINAMICO AD ALTE PRESTAZIONI */}
      <div className="tactical-listone-main-wrapper">
        {!isFiltrato ? (
          /* 1. MODALITÀ STANDARD: ACCORDION NAZIONALI */
          <div className="tactical-nazioni-blocks-container">
            {nazioni.map(nazione => {
              const isOpen = nazioneEspansa === nazione;
              const listaGiocatori = calciatoriPerNazione[nazione] || [];

              return (
                <div key={nazione} className={`tactical-nazione-block-card ${isOpen ? 'is-open' : ''}`}>
                  <div 
                    className="tactical-nazione-block-header tactical-clickable" 
                    onClick={() => toggleNazione(nazione)}
                  >
                    <h3>
                      <BandieraNazionale nazione={nazione} />
                      <span className="tactical-nazione-title-text">{nazione.toUpperCase()}</span>
                    </h3>
                    <div className="tactical-header-right-zone">
                      <span className="tactical-nazione-count-badge">
                        {listaGiocatori.length} convocati
                      </span>
                      <span className="tactical-accordion-arrow">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {/* Lista interna espandibile istantaneamente */}
                  {isOpen && (
                    <div className="tactical-nazione-block-players tactical-animate-fade-in">
                      {listaGiocatori.length === 0 ? (
                        <div className="tactical-loading-players-mini">Nessun calciatore presente per questa nazione.</div>
                      ) : (
                        listaGiocatori.map(c => (
                          <div key={c.id} className={`tactical-listone-player-mini-row tactical-border-${c.ruolo}`}>
                            <div className="tactical-mini-row-left">
                              <span className={`tactical-listone-ruolo-badge tactical-role-${c.ruolo}`}>{c.ruolo}</span>
                              <span className="tactical-calc-name">{c.nome}</span>
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
          /* 2. MODALITÀ FILTRATA: LISTA LINEARE DIRETTALE */
          <div className="tactical-listone-linear-list">
            {calciatoriFiltrati.length === 0 ? (
              <p className="tactical-no-data-msg">Nessun calciatore corrisponde ai criteri impostati.</p>
            ) : (
              calciatoriFiltrati.map(c => (
                <div key={c.id} className={`tactical-calciatore-listone-row tactical-border-${c.ruolo}`}>
                  <div className="tactical-left-calc-info">
                    <span className={`tactical-listone-ruolo-badge tactical-role-${c.ruolo}`}>{c.ruolo}</span>
                    <div className="tactical-name-nat-block">
                      <span className="tactical-calc-name">{c.nome}</span>
                      <span className="tactical-calc-nat">
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