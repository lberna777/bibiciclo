import { useMemo, useState } from 'react';
import { addDays, giorniDelMese, giornoSettimana, nomeMese, oggi } from '../core/dates';
import { previsione } from '../core/cycle';
import { useStore } from '../store';
import FoglioRegistrazione from '../components/FoglioRegistrazione';

export default function Calendario() {
  const stato = useStore((s) => s.stato);
  const g = oggi();
  const [anno, setAnno] = useState(Number(g.slice(0, 4)));
  const [mese, setMese] = useState(Number(g.slice(5, 7)));
  const [foglio, setFoglio] = useState<string | null>(null);

  const p = useMemo(
    () => previsione(stato.periods, stato.settings.cicloMedioDichiarato, g),
    [stato.periods, stato.settings.cicloMedioDichiarato, g],
  );

  /** Giorni del prossimo ciclo previsto, per la campitura tratteggiata. */
  const previsti = useMemo(() => {
    if (!p) return new Set<string>();
    return new Set(
      Array.from({ length: p.durataMestruazioni }, (_, i) => addDays(p.prossimoInizio, i)),
    );
  }, [p]);

  const giorni = giorniDelMese(anno, mese);
  const vuoti = giornoSettimana(giorni[0]);

  function spostaMese(delta: number) {
    const m = mese + delta;
    if (m < 1) { setMese(12); setAnno(anno - 1); }
    else if (m > 12) { setMese(1); setAnno(anno + 1); }
    else setMese(m);
  }

  function classi(d: string): string {
    const bordoOggi = d === g ? ' outline outline-2 outline-inchiostro' : '';
    if (stato.dayLogs[d]) return 'bg-rosa font-bold text-white' + bordoOggi;
    if (previsti.has(d)) return 'border border-dashed border-rosa bg-rosa-chiaro text-rosa-scuro' + bordoOggi;
    if (p && d >= p.fertileInizio && d <= p.fertileFine) return 'bg-verde text-verde-scuro' + bordoOggi;
    return 'text-inchiostro/75' + bordoOggi;
  }

  return (
    <>
      <div className="flex items-center justify-between text-base font-bold">
        <button onClick={() => spostaMese(-1)} className="px-5 py-3 text-rosa">‹</button>
        <span>{nomeMese(mese)} {anno}</span>
        <button onClick={() => spostaMese(1)} className="px-5 py-3 text-rosa">›</button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-tenue">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x, i) => <div key={i}>{x}</div>)}
      </div>

      {/* gap-1, non gap-1.5: su uno schermo da 375px serve a far arrivare
          le celle a 44px, il minimo tocca­bile su iOS. */}
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {Array.from({ length: vuoti }, (_, i) => <div key={`v${i}`} />)}
        {giorni.map((d) => (
          <button
            key={d}
            onClick={() => setFoglio(d)}
            className={`aspect-square rounded-full text-[13px] ${classi(d)}`}
          >
            {Number(d.slice(8, 10))}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-inchiostro/70">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-rosa" />ciclo
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-verde" />fertile
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-rosa bg-rosa-chiaro" />previsto
        </span>
      </div>

      <p className="mt-4 pb-4 text-[13px] text-tenue">
        Tocca un giorno qualsiasi per segnarlo o correggerlo.
      </p>

      {foglio && (
        <FoglioRegistrazione
          key={foglio}
          data={foglio}
          onChiudi={() => setFoglio(null)}
          onScegliGiorno={() => setFoglio(null)}
        />
      )}
    </>
  );
}
