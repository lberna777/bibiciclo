import type { ISODate, Periodo } from '../types';
import { addDays, confronta, diffDays } from './dates';

const CICLI_CONSIDERATI = 6;
const DURATA_MIN = 21;
const DURATA_MAX = 45;
const SOGLIA_IRREGOLARITA = 7;
const GIORNI_FASE_LUTEALE = 14;
const FERTILE_PRIMA = 5;
const FERTILE_DOPO = 1;
const DURATA_MESTRUAZIONI_DEFAULT = 5;

export interface Previsione {
  prossimoInizio: ISODate;
  /** Negativo se la data prevista è già passata. */
  giorniAlProssimo: number;
  durataMediana: number;
  durataMestruazioni: number;
  fertileInizio: ISODate;
  fertileFine: ISODate;
  irregolare: boolean;
  /** false quando la previsione poggia sul valore dichiarato anziché sullo storico. */
  basataSuStorico: boolean;
  /** true quando la durata usata è stata riportata dentro l'intervallo 21-45. */
  durataVincolata: boolean;
}

function ordinati(periods: Periodo[]): Periodo[] {
  return [...periods].sort((a, b) => confronta(a.inizio, b.inizio));
}

function mediana(valori: number[]): number {
  const v = [...valori].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

const vincola = (n: number) => Math.min(DURATA_MAX, Math.max(DURATA_MIN, n));

/** Distanze in giorni fra inizi consecutivi, in ordine cronologico. */
export function lunghezzeCicli(periods: Periodo[]): number[] {
  const p = ordinati(periods);
  const out: number[] = [];
  for (let i = 1; i < p.length; i++) out.push(diffDays(p[i - 1].inizio, p[i].inizio));
  return out;
}

const ultime = (periods: Periodo[]) => lunghezzeCicli(periods).slice(-CICLI_CONSIDERATI);

/**
 * Mediana delle ultime lunghezze misurate, vincolata a 21-45 giorni.
 * La mediana, e non la media, perché un singolo ciclo anomalo non deve
 * spostare le previsioni per mesi.
 */
export function durataMediana(periods: Periodo[], dichiarato: number): number {
  const l = ultime(periods);
  return vincola(l.length === 0 ? dichiarato : mediana(l));
}

/** Servono almeno 3 lunghezze misurate per dire qualcosa sulla regolarità. */
export function isIrregolare(periods: Periodo[]): boolean {
  const l = ultime(periods);
  if (l.length < 3) return false;
  return Math.max(...l) - Math.min(...l) > SOGLIA_IRREGOLARITA;
}

export function durataMestruazioni(periods: Periodo[]): number {
  if (periods.length === 0) return DURATA_MESTRUAZIONI_DEFAULT;
  return mediana(periods.map((p) => diffDays(p.inizio, p.fine) + 1));
}

const rawDurata = (periods: Periodo[], dichiarato: number): number => {
  const l = ultime(periods);
  return l.length === 0 ? dichiarato : mediana(l);
};

export function previsione(periods: Periodo[], dichiarato: number, oggi: ISODate): Previsione | null {
  if (periods.length === 0) return null;

  const p = ordinati(periods);
  const ultimo = p[p.length - 1];
  const raw = rawDurata(periods, dichiarato);
  const durata = durataMediana(periods, dichiarato);
  const prossimoInizio = addDays(ultimo.inizio, durata);

  // L'ovulazione si stima all'indietro dal prossimo ciclo: la fase luteale
  // è la parte stabile del ciclo, molto più della prima metà.
  const ovulazione = addDays(prossimoInizio, -GIORNI_FASE_LUTEALE);

  return {
    prossimoInizio,
    giorniAlProssimo: diffDays(oggi, prossimoInizio),
    durataMediana: durata,
    durataMestruazioni: durataMestruazioni(periods),
    fertileInizio: addDays(ovulazione, -FERTILE_PRIMA),
    fertileFine: addDays(ovulazione, FERTILE_DOPO),
    irregolare: isIrregolare(periods),
    basataSuStorico: ultime(periods).length > 0,
    durataVincolata: raw !== durata,
  };
}
