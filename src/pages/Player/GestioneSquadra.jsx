import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './GestioneSquadra.css';

const GestioneSquadra = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [squadra, setSquadra] = useState(null);
  const [nuovoNome, setNuovoNome] = useState('');
  const [file, setFile] = useState(null);
  const [anteprima, setAnteprima] = useState(null);
  const [logoEliminato, setLogoEliminato] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });

  useEffect(() => {
    const fetchSquadraUtente = async () => {
      if (!currentUser?.squadra_id) { setLoading(false); return; }
      
      try {
        const { data, error } = await supabase
          .from('squadre')
          .select('*')
          .eq('id', currentUser.squadra_id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setSquadra(data);
          setNuovoNome(data.nome || '');
          setAnteprima(data.url_logo || null);
        }
      } catch (err) {
        console.error("Errore:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSquadraUtente();
  }, [currentUser]);

  // Helper per estrarre il nome del file dall'URL pubblico di Supabase
  const getFileNameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnteprima(URL.createObjectURL(selectedFile));
      setLogoEliminato(false);
    }
  };

  const handleEliminaLogo = () => {
    setFile(null);
    setAnteprima(null);
    setLogoEliminato(true);
  };

  const handleSalvaTutto = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessaggio({ testo: '', tipo: '' });

    try {
      let logoUrl = squadra.url_logo;

      // 1. Gestione Eliminazione (Dal DB e dallo Storage)
      if (logoEliminato && squadra.url_logo) {
        const fileName = getFileNameFromUrl(squadra.url_logo);
        if (fileName) {
          await supabase.storage.from('loghi-squadre').remove([fileName]);
        }
        logoUrl = null;
      }
      
      // 2. Upload Nuovo Logo
      if (file) {
        // Se c'era un vecchio logo, lo eliminiamo prima di mettere il nuovo
        if (squadra.url_logo) {
          const oldFileName = getFileNameFromUrl(squadra.url_logo);
          await supabase.storage.from('loghi-squadre').remove([oldFileName]);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${squadra.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('loghi-squadre')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('loghi-squadre').getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }

      // 3. Update DB
      const { error } = await supabase
        .from('squadre')
        .update({ nome: nuovoNome.trim(), url_logo: logoUrl })
        .eq('id', squadra.id);

      if (error) throw error;

      setSquadra(prev => ({ ...prev, nome: nuovoNome.trim(), url_logo: logoUrl }));
      setLogoEliminato(false);
      setFile(null);
      setMessaggio({ testo: "Squadra aggiornata! 🔄", tipo: "success" });
    } catch (err) {
      console.error(err);
      setMessaggio({ testo: "Errore durante il salvataggio.", tipo: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ... resto del componente rimane uguale ...
  if (loading) return <div className="tactical-gestione-loading">Caricamento... ⏳</div>;
  if (!squadra) return <div className="tactical-app-container tactical-gestione-page"><div className="tactical-no-squadra-box"><h3>Nessuna squadra associata 🚫</h3></div></div>;

  return (
    <div className="tactical-app-container tactical-gestione-page">
      <div className="tactical-gestione-page-header">
        <h2 className="tactical-brand">Gestione Squadra</h2>
      </div>

      <div className="tactical-gestione-form-box">
        <h3>Modifica Logo e Nome</h3>
        <form onSubmit={handleSalvaTutto} className="tactical-form-edit-squadra">
          <div className="tactical-logo-upload-container">
            <div className="tactical-logo-preview">
              {anteprima ? <img src={anteprima} alt="Logo" /> : <div className="no-logo">LOGO</div>}
            </div>
            <div className="tactical-logo-actions">
              <label className="tactical-btn-upload">
                Cambia Logo
                <input type="file" accept="image/*" onChange={handleFileChange} hidden />
              </label>
              {anteprima && (
                <button type="button" className="tactical-btn-elimina" onClick={handleEliminaLogo}>
                  Elimina
                </button>
              )}
            </div>
          </div>

          <div className="tactical-input-group">
            <label>Nome del Club</label>
            <input type="text" value={nuovoNome} onChange={(e) => setNuovoNome(e.target.value)} maxLength={40} />
          </div>

          {messaggio.testo && <div className={`tactical-form-feedback-msg ${messaggio.tipo}`}>{messaggio.testo}</div>}

          <button type="submit" className="tactical-btn-salva-squadra" disabled={saving}>
            {saving ? 'Salvataggio... ⏳' : 'Salva Modifiche 💾'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GestioneSquadra;