import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import './TacticalConfirmModal.css';

const TacticalConfirmModal = () => {
  // Estraiamo lo stato del modale e la funzione per chiuderlo (hideConfirm)
  const { confirm, hideConfirm } = useNotification();

  // Se lo stato 'show' è false, non disegna nulla
  if (!confirm.show) return null;

  return (
    <>
      {/* Sfondo oscurato e sfocato che copre l'intera applicazione */}
      <div className="tactical-modal-overlay" onClick={hideConfirm}></div>
      
      {/* Contenitore effettivo del Modale */}
      <div className="tactical-modal-container">
        <div className="tactical-modal-header">
          <div className="tactical-modal-icon-wrapper">
            {/* Usiamo un'icona di avviso per attirare l'attenzione sul pericolo dell'azione */}
            <AlertTriangle size={24} className="tactical-modal-alert-icon" />
          </div>
          <h3 className="tactical-modal-title">{confirm.title || 'Richiesta di Conferma'}</h3>
        </div>
        
        <div className="tactical-modal-body">
          <p className="tactical-modal-text">{confirm.message}</p>
        </div>
        
        <div className="tactical-modal-actions">
          {/* Tasto Annulla: Chiude semplicemente il modale */}
          <button className="tactical-modal-btn btn-secondary" onClick={hideConfirm}>
            Annulla
          </button>
          
          {/* Tasto Conferma: Lancia la funzione associata dentro al Context */}
          <button className="tactical-modal-btn btn-danger" onClick={confirm.onConfirm}>
            Sì, Conferma
          </button>
        </div>
      </div>
    </>
  );
};

export default TacticalConfirmModal;