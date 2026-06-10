import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Award, Scale } from 'lucide-react';
import './Regolamento.css';

const Regolamento = () => {
  const navigate = useNavigate();

  return (
    <div className="tactical-app-container tactical-regolamento-page">
      <div className="tactical-regolamento-card">
        {/* Pulsante di navigazione coerente */}
        <button className="tactical-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Indietro
        </button>

        <div className="tactical-regolamento-header-section">
          <div className="tactical-regolamento-icon">
            <FileText size={40} strokeWidth={1.5} />
          </div>
          <h1 className="tactical-regolamento-title">Regolamento Ufficiale</h1>
          <p className="tactical-regolamento-subtitle">FantaMondiale 2026</p>
        </div>
        
        <div className="tactical-regolamento-divider"></div>
        
        <div className="tactical-regolamento-body-content">
          
          {/* ARTICOLO 1 */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 1 – Disposizioni generali</h2>
            
            <div className="tactical-rule-block">
              <h3>1.1 Composizione delle rose</h3>
              <p>Ogni partecipante è tenuto a costruire una rosa composta tassativamente come segue:</p>
              <ul className="tactical-rule-list">
                <li><strong>3</strong> Portieri</li>
                <li><strong>8</strong> Difensori</li>
                <li><strong>8</strong> Centrocampisti</li>
                <li><strong>6</strong> Attaccanti</li>
              </ul>
            </div>

            <div className="tactical-rule-block">
              <h3>1.2 Crediti iniziali</h3>
              <p>Ogni squadra dispone, ai fini dell’asta iniziale, di un budget fisso pari a <strong>500 crediti</strong>.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.3 Fonti ufficiali</h3>
              <p>La determinazione dei ruoli dei calciatori avviene esclusivamente tramite la piattaforma <strong>FantaPazz</strong>.</p>
              <p>I voti ufficiali delle prestazioni vengono acquisiti dalla piattaforma <strong>Pianeta Fantacalcio (sezione rossa)</strong>.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.4 Consegna delle formazioni</h3>
              <p>Il mancato inserimento della formazione entro i termini stabiliti dall’applicazione comporta l’applicazione di una <strong>penalità pari a -10 punti</strong> nella classifica generale.</p>
              <p>La squadra inadempiente è inoltre tenuta a schierare una formazione valida, escludendo i calciatori appartenenti a gare già iniziate al momento della sottomissione.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.5 Errori di registrazione voti</h3>
              <p>In caso di errori nella compilazione o gestione dei voti da parte dei fantallenatori, sarà applicata una <strong>penalità pari a -3 punti</strong>, oltre all’annullamento e al ricalcolo dell’eventuale vantaggio impropriamente ottenuto.</p>
              <p>Qualora l’errore comporti una variazione in diminuzione del punteggio (errore "per difetto"), non verrà applicata alcuna sanzione disciplinare.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.6 Quota di partecipazione</h3>
              <p>La partecipazione al torneo è subordinata al versamento di una quota di iscrizione pari a <strong>30€ per squadra</strong>.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.7 Premi</h3>
              <p>Il montepremi complessivo viene redistribuito secondo la seguente gerarchia:</p>
              <ul className="tactical-rule-list">
                <li><strong>1° Classificato:</strong> 150€</li>
                <li><strong>2° Classificato:</strong> 60€</li>
              </ul>
            </div>

            <div className="tactical-rule-block">
              <h3>1.8 Casi non disciplinati</h3>
              <p>Tutte le casistiche non espressamente previste dal presente documento saranno sottoposte a votazione vincolante tramite sondaggio ufficiale all'interno del gruppo WhatsApp dedicato. Ogni squadra ha diritto a un solo voto per ciascuna delibera.</p>
            </div>
          </section>

          {/* ARTICOLO 2 */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 2 – Regole speciali</h2>

            <div className="tactical-rule-block">
              <h3>2.1 Bonus imbattibilità portiere</h3>
              <p>Il bonus "imbattibilità portiere" (+1) viene riconosciuto esclusivamente qualora il portiere abbia disputato <strong>almeno 30 minuti effettivi</strong> nel proprio ruolo sul terreno di gioco.</p>
              <p>Qualora i portali di riferimento attribuiscano il voto al giocatore senza il raggiungimento di tale minutaggio minimo, il bonus non sarà conteggiato.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>2.2 Giocatori non portieri in porta</h3>
              <p>Nel caso in cui un calciatore di movimento venga schierato o si ritrovi a causa di contingenze a ricoprire il ruolo di portiere, non verranno attribuiti i bonus o i malus specifici legati alla prestazione del portiere (es. gol subito, rigore parato).</p>
            </div>

            <div className="tactical-rule-block">
              <h3>2.3 Sostituzioni per infortunio pre-competizione</h3>
              <p>Qualora, prima dell’inizio ufficiale della competizione, un calciatore registrato venga escluso a causa di un infortunio certificato che ne impedisca la partecipazione al ritiro o all'intero torneo, la squadra ha diritto alla sostituzione con un calciatore del medesimo ruolo.</p>
              <p>Il valore del nuovo elemento deve essere <strong>uguale o inferiore</strong> rispetto al giocatore sostituito, secondo le quotazioni della lista ufficiale FantaPazz.</p>
              <p>Nel caso di più sostituzioni simultanee nello stesso ruolo:</p>
              <ul className="tactical-rule-list">
                <li>Si procederà in ordine di priorità partendo dal giocatore con la quotazione più elevata.</li>
                <li>In caso di perfetta parità di valore, farà fede l’ordine cronologico di comunicazione dell’infortunio.</li>
              </ul>
            </div>

            <div className="tactical-rule-block">
              <h3>2.4 Casi di esclusione definitiva</h3>
              <p>In caso di squalifica o sospensione del giocatore per doping, decesso o qualsiasi altra motivazione amministrativa insorta durante lo svolgimento della competizione, il calciatore <strong>non potrà in alcun modo essere sostituito</strong>.</p>
            </div>
          </section>

          {/* ARTICOLO 3 */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 3 – Sistema di punteggio</h2>
            
            <div className="tactical-tables-wrapper">
              
              {/* TABELLA BONUS */}
              <div className="tactical-table-container">
                <div className="tactical-table-title text-bonus">
                  <CheckCircle2 size={14} style={{ marginRight: '6px' }} /> Bonus
                </div>
                <table className="tactical-score-table">
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Punti</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Goal Segnato</td>
                      <td className="score-positive">+3.0</td>
                    </tr>
                    <tr>
                      <td>Goal su Calcio di Rigore</td>
                      <td className="score-positive">+2.0</td>
                    </tr>
                    <tr>
                      <td>Assist Servito</td>
                      <td className="score-positive">+1.0</td>
                    </tr>
                    <tr>
                      <td>Imbattibilità Portiere</td>
                      <td className="score-positive">+1.0</td>
                    </tr>
                    <tr>
                      <td>Calcio di Rigore Parato</td>
                      <td className="score-positive">+2.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABELLA MALUS */}
              <div className="tactical-table-container">
                <div className="tactical-table-title text-malus">
                  <AlertTriangle size={14} style={{ marginRight: '6px' }} /> Malus
                </div>
                <table className="tactical-score-table">
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Punti</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Goal Subito</td>
                      <td className="score-negative">-1.0</td>
                    </tr>
                    <tr>
                      <td>Ammonizione</td>
                      <td className="score-negative">-0.5</td>
                    </tr>
                    <tr>
                      <td>Espulsione</td>
                      <td className="score-negative">-2.0</td>
                    </tr>
                    <tr>
                      <td>Calcio di Rigore Sbagliato</td>
                      <td className="score-negative">-2.0</td>
                    </tr>
                    <tr>
                      <td>Autogol</td>
                      <td className="score-negative">-2.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Regolamento;