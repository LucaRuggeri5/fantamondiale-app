import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react';
import { supabase } from './supabaseClient'; 

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
import AdminPenalita from './pages/Admin/AdminPenalita'; // Nuova pagina importata
import BottomNavbar from './components/BottomNavbar';
import Sidebar from './components/Sidebar'; 

import './App.css';

const AppContent = ({ currentUser, isSidebarOpen, setIsSidebarOpen, handleJoinLeague }) => {
  const navigate = useNavigate();
  const location = useLocation(); 

  // Nasconde la navbar nelle rotte admin, inserimento formazioni e inserimento voti
  const nascondiNavbar = 
    location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/formazione') || 
    location.pathname.startsWith('/voti');

  return (
    <div className="app-container">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        userRole={currentUser?.ruolo || 'player'}
        nomeUtente={currentUser?.nome_utente || 'Allenatore'}
        onNavigate={(targetPage) => {
          switch (targetPage) {
            // Rotte BottomNavbar duplicate
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
            
            // Rotte Amministrazione
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

      <header className="app-header">
        <button className="btn-hamburger" onClick={() => setIsSidebarOpen(true)}>
          ☰
        </button>
        <span className="app-title">FantaMondiale ⚽</span>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/squadre" element={<Squadre />} />
          <Route path="/squadre/:squadraId" element={<DettaglioSquadra />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/classifica" element={<Classifica />} />
          
          {/* Rotte operative per i Turni di Gioco */}
          <Route path="/formazione/inserisci/:giornataId" element={<InserisciFormazione />} />
          <Route path="/voti/inserisci/:giornataId" element={<InserisciVoti />} />
          
          {/* Rotte protette riservate all'Amministratore */}
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
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Renderizza la BottomNavbar solo se non siamo nelle pagine inserite nei filtri sopra */}
      {!nascondiNavbar && <BottomNavbar />}
    </div>
  );
};

const App = () => {
  const [leagueId, setLeagueId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [isSyncing, setIsSyncing] = useState(true); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  const { user } = useUser();

  useEffect(() => {
    const syncUserWithSupabase = async () => {
      if (!user) {
        setIsSyncing(false);
        return;
      }

      try {
        setIsSyncing(true);

        const { data: utenteExist, error } = await supabase
          .from('utenti')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !utenteExist) {
          console.log("Utente non trovato su Supabase. Creazione in corso...");
          
          const nuovoUtente = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            nome_utente: user.username || user.firstName || 'User_' + user.id.substring(0, 5),
            ruolo: 'player'
          };

          const { error: insertError } = await supabase
            .from('utenti')
            .insert([nuovoUtente]);

          if (insertError) {
            console.error("Errore inserimento:", insertError);
          } else {
            setCurrentUser(nuovoUtente);
          }
        } else {
          console.log("Utente già registrato. Ruolo:", utenteExist.ruolo);
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

  const handleJoinLeague = (id) => {
    setLeagueId(id);
    if (currentUser) {
      setCurrentUser(prev => ({ ...prev, lega_id: id }));
    }
  };

  if (user && isSyncing) {
    return (
      <div className="app-syncing-container">
        <p>Sincronizzazione account in corso... ⏳</p>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="app-auth-container">
          <SignIn routing="hash" />
        </div>
      </SignedOut>

      <SignedIn>
        {!leagueId ? (
          <Onboarding onJoinLeague={handleJoinLeague} />
        ) : (
          <Router>
            <AppContent 
              currentUser={currentUser}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              handleJoinLeague={handleJoinLeague}
            />
          </Router>
        )}
      </SignedIn>
    </>
  );
};

export default App;