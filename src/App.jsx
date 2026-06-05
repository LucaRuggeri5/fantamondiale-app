import React, { useState, useEffect } from 'react';
// Importiamo i componenti necessari per la gestione della navigazione e delle rotte
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// Importiamo i moduli di autenticazione di Clerk
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react';
// Importiamo il client Supabase configurato per il database
import { supabase } from './supabaseClient'; 

// Importiamo tutte le pagine dell'applicazione (Onboarding, Dashboard, Area Player e Area Admin)
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Squadre from './pages/Squadre';
import DettaglioSquadra from './pages/DettaglioSquadra'; 
import Calendario from './pages/Calendario';
import Classifica from './pages/Classifica';
import InserisciFormazione from './pages/InserisciFormazione'; 
import InserisciVoti from './pages/InserisciVoti'; 
import GestioneRose from './pages/Admin/GestioneRose'; 
import AssegnaPermessi from './pages/Admin/AssegnaPermessi'; 
import SpostaPlayer from './pages/Admin/SpostaPlayer'; 
import GestoreGiornata from './pages/Admin/GestoreGiornata'; 
import AdminModificaFormazioni from './pages/Admin/AdminModificaFormazioni'; 
import AdminModificaVoti from './pages/Admin/AdminModificaVoti'; 
import AdminPenalita from './pages/Admin/AdminPenalita'; 

// Pagine dedicate alla gestione delle rose, listoni e regolamento
import PartecipantiLega from './pages/Player/PartecipantiLega';
import ListoneCalciatori from './pages/Player/ListoneCalciatori';
import GestioneSquadra from './pages/Player/GestioneSquadra';
import Regolamento from './pages/Player/Regolamento';

// Componenti globali dell'interfaccia (Navigazione)
import BottomNavbar from './components/BottomNavbar';
import Sidebar from './components/Sidebar'; 

// Importiamo il foglio di stile specifico modificato con il tema Tactical Suite
import './App.css';

