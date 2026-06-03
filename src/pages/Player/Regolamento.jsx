import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Regolamento.css';

const Regolamento = () => {
  const navigate = useNavigate();

  return (
    <div className="regolamento-container">
      <div className="regolamento-card">
        {/* Pulsante per tornare indietro */}
        <button className="regolamento-back-btn" onClick={() => navigate(-1)}>
          ← Torna Indietro
        </button>

        <div className="regolamento-icon">📜</div>
        <h1 className="regolamento-title">Regolamento Ufficiale</h1>
        <p className="regolamento-subtitle">FantaMondiale ⚽</p>
        
        <div className="regolamento-divider"></div>
        
        <div className="regolamento-notice-box">
          <span className="loading-dots-icon">⏳</span>
          <h3>Sezione in arrivo</h3>
          <p>La commissione di lega sta ultimando i dettagli e i calcoli dei bonus/malus. Il regolamento completo sarà disponibile a breve.</p>
        </div>
      </div>
    </div>
  );
};

export default Regolamento;