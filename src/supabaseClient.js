import { createClient } from '@supabase/supabase-js';

// Recuperiamo l'URL e la Chiave Anonima dalle variabili d'ambiente di Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inizializziamo il client di Supabase configurando lo SCHEMA personalizzato
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'fantamondiale' // <--- FONDAMENTALE: Forza Supabase a usare il nostro schema!
  }
});