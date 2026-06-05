import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Regolamento.css';

const Regolamento = () => {
  const navigate = useNavigate();

  return (
    <div className="tactical-app-container tactical-regolamento-page">
      <div className="tactical-regolamento-card">
        {/* Pulsante di navigazione coerente */}
        <button className="tactical-back-btn" onClick={() => navigate('/dashboard')}>
          ⬅️ indietro
        </button>

        <div className="tactical-regolamento-icon">📜</div>
        <h1 className="tactical-regolamento-title">Regolamento Ufficiale</h1>
        <p className="tactical-regolamento-subtitle">FantaMondiale Suite ⚽</p>
        
        <div className="tactical-regolamento-divider"></div>
        
        <div className="tactical-regolamento-notice-box">
          <span className="tactical-loading-dots-icon">⏳</span>
          <h3 className="tactical-notice-title">Sezione in fase di redazione</h3>
          <p className="tactical-notice-text">
            La commissione tecnica di lega sta finalizzando i parametri ufficiali relativi ai bonus e malus di questa edizione. 
            Il documento completo verrà pubblicato non appena le configurazioni saranno validate.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Regolamento;