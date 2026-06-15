import React from 'react';
import { useNotification } from '../../context/NotificationContext';
// Importiamo le icone per differenziare visivamente il tipo di notifica
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import './TacticalToast.css';

const TacticalToast = () => {
  // Estraiamo i dati del toast e la funzione per chiuderlo dal nostro Context globale
  const { toast, hideToast } = useNotification();

  // Se lo stato 'show' è false, il componente non deve renderizzare nulla
  if (!toast.show) return null;

  // Funzione di supporto per mostrare l'icona corretta in base al tipo
  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="toast-icon icon-success" size={20} />;
      case 'error':
        return <XCircle className="toast-icon icon-error" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon icon-warning" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className={`tactical-toast-wrapper toast-${toast.type}`}>
      <div className="toast-content">
        {renderIcon()}
        <span className="toast-message">{toast.message}</span>
      </div>
      
      {/* Pulsantino a forma di X per chiudere il toast prima dei 3 secondi */}
      <button className="toast-close-btn" onClick={hideToast}>
        <X size={16} />
      </button>
    </div>
  );
};

export default TacticalToast;