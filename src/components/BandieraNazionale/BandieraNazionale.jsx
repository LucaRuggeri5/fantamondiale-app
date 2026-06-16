import React from 'react';

// Mappa completa e centralizzata di tutte le emoji delle nazionali richieste
const DIZIONARIO_BANDIERE = {
  'canada': '🇨🇦',
  'messico': '🇲🇽',
  'stati uniti': '🇺🇸',
  'usa': '🇺🇸',
  'giappone': '🇯🇵',
  'nuova zelanda': '🇳🇿',
  'iran': '🇮🇷',
  'argentina': '🇦🇷',
  'uzbekistan': '🇺🇿',
  'corea del sud': '🇰🇷',
  'giordania': '🇯🇴',
  'australia': '🇦🇺',
  'brasile': '🇧🇷',
  'ecuador': '🇪🇨',
  'uruguay': '🇺🇾',
  'colombia': '🇨🇴',
  'paraguay': '🇵🇾',
  'marocco': '🇲🇦',
  'tunisia': '🇹🇳',
  'egitto': '🇪🇬',
  'algeria': '🇩🇿',
  'ghana': '🇬🇭',
  'capo verde': '🇨🇻',
  'sudafrica': '🇿🇦',
  'qatar': '🇶🇦',
  'inghilterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'arabia saudita': '🇸🇦',
  'senegal': '🇸🇳',
  'costa d\'avorio': '🇨🇮',
  'costa d’avorio': '🇨🇮',
  'costa davorio': '🇨🇮',
  'francia': '🇫🇷',
  'croazia': '🇭🇷',
  'portogallo': '🇵🇹',
  'norvegia': '🇳🇴',
  'germania': '🇩🇪',
  'olanda': '🇳🇱',
  'paesi bassi': '🇳🇱',
  'belgio': '🇧🇪',
  'austria': '🇦🇹',
  'svizzera': '🇨🇭',
  'spagna': '🇪🇸',
  'scozia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'panama': '🇵🇦',
  'haiti': '🇭🇹',
  'curacao': '🇨🇼',
  'svezia': '🇸🇪',
  'turchia': '🇹🇷',
  'repubblica ceca': '🇨🇿',
  'bosnia': '🇧🇦',
  'iraq': '🇮🇶',
  'rd congo': '🇨🇩'
};

const BandieraNazionale = ({ nazione, className = "" }) => {
  if (!nazione) return <span className={`emoji-flag ${className}`}>🏳️</span>;

  // Normalizziamo la stringa per evitare problemi di maiuscole/minuscole o spazi vuoti
  const nazioneKey = nazione.toLowerCase().trim();
  const emoji = DIZIONARIO_BANDIERE[nazioneKey] || '🏳️';

  return (
    <span 
      className={`emoji-flag ${className}`} 
      title={nazione}
      style={{ marginRight: '6px', marginLeft: '6px', fontStyle: 'normal' }}
    >
      {emoji}
    </span>
  );
};

export default BandieraNazionale;