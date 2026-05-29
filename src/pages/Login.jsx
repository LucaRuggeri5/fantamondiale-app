import React from 'react';
import './Login.css';

// Passiamo una funzione dalle props per simulare il successo del login
const Login = ({ onLoginSuccess }) => {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>FantaMondiale 2026 ⚽</h1>
        <p>Accedi per gestire la tua squadra e sfidare i tuoi amici.</p>
        
        {/* Questo pulsante simula il widget di Clerk che integreremo dopo */}
        <button className="login-btn" onClick={onLoginSuccess}>
          Accedi con Clerk (Simulato)
        </button>
      </div>
    </div>
  );
};

export default Login;