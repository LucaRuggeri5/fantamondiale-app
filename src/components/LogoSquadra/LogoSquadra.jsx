import React from 'react';
import './LogoSquadra.css';

const LogoSquadra = ({ url, nomeSquadra, dimensione = 'small' }) => {
  // Se non c'è URL, mostriamo le iniziali del nome della squadra
  const iniziali = nomeSquadra ? nomeSquadra.substring(0, 2).toUpperCase() : '??';

  return (
    <div className={`logo-container ${dimensione}`}>
      {url ? (
        <img src={url} alt={`Logo ${nomeSquadra}`} className="logo-image" />
      ) : (
        <div className="logo-placeholder">{iniziali}</div>
      )}
    </div>
  );
};

export default LogoSquadra;