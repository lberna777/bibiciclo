import { useState } from 'react';
import { condividiFile } from './lib/share';

const ICS_PROVA = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//BibiCiclo//IT',
  'BEGIN:VEVENT',
  'UID:prova@bibiciclo',
  'DTSTAMP:20260731T120000Z',
  'DTSTART;VALUE=DATE:20260810',
  'DTEND;VALUE=DATE:20260811',
  'SUMMARY:Prova BibiCiclo',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

export default function App() {
  const [esito, setEsito] = useState('');

  async function prova() {
    const file = new File([ICS_PROVA], 'prova.ics', { type: 'text/calendar' });
    setEsito(await condividiFile(file, 'Prova BibiCiclo'));
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Prova condivisione</h1>
      <button onClick={prova} className="w-full rounded-2xl bg-rosa px-4 py-4 font-bold text-white">
        Condividi un evento di prova
      </button>
      <p className="text-tenue">Esito: {esito || '—'}</p>
    </div>
  );
}