// Sotto-componente per isolare l'utilizzo degli hook di react-router-dom (useNavigate, useLocation)
const AppContent = ({ currentUser, isSidebarOpen, setIsSidebarOpen, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation(); 

  // Determina se nascondere la barra di navigazione inferiore in base alla rotta attuale
  const nascondiNavbar = 
    location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/formazione') || 
    location.pathname.startsWith('/voti') ||
    location.pathname.startsWith('/regolamento') ||
    location.pathname.startsWith('/listone');

  return (
    <div className="app-container">
      {/* Elemento overlay isolato che esegue l'animazione ad espansione circolare cambiando sfondo sotto il testo */}
      <div className="theme-ripple-overlay"></div>

      {/* Menu laterale (Sidebar) configurato con i permessi e dati dell'utente corrente */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        userRole={currentUser?.ruolo || 'player'}
        nomeUtente={currentUser?.nome_utente || 'Allenatore'}
        onNavigate={(targetPage) => {
          // Gestione centralizzata dei percorsi di navigazione dalla Sidebar
          switch (targetPage) {
            case 'dashboard':
              navigate('/');
              break;
            case 'squadre':
              navigate('/squadre');
              break;
            case 'calendario':
              navigate('/calendario');
              break;
            case 'classifica':
              navigate('/classifica');
              break;
            case 'gestione-squadra':
              navigate('/gestione-squadra');
              break;
            case 'regolamento':
              navigate('/regolamento');
              break;
            case 'partecipanti':
              navigate('/partecipanti');
              break;
            case 'listone':
              navigate('/listone');
              break;
            case 'admin-rose':
              navigate('/admin/rose');
              break;
            case 'admin-permessi':
              navigate('/admin/permessi');
              break;
            case 'admin-sposta-player':
              navigate('/admin/sposta-player');
              break;
            case 'admin-giornate':
              navigate('/admin/giornate');
              break;
            case 'admin-modifica-formazioni':
              navigate('/admin/modifica-formazioni');
              break;
            case 'admin-modifica-voti':
              navigate('/admin/modifica-voti');
              break;
            case 'admin-penalita':
              navigate('/admin/penalita');
              break;
            default:
              alert(`Navigazione verso ${targetPage} in attivazione nelle prossime fasi!`);
          }
        }}
      />

      {/* Header Tattico Superiore */}
      <header className="app-header">
        <div className="header-left">
          {/* Pulsante hamburger per aprire la Sidebar laterale */}
          <button className="btn-hamburger" onClick={() => setIsSidebarOpen(true)}>
            ☰
          </button>
          {/* Titolo applicazione con font Montserrat ereditato dal foglio globale */}
          <span className="app-title" onClick={() => navigate('/')}>
            FantaMondiale ⚽
          </span>
        </div>
        
        {/* Pulsante di commutazione tema Notte/Giorno con icone SVG dinamiche */}
        <button className="btn-theme-toggle" onClick={(e) => toggleTheme(e)} aria-label="Cambia tema">
          {theme === 'light' ? (
            <svg className="icon-theme moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          ) : (
            <svg className="icon-theme sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          )}
        </button>
      </header>

      {/* Contenitore di rendering delle rotte dell'applicazione */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/squadre" element={<Squadre />} />
          <Route path="/squadre/:squadraId" element={<DettaglioSquadra />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/classifica" element={<Classifica />} />
          <Route path="/gestione-squadra" element={<GestioneSquadra currentUser={currentUser} />} />
          <Route path="/regolamento" element={<Regolamento />} />
          <Route path="/partecipanti" element={<PartecipantiLega currentUser={currentUser} />} />
          <Route path="/listone" element={<ListoneCalciatori />} />
          <Route path="/formazione/inserisci/:giornataId" element={<InserisciFormazione />} />
          <Route path="/voti/inserisci/:giornataId" element={<InserisciVoti />} />
          
          {/* Rotte protette destinate esclusivamente al ruolo 'admin' */}
          <Route 
            path="/admin/rose" 
            element={currentUser?.ruolo === 'admin' ? <GestioneRose /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/permessi" 
            element={currentUser?.ruolo === 'admin' ? <AssegnaPermessi /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/sposta-player" 
            element={currentUser?.ruolo === 'admin' ? <SpostaPlayer /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/giornate" 
            element={currentUser?.ruolo === 'admin' ? <GestoreGiornata /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/modifica-formazioni" 
            element={currentUser?.ruolo === 'admin' ? <AdminModificaFormazioni /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/modifica-voti" 
            element={currentUser?.ruolo === 'admin' ? <AdminModificaVoti /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/penalita" 
            element={currentUser?.ruolo === 'admin' ? <AdminPenalita /> : <Navigate to="/" />} 
          />
          {/* Fallback di sicurezza: reindirizza alla home se la rotta non esiste */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Mostra la barra inferiore solo se non ci si trova in schermate a tutto schermo */}
      {!nascondiNavbar && <BottomNavbar />}
    </div>
  );
};

const App = () => {
  // Dichiarazione degli stati locali fondamentali
  const [leagueId, setLeagueId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [isSyncing, setIsSyncing] = useState(true); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  // Calcolo automatico del tema di base a seconda dell'orario della giornata dell'utente
  const [theme, setTheme] = useState(() => {
    const currentHour = new Date().getHours();
    return (currentHour >= 7 && currentHour < 19) ? 'light' : 'dark';
  });
  
  // Estrazione dell'utente autenticato tramite l'hook di Clerk
  const { user } = useUser();

  // Effetto per sincronizzare l'attributo data-theme sul body ad ogni cambio stato
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Funzione deputata alla gestione del cambio tema con calcolo della posizione del click
  const toggleTheme = (e) => {
    if (e && e.clientX && e.clientY) {
      document.documentElement.style.setProperty('--ripple-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--ripple-y', `${e.clientY}px`);
    } else {
      document.documentElement.style.setProperty('--ripple-x', '90%');
      document.documentElement.style.setProperty('--ripple-y', '27px');
    }

    // Reset della classe CSS per innescare correttamente l'animazione di espansione
    document.body.classList.remove('theme-changing');
    void document.body.offsetWidth; // Forza il ricalcolo del layout nel browser
    document.body.classList.add('theme-changing');

    // Cambia lo stato invertendo il valore attuale
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Effetto di allineamento e sincronizzazione dei dati utente tra Clerk e Supabase
  useEffect(() => {
    const syncUserWithSupabase = async () => {
      if (!user) {
        setIsSyncing(false);
        return;
      }

      try {
        setIsSyncing(true);
        // Interrogazione della tabella 'utenti' su Supabase
        const { data: utenteExist, error } = await supabase
          .from('utenti')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // Se l'utente non esiste nel database relazionale, procediamo all'inserimento (creazione record)
        if (error || !utenteExist) {
          const nuovoUtente = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            nome_utente: user.username || user.firstName || 'User_' + user.id.substring(0, 5),
            ruolo: 'player' // Ruolo assegnato di base ad ogni iscritto
          };
          await supabase.from('utenti').insert([nuovoUtente]);
          setCurrentUser(nuovoUtente);
        } else {
          // Se esiste, aggiorna lo stato locale con le informazioni caricate
          setCurrentUser(utenteExist);
          if (utenteExist.lega_id) {
            setLeagueId(utenteExist.lega_id);
          }
        }
      } catch (err) {
        console.error("Errore imprevisto durante il sync:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    if (user) {
      syncUserWithSupabase();
    }
  }, [user]);

  // Gestore per l'aggiornamento dello stato all'ingresso in una specifica lega (Onboarding)
  const handleJoinLeague = (id) => {
    setLeagueId(id);
    if (currentUser) {
      setCurrentUser(prev => ({ ...prev, lega_id: id }));
    }
  };

  // Renderizzazione dello stato di attesa durante la sincronizzazione
  if (user && isSyncing) {
    return (
      <div className="app-syncing-container">
        <p>Sincronizzazione account in corso... ⏳</p>
      </div>
    );
  }

  return (
    <>
      {/* Visualizzato esclusivamente se l'utente non ha effettuato l'accesso */}
      <DeletedSignedOutPlaceholder>
        <div className="app-auth-container">
          <SignIn routing="hash" />
        </div>
      </DeletedSignedOutPlaceholder>

      {/* Visualizzato esclusivamente se l'utente è correttamente loggato */}
      <SignedIn>
        {!leagueId ? (
          <Onboarding onJoinLeague={handleJoinLeague} />
        ) : (
          <Router>
            <AppContent 
              currentUser={currentUser}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          </Router>
        )}
      </SignedIn>
    </>
  );
};

// Placeholder per garantire la piena conformità con i meccanismi di rendering condizionale di Clerk
const DeletedSignedOutPlaceholder = ({ children }) => <SignedOut>{children}</SignedOut>;

export default App;