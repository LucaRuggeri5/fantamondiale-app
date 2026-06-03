import React, { useEffect, useRef } from 'react';
import { UserButton } from '@clerk/clerk-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, userRole, nomeUtente, onNavigate }) => {
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

  return (
    <>
      {/* Sfondo oscurato che intercetta i click e chiude il menu */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}

      <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>

        {/* HEADER: Benvenuto, Ruolo e Tasto Chiusura */}
        <div className="sidebar-header">
          <div className="user-welcome">
            <div className="user-details">
              <h4>Benvenuto, {nomeUtente}</h4>
              <span className={`badge-role ${userRole}`}>
                {userRole === 'admin' ? '👑 Admin' : '🛡️ Player'}
              </span>
            </div>
          </div>
          <button className="close-sidebar-btn" onClick={onClose}>&times;</button>
        </div>

        {/* CONTENUTO MENU (Aggiunto il ref qui per resettare lo scroll) */}
        <div className="sidebar-menu-content" ref={menuContentRef}>

          {/* NUOVA SEZIONE PRINCIPALE (Integrazione BottomNavbar) */}
          <div className="menu-section">
            <p className="section-title">Navigazione</p>
            <ul>
              <li onClick={() => handleNav('dashboard')}>
                <span>🏠</span> Dashboard
              </li>
              <li onClick={() => handleNav('squadre')}>
                <span>🛡️</span> Squadre
              </li>
              <li onClick={() => handleNav('calendario')}>
                <span>📅</span> Calendario
              </li>
              <li onClick={() => handleNav('classifica')}>
                <span>📊</span> Classifica
              </li>
            </ul>
          </div>

          {/* SEZIONE PLAYER: Info e Funzioni di consultazione */}
          <div className="menu-section">
            <p className="section-title">Info</p>
            <ul>
              <li onClick={() => handleNav('gestione-squadra')}>
                Gestione Squadra
              </li>
              <li onClick={() => handleNav('regolamento')}>
                Regolamento FantaMondiale
              </li>
              <li onClick={() => handleNav('partecipanti')}>
                Partecipanti Lega
              </li>
              <li onClick={() => handleNav('listone')}>
                Listone Calciatori
              </li>
            </ul>
          </div>

          {/* SEZIONE ADMIN: Pannello di Controllo Esclusivo */}
          {userRole === 'admin' && (
            <div className="menu-section admin-section">
              <p className="section-title admin-title">👑 Gestione Admin</p>
              <ul window-tether="true">
                <li onClick={() => handleNav('admin-modifica-formazioni')}>
                  Modifica Formazioni
                </li>
                <li onClick={() => handleNav('admin-modifica-voti')}>
                  Rettifica Voti
                </li>
                <li onClick={() => handleNav('admin-penalita')}>
                  Penalità
                </li>
                <li onClick={() => handleNav('admin-rose')}>
                  Gestione Rose
                </li>
                <li onClick={() => handleNav('admin-giornate')}>
                  Gestione Giornate
                </li>
                <li onClick={() => handleNav('admin-sposta-player')}>
                  Sposta Giocatori di Squadra
                </li>
                <li onClick={() => handleNav('admin-permessi')}>
                  Permessi di Admin
                </li>
              </ul>
            </div>
          )}

        </div>

        {/* FOOTER: Integrazione Account Clerk */}
        <div className="sidebar-footer">
          <div className="clerk-account-wrapper">
            <UserButton afterSignOutUrl="/" />
            <span className="clerk-label">Gestisci Account</span>
          </div>
        </div>

      </div>
    </>
  );
};

export default Sidebar;