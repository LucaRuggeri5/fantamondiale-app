# FantaMondiale ⚽🏆

FantaMondiale è una piattaforma web completa dedicata alla gestione del fantacalcio per i campionati mondiali. L'applicazione permette agli utenti di iscriversi a una lega, gestire la propria squadra, inserire le formazioni e i voti, mentre offre agli amministratori un pannello di controllo avanzato per supervisionare l'andamento del gioco, correggere eventuali errori e gestire le rose.

---

## 🚀 Tech Stack

L'applicazione è sviluppata sfruttando un'architettura moderna, veloce e scalabile:

* **Frontend:** React (gestito tramite **Vite** per build ultra-rapide).
* **Routing:** React Router DOM (v6) per la navigazione dinamica tra le sezioni.
* **Autenticazione:** **Clerk Auth** (`@clerk/clerk-react`) per una gestione sicura degli accessi e dei profili utente.
* **Database & Backend:** **Supabase** per la persistenza dei dati in tempo reale e la sincronizzazione immediata degli account.
* **Stile:** **CSS Puro** (`App.css` e fogli dedicati) senza framework esterni, garantendo un design leggero, responsive e personalizzato.

---

## 📋 Funzionalità Principali

### 👤 Area Player (Allenatore)
* **Onboarding:** Accesso sicuro tramite Clerk e iscrizione immediata a una lega inserendo il codice di accesso univoco.
* **Dashboard & Info:** Monitoraggio della classifica generale, dei partecipanti alla lega, del listone completo dei calciatori e dello stato dei turni di gioco.
* **Gestione Squadra:** Visualizzazione dettagliata della propria rosa e delle altre squadre partecipanti.
* **Flusso Operativo:**
    * Inserimento della formazione per la giornata corrente prima della scadenza prefissata.
    * **Inserimento Autonomo dei Voti:** Ogni giocatore inserisce i voti base e i bonus/malus dei propri calciatori al termine delle partite della giornata.

### 👑 Area Amministratore (Admin)
Iscrivendosi con il ruolo di `admin`, l'utente sblocca una sezione di controllo laterale (Sidebar) con permessi esclusivi:
* **Gestione Rose:** Controllo totale sui calciatori assegnati a ciascuna squadra della lega.
* **Assegna Permessi & Sposta Player:** Modifica dei ruoli utente e ricollocamento dei giocatori tra le varie squadre.
* **Gestore Giornata:** Apertura e chiusura delle giornate di gioco, impostazione delle scadenze per la consegna delle formazioni e dei voti.
* **Controllo e Correzione Voti:** Strumento di protezione per modificare e correggere eventuali errori o inserimenti scorretti nei voti inseriti manualmente dai player.
* **Penalità:** Applicazione di punteggi di penalità alle squadre in caso di violazione del regolamento.

---

## 🗄️ Architettura del Database (Supabase)

Il database è strutturato su Postgres (tramite Supabase) con le seguenti tabelle relazionali principali:

| Tabella | Descrizione | Campi Chiave |
| :--- | :--- | :--- |
| **`utenti`** | Profili sincronizzati da Clerk | `id` (text), `email`, `nome_utente`, `ruolo` (admin/player), `lega_id`, `squadra_id` |
| **`leghe`** | Leghe di fantacalcio create | `id` (uuid), `nome`, `codice_accessso` |
| **`squadre`** | Squadre dei fantallenatori | `id` (uuid), `lega_id`, `nome`, `url_logo`, `punti_totali`, `penalita` |
| **`calciatori_reali`** | Listone generale dei giocatori | `id` (uuid), `nome`, `nazionale`, `ruolo`, `stato` |
| **`rose_squadre`** | Associazione calciatori-squadre | `id` (uuid), `lega_id`, `squadra_id`, `calciatore_id` |
| **`giornate`** | Turni e scadenze del mondiale | `id` (uuid), `numero_giornata`, `scadenza_formazioni`, `scadenza_voti`, `stato` |
| **`formazioni`** | Moduli e scelte per la giornata | `id` (uuid), `squadra_id`, `giornata_id`, `modulo`, `punteggio_total`, `confermata` |
| **`formazioni_calciatori`**| Dettaglio voti del singolo turno | `id` (uuid), `formazione_id`, `calciatore_id`, `posizione`, `voto_base`, `bonus_malus`, `voto_fanta` |

---

## ⚙️ Regolamento di Calcolo

Per preservare l'immediatezza del gioco e la pulizia del codice, il calcolo si basa su regole lineari ed essenziali:
1.  **Nessun Modificatore:** Non sono presenti modificatori della difesa o bonus legati al rendimento del reparto.
2.  **Calcolo Diretto:** Il punteggio finale della giornata è dato puramente dalla somma algebrica dei voti base e dei bonus/malus (`voto_base + bonus_malus`) dei calciatori schierati in posizione valida, decurtato di eventuali penalità della squadra stabilite dall'amministratore.

---