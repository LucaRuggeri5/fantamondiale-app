import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import BandieraNazionale from '../../components/BandieraNazionale/BandieraNazionale'; // Sistema il path in base alla tua cartella
import './ListoneCalciatori.css';

const ListoneCalciatori = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calciatori, setCalciatori] = useState([]);
  const [cercaNome, setCercaNome] = useState('');
  const [ruoloSelezionato, setRuoloSelezionato] = useState('TUTTI');

  useEffect(() => {
    const fetchListone = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('calciatori_reali')
          .select('*')
          .order('nazionale', { ascending: true })
          .order('ruolo', { ascending: true })
          .order('nome', { ascending: true });

        if (error) throw error;
        setCalciatori(data || []);
      } catch (err) {
        console.error("Errore caricamento listone:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListone();
  }, []);

  const ordineRuoli = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };

  const calciatoriFiltrati = calciatori.filter(c => {
    const matchNome = c.nome ? c.nome.toLowerCase().includes(cercaNome.toLowerCase()) : false;
    const matchRuolo = ruoloSelezionato === 'TUTTI' || c.ruolo === ruoloSelezionato;
    return matchNome && matchRuolo;
  });

  const isFiltrato = cercaNome.trim() !== '' || ruoloSelezionato !== 'TUTTI';

  const raggruppaPerNazionale = (lista) => {
    const gruppi = {};
    lista.forEach(c => {
      const naz = c.nazionale || 'Senza Nazionale';
      if (!gruppi[naz]) {
        gruppi[naz] = [];
      }
      gruppi[naz].push(c);
    });

    Object.keys(gruppi).forEach(naz => {
      gruppi[naz].sort((a, b) => {
        const pesoA = ordineRuoli[a.ruolo] || 99;
        const pesoB = ordineRuoli[b.ruolo] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.nome.localeCompare(b.nome);
      });
    });

    return gruppi;
  };

  if (loading) return <div className="player-loading">Caricamento listone calciatori... ⏳</div>;

  const calciatoriRaggruppati = raggruppaPerNazionale(calciatoriFiltrati);
  const nazioniOrdinate = Object.keys(calciatoriRaggruppati).sort((a, b) => a.localeCompare(b));

  return (
    <div className="player-page-container">
      {/* Pulsante per tornare indietro coerente */}
      <button className="listone-back-btn" onClick={() => navigate('/dashboard')}>
        ← Torna Indietro
      </button>

      <div className="player-page-header">
        <h2>Listone Calciatori</h2>
        <p className="player-page-subtitle">Tutti i protagonisti del mondiale.</p>
      </div>

      {/* FILTRI DI RICERCA */}
      <div className="listone-filtri-box">
        <input 
          type="text" 
          placeholder="Cerca calciatore per nome..." 
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
          ? `Risultati ricerca: ${calciatoriFiltrati.length} calciatori` 
          : `Database Mondiale: ${calciatori.length} calciatori distribuiti in ${nazioniOrdinate.length} Nazionali`
        }
      </p>

      {/* CONTENUTO DINAMICO */}
      <div className="listone-main-wrapper">
        {calciatoriFiltrati.length === 0 ? (
          <p className="no-data-msg">Nessun calciatore corrisponde ai criteri impostati.</p>
        ) : !isFiltrato ? (
          /* 1. VISUALIZZAZIONE INIZIALE: BLOCCHI PER SQUADRE */
          <div className="nazioni-blocks-container">
            {nazioniOrdinate.map(nazione => (
              <div key={nazione} className="nazione-block-card">
                <div className="nazione-block-header">
                  <h3>
                    <BandieraNazionale nazione={nazione} />
                    {nazione.toUpperCase()}
                  </h3>
                  <span className="nazione-count-badge">
                    {calciatoriRaggruppati[nazione].length} convocati
                  </span>
                </div>
                
                <div className="nazione-block-players">
                  {calciatoriRaggruppati[nazione].map(c => (
                    <div key={c.id} className={`listone-player-mini-row border-${c.ruolo}`}>
                      <div className="mini-row-left">
                        <span className={`listone-ruolo-badge ${c.ruolo}`}>{c.ruolo}</span>
                        <span className="calc-name">{c.nome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 2. VISUALIZZAZIONE FILTRATA: LISTA LINEARE */
          <div className="listone-linear-list">
            {calciatoriFiltrati.map(c => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListoneCalciatori;