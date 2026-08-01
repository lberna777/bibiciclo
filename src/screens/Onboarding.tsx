import { useState } from 'react';
import { addDays, formattaLunga, giorniDelMese, giornoSettimana, nomeMese, oggi } from '../core/dates';
import { useStore } from '../store';
import Avvertenza from '../components/Avvertenza';

export default function Onboarding() {
  const [passo, setPasso] = useState(0);
  const [ultimoInizio, setUltimoInizio] = useState(addDays(oggi(), -14));
  const dichiarato = useStore((s) => s.stato.settings.cicloMedioDichiarato);
  const [cicloMedio, setCicloMedio] = useState(dichiarato);
  const completa = useStore((s) => s.completaOnboarding);

  return (
    <div className="flex h-full flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {passo === 0 && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight">Ciao Bibi 💗</h1>
          <p className="mt-3 text-base text-inchiostro/70">
            I tuoi dati restano su questo telefono. Non vengono inviati da nessuna parte,
            a nessuno.
          </p>
          <div className="mt-6 rounded-2xl border border-bordo bg-white p-4">
            <Avvertenza />
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setPasso(1)}
            className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
          >
            Ho capito, cominciamo
          </button>
        </>
      )}

      {passo === 1 && (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Quando è iniziato l'ultimo ciclo?
          </h1>
          <p className="mt-2 text-sm text-tenue">Tocca il giorno sul calendario.</p>
          <div className="mt-5">
            <SelettoreData valore={ultimoInizio} onCambia={setUltimoInizio} />
          </div>
          <div className="flex-1" />
          <p className="mb-3 text-center text-sm">
            Hai scelto <b>{formattaLunga(ultimoInizio)}</b>
          </p>
          <button
            onClick={() => setPasso(2)}
            className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
          >
            Avanti
          </button>
        </>
      )}

      {passo === 2 && (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Ogni quanti giorni ti viene, più o meno?
          </h1>
          <p className="mt-2 text-sm text-tenue">
            Se non lo sai, lascia 28: l'app imparerà da sola col tempo.
          </p>
          <div className="mt-10 flex items-center justify-center gap-7">
            <button
              onClick={() => setCicloMedio((n) => Math.max(21, n - 1))}
              className="h-16 w-16 rounded-full border border-bordo bg-white text-3xl font-bold text-rosa"
            >
              −
            </button>
            <div className="text-center">
              <div className="text-6xl font-extrabold text-rosa">{cicloMedio}</div>
              <div className="text-xs uppercase tracking-wider text-tenue">giorni</div>
            </div>
            <button
              onClick={() => setCicloMedio((n) => Math.min(45, n + 1))}
              className="h-16 w-16 rounded-full border border-bordo bg-white text-3xl font-bold text-rosa"
            >
              +
            </button>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => void completa(ultimoInizio, cicloMedio)}
            className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
          >
            Fatto
          </button>
        </>
      )}
    </div>
  );
}

/** Calendario compatto per scegliere una data passata. */
function SelettoreData({ valore, onCambia }: { valore: string; onCambia: (d: string) => void }) {
  const [anno, setAnno] = useState(Number(valore.slice(0, 4)));
  const [mese, setMese] = useState(Number(valore.slice(5, 7)));
  const giorni = giorniDelMese(anno, mese);
  const vuoti = giornoSettimana(giorni[0]);
  const limite = oggi();

  function spostaMese(delta: number) {
    const m = mese + delta;
    if (m < 1) { setMese(12); setAnno(anno - 1); }
    else if (m > 12) { setMese(1); setAnno(anno + 1); }
    else setMese(m);
  }

  return (
    <div className="rounded-2xl border border-bordo bg-white p-3">
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-bold">
        <button onClick={() => spostaMese(-1)} className="px-3 py-1 text-rosa">‹</button>
        <span>{nomeMese(mese)} {anno}</span>
        <button onClick={() => spostaMese(1)} className="px-3 py-1 text-rosa">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-tenue">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, i) => <div key={i}>{g}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: vuoti }, (_, i) => <div key={`v${i}`} />)}
        {giorni.map((g) => {
          const futuro = g > limite;
          const scelto = g === valore;
          return (
            <button
              key={g}
              disabled={futuro}
              onClick={() => onCambia(g)}
              className={`aspect-square rounded-full text-sm ${
                scelto ? 'bg-rosa font-bold text-white' : futuro ? 'text-tenue/30' : 'text-inchiostro'
              }`}
            >
              {Number(g.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
