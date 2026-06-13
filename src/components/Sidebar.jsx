import React, { useEffect, useRef } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react'; // Aggiunto useUser
// Importiamo tutte le icone necessarie da Lucide React
import { 
  House, 
  Shield, 
  Calendar, 
  Trophy, 
  Settings, 
  ScrollText, 
  Users, 
  ClipboardList, 
  X,
  ExternalLink 
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, userRole, nomeUtente, onNavigate }) => {
  // Riferimento per accedere ai dati dell'utente loggato su Clerk
  const { user } = useUser();

  // Riferimento al contenitore interno del menu per controllarne lo scroll
  const menuContentRef = useRef(null);

  // Reset dello scroll ogni volta che la sidebar viene aperta
  useEffect(() => {
    if (isOpen && menuContentRef.current) {
      menuContentRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  const handleNav = (targetPage) => {
    if (onNavigate) {
      onNavigate(targetPage);
    } else {
      console.log(`Navigazione verso: ${targetPage}`);
    }
    onClose(); // Chiude automaticamente la sidebar dopo il click su una rotta
  };

  // Definiamo se nascondere il Manage Account in base all'ID dell'utente loggato
  // Sostituisci 'user_xxxxxxxxxxxx' con l'ID reale dell'account da bloccare
  const nascondiManagePerQuestoUtente = user?.id === 'user_3Eu6T4BttC1NYpTZvfoV4Ib9zzU';

  return (
    <>
      {/* Sfondo oscurato che intercetta i click e chiude il menu */}
      {isOpen && <div className="sidebar-overlay tactical-sidebar-blur" onClick={onClose}></div>}

      <div className={`sidebar-container tactical-command-center ${isOpen ? 'open' : ''}`}>

        {/* HEADER: Benvenuto, Ruolo e Tasto Chiusura */}
        <div className="sidebar-header tactical-sidebar-top">
          <div className="user-welcome">
            <div className="user-details">
              <h4 className="tactical-username">Benvenuto, {nomeUtente}</h4>
              <span className={`badge-role tactical-badge-role ${userRole}`}>
                {userRole === 'admin' ? '👑 Admin' : '🛡️ Player'}
              </span>
            </div>
          </div>
          {/* Sostituita la x testuale con l'icona X di Lucide */}
          <button className="close-sidebar-btn tactical-close-trigger" onClick={onClose}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* CONTENUTO MENU */}
        <div className="sidebar-menu-content tactical-sidebar-scroll" ref={menuContentRef}>

          {/* NUOVA SEZIONE PRINCIPALE (Integrazione BottomNavbar) */}
          <div className="menu-section tactical-menu-group">
            <p className="section-title tactical-group-title">Navigazione</p>
            <ul className="tactical-menu-list">
              <li className="tactical-menu-item" onClick={() => handleNav('dashboard')}>
                <span className="tactical-menu-icon">
                  <House size={18} strokeWidth={2} />
                </span> 
                Dashboard
              </li>
              <li className="tactical-menu-item" onClick={() => handleNav('squadre')}>
                <span className="tactical-menu-icon">
                  <Shield size={18} strokeWidth={2} />
                </span> 
                Squadre
              </li>
              <li className="tactical-menu-item" onClick={() => handleNav('calendario')}>
                <span className="tactical-menu-icon">
                  <Calendar size={18} strokeWidth={2} />
                </span> 
                Calendario
              </li>
              <li className="tactical-menu-item" onClick={() => handleNav('classifica')}>
                <span className="tactical-menu-icon">
                  <Trophy size={18} strokeWidth={2} />
                </span> 
                Classifica
              </li>
            </ul>
          </div>

          {/* SEZIONE PLAYER: Info e Funzioni di consultazione */}
          <div className="menu-section tactical-menu-group">
            <p className="section-title tactical-group-title">Info & Regolamenti</p>
            <ul className="tactical-menu-list">
              <li className="tactical-menu-item" onClick={() => handleNav('regolamento')}>
                <span className="tactical-menu-icon">
                  <ScrollText size={18} strokeWidth={2} />
                </span> 
                Regolamento FantaMondiale
              </li>
              {/* Voce Link Esterno ai Voti FantaPazz */}
              <li className="tactical-menu-item">
                <a 
                  href="https://nations.fantapazz.com/fantacalcio/voti-ufficiali" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="sidebar-external-link"
                  onClick={onClose}
                >
                  <span className="tactical-menu-icon">
                    <ExternalLink size={18} strokeWidth={2} />
                  </span> 
                  Voti FantaPazz
                </a>
              </li>
              <li className="tactical-menu-item" onClick={() => handleNav('partecipanti')}>
                <span className="tactical-menu-icon">
                  <Users size={18} strokeWidth={2} />
                </span> 
                Partecipanti Lega
              </li>
              <li className="tactical-menu-item" onClick={() => handleNav('listone')}>
                <span className="tactical-menu-icon">
                  <ClipboardList size={18} strokeWidth={2} />
                </span> 
                Listone Calciatori
              </li>
              <li className="tactical-menu-item" onClick={() => handleNav('gestione-squadra')}>
                <span className="tactical-menu-icon">
                  <Settings size={18} strokeWidth={2} />
                </span> 
                Gestione Squadra
              </li>
            </ul>
          </div>

          {/* SEZIONE ADMIN: Pannello di Controllo Esclusivo */}
          {userRole === 'admin' && (
            <div className="menu-section admin-section tactical-menu-group tactical-admin-box">
              <p className="section-title admin-title tactical-group-title-admin">👑 Gestione Admin</p>
              <ul className="tactical-menu-list" window-tether="true">
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-modifica-formazioni')}>
                  Modifica Formazioni
                </li>
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-modifica-voti')}>
                  Rettifica Voti
                </li>
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-penalita')}>
                  Penalità
                </li>
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-rose')}>
                  Gestione Rose
                </li>
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-giornate')}>
                  Gestione Giornate
                </li>
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-sposta-player')}>
                  Sposta Giocatori
                </li>
                <li className="tactical-menu-item admin-item" onClick={() => handleNav('admin-permessi')}>
                  Permessi di Admin
                </li>
              </ul>
            </div>
          )}

        </div>

        {/* FOOTER: Integrazione Account Clerk */}
        <div className="sidebar-footer tactical-sidebar-bottom">
          <div className="clerk-account-wrapper">
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  // Se l'utente è quello bloccato, nasconde il bottone, altrimenti lo mostra normalmente
                  userButtonPopoverActionButton__manageAccount: { 
                    display: nascondiManagePerQuestoUtente ? 'none' : 'flex' 
                  }
                }
              }}
            />
            <span className="clerk-label tactical-clerk-text">Gestisci Account</span>
          </div>
        </div>

      </div>
    </>
  );
};

export default Sidebar;