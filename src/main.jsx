import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import App from './App.jsx';
import { ClerkProvider } from '@clerk/clerk-react';

// Recuperiamo la chiave pubblicabile di Clerk dalle variabili d'ambiente
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Manca la chiave VITE_CLERK_PUBLISHABLE_KEY nel file .env.local");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Il provider di Clerk deve avvolgere l'intera applicazione */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
);