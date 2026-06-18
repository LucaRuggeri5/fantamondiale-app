import React from 'react';
// Importiamo il gestore della navigazione tra le pagine dell'app
import { useNavigate } from 'react-router-dom';
// Importiamo le icone necessarie dal pacchetto lucide-react
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
// Importiamo il file dei fogli di stile CSS associato
import './Regolamento.css';

const Regolamento = () => {
  // Inizializziamo la costante per gestire i cambi di pagina
  const navigate = useNavigate();

  return (
    <div className="tactical-app-container tactical-regolamento-page">
      <div className="tactical-regolamento-card">

        {/* Pulsante di navigazione per ritornare alla Dashboard principale */}
        <button className="tactical-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Indietro
        </button>

        {/* Intestazione Grafica del Regolamento */}
        <div className="tactical-regolamento-header-section">
          <div className="tactical-regolamento-icon">
            <FileText size={40} strokeWidth={1.5} />
          </div>
          <h1 className="tactical-regolamento-title">Regolamento Ufficiale</h1>
          <p className="tactical-regolamento-subtitle">FantaMondiale 2026</p>
        </div>

        {/* Linea divisoria estetica sfumata */}
        <div className="tactical-regolamento-divider"></div>

        {/* Contenuto testuale principale diviso per Articoli */}
        <div className="tactical-regolamento-body-content">

          {/* ARTICOLO 1 – Partecipazione e disposizioni generali */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 1 – Partecipazione e disposizioni generali</h2>

            <div className="tactical-rule-block">
              <h3>1.1 Quota di partecipazione</h3>
              <p>La quota di iscrizione al FantaMondiale è fissata in <strong>30 € per squadra</strong>.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.2 Montepremi</h3>
              <p>Il montepremi complessivo sarà distribuito nel seguente modo:</p>
              <ul className="tactical-rule-list">
                <li><strong>1° classificato:</strong> 150 €</li>
                <li><strong>2° classificato:</strong> 60 €</li>
              </ul>
            </div>

            <div className="tactical-rule-block">
              <h3>1.3 Composizione delle rose</h3>
              <p>Ogni squadra dovrà essere composta tassativamente da:</p>
              <ul className="tactical-rule-list">
                <li><strong>3</strong> Portieri</li>
                <li><strong>8</strong> Difensori</li>
                <li><strong>8</strong> Centrocampisti</li>
                <li><strong>6</strong> Attaccanti</li>
              </ul>
            </div>

            <div className="tactical-rule-block">
              <h3>1.4 Crediti iniziali</h3>
              <p>Ogni partecipante avrà a disposizione <strong>500 crediti</strong> per la costruzione della propria rosa.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.5 Fonti ufficiali</h3>
              <p>I ruoli dei calciatori e i voti ufficiali utilizzati per il calcolo dei punteggi saranno quelli forniti da <strong>FantaPazz</strong>.</p>
              <p>I voti verranno acquisiti sempre da <strong>FantaPazz</strong>, sarà possibile trovare i voti tramite il link presente nella sezione "Inserisci Voti" o tramite quello disponibile nella barra laterale dell'applicazione.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>1.6 Casi non previsti dal regolamento</h3>
              <p>Qualsiasi situazione non espressamente disciplinata dal presente regolamento verrà risolta tramite votazione nel gruppo WhatsApp ufficiale del torneo. Ogni squadra avrà diritto a un solo voto.</p>
            </div>
          </section>

          {/* ARTICOLO 2 – Formazioni e inserimento dei voti */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 2 – Formazioni e inserimento dei voti</h2>

            <div className="tactical-rule-block">
              <h3>2.1 Consegna delle formazioni</h3>
              <p>Ogni squadra è tenuta a inserire la propria formazione entro i termini stabiliti dall'applicazione.</p>
              <p>Il mancato inserimento della formazione comporterà una penalità di <strong>10 punti</strong> in classifica generale.</p>
              <p>La squadra inadempiente dovrà comunque schierare una formazione valida, escludendo i giocatori appartenenti a partite già iniziate al momento dell'inserimento.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>2.2 Scadenze per l'inserimento dei voti</h3>
              <p>La finestra temporale per l'inserimento dei voti viene determinata direttamente dall'applicazione. I fantallenatori sono tenuti a rispettare l'orario di chiusura indicato dalla Giornata e nella Pagina Principale.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>2.3 Gestione dei decimali</h3>
              <p>Il sistema accetta esclusivamente voti con decimali pari a <strong>.00</strong> oppure <strong>.50</strong>.</p>
              <p>Qualora FantaPazz riporti votazioni con altri decimali (ad esempio .25 o .75), queste verranno arrotondate per difetto al valore valido più vicino.</p>
              <p><strong>Esempi pratici:</strong></p>

              {/* Tabella ultracompatta esplicativa degli arrotondamenti */}
              <table className="tactical-mini-table">
                <thead>
                  <tr>
                    <th>Voto FantaPazz</th>
                    <th>Voto di Sistema</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>6.00</td>
                    <td className="score-neutral">6.00</td>
                  </tr>
                  <tr>
                    <td>6.25</td>
                    <td className="score-converted">6.00</td>
                  </tr>
                  <tr>
                    <td>6.50</td>
                    <td className="score-neutral">6.50</td>
                  </tr>
                  <tr>
                    <td>6.75</td>
                    <td className="score-converted">6.50</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="tactical-rule-block">
              <h3>2.4 Contestazioni e segnalazioni</h3>
              <p>Le segnalazioni riguardanti eventuali errori commessi dagli avversari saranno considerate valide solo dopo la chiusura della finestra di inserimento dei voti della giornata. Le contestazioni potranno essere presentate entro le successive 48 ore dall'orario di consegna dei voti. Trascorso tale termine, tutti i voti inseriti saranno considerati definitivi, anche quelli errati.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>2.5 Errori di inserimento</h3>
              <p>In caso di errore accertato nell'inserimento dei voti entro i termini previsti, verrà applicata una penalità di <strong>3 punti</strong> in classifica generale, oltre al ricalcolo dell'eventuale vantaggio ottenuto.</p>
              <p>Oltre la penalità di <strong>3 punti</strong> sarà applicata <strong>un'ulteriore penalità</strong> pari al punteggio che la squadra si era impropriamente aggiunto</p>
              <p>Qualora l'errore comporti invece uno svantaggio per la squadra che lo ha commesso, non verrà applicata alcuna penalità.</p>
            </div>
          </section>

          {/* ARTICOLO 3 – Regole speciali */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 3 – Regole speciali</h2>

            <div className="tactical-rule-block">
              <h3>3.1 Bonus imbattibilità del portiere</h3>
              <p>Il bonus imbattibilità (+1) verrà assegnato soltanto se il portiere avrà disputato <strong>almeno 30 minuti effettivi</strong> nel proprio ruolo. Qualora il portale di riferimento assegni comunque il voto al giocatore senza il raggiungimento del minutaggio minimo, il bonus non sarà conteggiato.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>3.2 Giocatori di movimento schierati in porta</h3>
              <p>Nel caso in cui un giocatore di movimento venga impiegato come portiere, non saranno assegnati bonus o malus specifici del ruolo, come gol subiti, rigori parati o porta inviolata.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>3.3 Sostituzioni prima dell'inizio del torneo</h3>
              <p>Nel caso in cui, prima dell'inizio della competizione, un giocatore venga escluso dal torneo a causa di un infortunio certificato, sarà possibile sostituirlo con un calciatore dello stesso ruolo.</p>
              <p>Il nuovo giocatore dovrà avere una quotazione <strong>uguale o inferiore</strong> rispetto a quella del giocatore sostituito, secondo la lista ufficiale FantaPazz.</p>
              <p>Nel caso di più richieste contemporanee nello stesso ruolo, verrà data priorità al giocatore con la quotazione più alta. In caso di parità, farà fede l'ordine cronologico con cui verrà comunicata l'assenza.</p>
            </div>

            <div className="tactical-rule-block">
              <h3>3.4 Esclusioni durante il torneo</h3>
              <p>In caso di squalifica per doping, decesso o altre cause che rendano indisponibile un giocatore durante lo svolgimento della competizione, non sarà possibile procedere alla sua sostituzione.</p>
            </div>
          </section>

          {/* ARTICOLO 4 – Sistema di punteggio */}
          <section className="tactical-rule-section">
            <h2 className="tactical-section-header">Art. 4 – Sistema di punteggio</h2>

            <div className="tactical-rule-block">
              <h3>4.1 Batteria dei rigori</h3>
              <p>I rigori battuti al termine dei tempi supplementari per determinare il passaggio del turno nelle fasi a eliminazione diretta <strong>non saranno considerati</strong> ai fini del calcolo dei voti del fantacalcio. Non verranno pertanto assegnati bonus o malus relativi a rigori segnati, parati o sbagliati durante la serie finale.</p>
            </div>

            {/* Wrapper per disporre le tabelle affiancate su schermi grandi e in colonna su mobile */}
            <div className="tactical-tables-wrapper">

              {/* TABELLA DEI BONUS */}
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
                      <td>Gol segnato</td>
                      <td className="score-positive">+3.0</td>
                    </tr>
                    <tr>
                      <td>Gol su rigore</td>
                      <td className="score-positive">+2.0</td>
                    </tr>
                    <tr>
                      <td>Assist</td>
                      <td className="score-positive">+1.0</td>
                    </tr>
                    <tr>
                      <td>Imbattibilità portiere</td>
                      <td className="score-positive">+1.0</td>
                    </tr>
                    <tr>
                      <td>Rigore parato</td>
                      <td className="score-positive">+2.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABELLA DEI MALUS */}
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
                      <td>Gol subito</td>
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
                      <td>Rigore sbagliato</td>
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