import { useMemo, useState } from 'react';
import { addDays, formattaLunga, giornoSettimana, oggi } from '../core/dates';
import { previsione } from '../core/cycle';
import { cicloInCorso, giornoDelCiclo } from '../core/periods';
import { useStore } from '../store';
import FoglioRegistrazione from '../components/FoglioRegistrazione';
import Avvertenza from '../components/Avvertenza';

const INIZIALI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function Oggi() {
  const stato = useStore((s) => s.stato);
  const setTab = useStore((s) => s.setTab);
  const [foglio, setFoglio] = useState<string | null>(null);

  const g = oggi();
  const p = useMemo(
    () => previsione(stato.periods, stato.settings.cicloMedioDichiarato, g),
    [stato.periods, stato.settings.cicloMedioDichiarato, g],
  );
  const inCorso = cicloInCorso(stato, g);
  const giorno = giornoDelCiclo(stato, g);
  const registratoOggi = Boolean(stato.dayLogs[g]);

  const settimana = useMemo(() => {
    const lunedi = addDays(g, -giornoSettimana(g));
    return Array.from({ length: 7 }, (_, i) => addDays(lunedi, i));
  }, [g]);

  const fertile = (d: string) => !!p && d >= p.fertileInizio && d <= p.fertileFine;

  return (
    <>
      <p className="text-xs text-tenue">Ciao Bibi 💗</p>

      {inCorso ? (
        <>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Sei al <span className="text-rosa">giorno {giorno}</span>
            <br />del ciclo
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-inchiostro/65">
            Iniziato {formattaLunga(inCorso.inizio)}.
          </p>
        </>
      ) : p && p.giorniAlProssimo < 0 ? (
        <>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Il ciclo è in ritardo
            <br />di <span className="text-rosa">{-p.giorniAlProssimo} giorni</span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-inchiostro/65">
            Qualche giorno di scarto è normale e capita a tutte.
          </p>
        </>
      ) : p ? (
        <>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Il ciclo arriva
            <br />tra <span className="text-rosa">{p.giorniAlProssimo} giorni</span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-inchiostro/65">
            {p.irregolare ? 'Intorno a ' : ''}
            {formattaLunga(p.prossimoInizio)}.
            <br />
            {fertile(g) ? (
              <>Questi giorni sei nel <b className="text-verde-scuro">periodo fertile</b>.</>
            ) : (
              <>Periodo fertile dal {formattaLunga(p.fertileInizio)}.</>
            )}
          </p>
        </>
      ) : null}

      {p?.irregolare && (
        <div className="mt-4 rounded-2xl border border-bordo bg-white p-3 text-[11px] leading-snug text-inchiostro/70">
          I tuoi ultimi cicli sono stati piuttosto irregolari, quindi questa previsione — e
          soprattutto il periodo fertile — è poco affidabile.
        </div>
      )}

      {p?.durataVincolata && (
        <div className="mt-3 rounded-2xl border border-bordo bg-white p-3 text-[11px] leading-snug text-inchiostro/70">
          I tuoi cicli risultano più {p.durataMediana === 45 ? 'lunghi' : 'corti'} di quelli che
          l'app sa prevedere bene, quindi sta usando {p.durataMediana} giorni. Se ti sembra
          sbagliato, correggi la durata dalle impostazioni.
        </div>
      )}

      <div className="mt-6 flex gap-1.5">
        {settimana.map((d, i) => {
          const oggiQ = d === g;
          const f = fertile(d);
          return (
            <div key={d} className="flex-1 text-center">
              <div className="text-[9px] text-tenue">{INIZIALI[i]}</div>
              <div
                className={`mt-1 rounded-xl py-1.5 text-sm font-semibold ${
                  oggiQ ? 'bg-rosa text-white' : f ? 'bg-verde text-verde-scuro' : 'bg-rosa-chiaro/50 text-inchiostro/70'
                }`}
              >
                {Number(d.slice(8, 10))}
              </div>
            </div>
          );
        })}
      </div>

      {inCorso && !registratoOggi && (
        <p className="mt-5 rounded-2xl bg-rosa-chiaro px-4 py-3 text-[13px] font-semibold text-rosa-scuro">
          Non hai ancora segnato oggi.
        </p>
      )}

      <button
        onClick={() => setFoglio(g)}
        className="mt-5 w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
      >
        🩸 {registratoOggi ? 'Modifica il ciclo di oggi' : 'Oggi mi è venuto'}
      </button>

      <button onClick={() => setTab('calendario')} className="mt-4 w-full rounded-2xl py-3 text-center text-[13px] leading-5 text-tenue">
        Vedi il calendario ›
      </button>

      <div className="mt-6 pb-4">
        <Avvertenza breve />
      </div>

      {foglio && (
        <FoglioRegistrazione
          key={foglio}
          data={foglio}
          onChiudi={() => setFoglio(null)}
          onScegliGiorno={() => {
            setFoglio(null);
            setTab('calendario');
          }}
        />
      )}
    </>
  );
}
