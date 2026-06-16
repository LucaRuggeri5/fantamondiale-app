import React from 'react';
// Importiamo l'hook di navigazione per spostarci tra le rotte di React Router
import { useNavigate } from 'react-router-dom';
// Importiamo l'icona ChevronLeft richiesta dal pacchetto lucide-react
import { ChevronLeft } from 'lucide-react';
// Importiamo il file CSS dedicato che creeremo subito dopo
import './TacticalBackButton.css';

/**
 * Componente TacticalBackButton
 * @param {string} to - (Opzionale) La rotta specifica a cui tornare. Di default è "/" (Dashboard).
 */
const TacticalBackButton = ({ to = '/' }) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Eseguiamo la navigazione programmatica verso la rotta desiderata
    navigate(to);
  };

  return (
    <button 
      className="btn-tactical-back" 
      onClick={handleGoBack}
      aria-label="Torna indietro alla dashboard"
    >
      {/* Icona Lucide impostata con dimensione e stroke coerenti con lo stile dell'header */}
      <ChevronLeft className="icon-back" size={40} strokeWidth={2.5} />
    </button>
  );
};

export default TacticalBackButton;