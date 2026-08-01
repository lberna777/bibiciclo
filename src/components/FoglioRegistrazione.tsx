import { useState } from 'react';
import type { Flusso, ISODate } from '../types';
import { formattaLunga } from '../core/dates';
import { useStore } from '../store';

const LIVELLI: Array<{ id: Flusso; gocce: string; testo: string }> = [
  { id: 'leggero', gocce: '💧', testo: 'Leggero' },
  { id: 'medio', gocce: '💧💧', testo: 'Medio' },
  { id: 'tanto', gocce: '💧💧💧', testo: 'Tanto' },
];

interface Props {
  data: ISODate;
  onChiudi: () => void;
  onScegliGiorno: () => void;
}

export default function FoglioRegistrazione({ data, onChiudi, onScegliGiorno }: Props) {
  const esistente = useStore((s) => s.stato.dayLogs[data]);
  const registra = useStore((s) => s.registra);
  const rimuovi = useStore((s) => s.rimuovi);

  const [flusso, setFlusso] = useState<Flusso>(esistente?.flusso ?? 'medio');
  const [nota, setNota] = useState(esistente?.nota ?? '');

  async function salva() {
    await registra(data, flusso, nota.trim() || undefined);
    onChiudi();
  }

  async function elimina() {
    if (!confirm('Vuoi togliere questo giorno dal diario?')) return;
    await rimuovi(data);
    onChiudi();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-inchiostro/45" onClick={onChiudi} />

      <div className="relative rounded-t-3xl bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bordo" />

        <h2 className="text-center text-lg font-extrabold">Ciclo di questo giorno</h2>
        <p className="mb-4 text-center text-xs text-tenue">{formattaLunga(data)}</p>

        <div className="flex gap-2">
          {LIVELLI.map((l) => (
            <button
              key={l.id}
              onClick={() => setFlusso(l.id)}
              className={`flex-1 rounded-2xl border py-3 text-xs font-bold ${
                flusso === l.id
                  ? 'border-rosa bg-rosa-chiaro text-rosa-scuro'
                  : 'border-bordo text-inchiostro/70'
              }`}
            >
              <span className="mb-1 block text-base">{l.gocce}</span>
              {l.testo}
            </button>
          ))}
        </div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Aggiungi una nota…"
          rows={2}
          className="mt-3 w-full resize-none rounded-2xl border border-bordo p-3 text-sm outline-none placeholder:text-tenue/70 focus:border-rosa"
        />

        <button
          onClick={() => void salva()}
          className="mt-3 w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
        >
          Salva
        </button>

        <button onClick={onScegliGiorno} className="mt-3 w-full text-center text-sm text-tenue py-3">
          È già iniziato? Scegli il giorno giusto ›
        </button>

        {esistente && (
          <button
            onClick={() => void elimina()}
            className="mt-3 w-full text-center text-sm font-semibold text-rosa-scuro py-3"
          >
            Rimuovi questo giorno
          </button>
        )}
      </div>
    </div>
  );
}
