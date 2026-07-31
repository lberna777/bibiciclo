import type { ISODate } from '../types';

const MS_GIORNO = 86_400_000;

const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const pad = (n: number) => String(n).padStart(2, '0');

function aUtc(d: ISODate): number {
  const [y, m, g] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, g);
}

function daUtc(ms: number): ISODate {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return daUtc(aUtc(d) + n * MS_GIORNO);
}

export function diffDays(da: ISODate, a: ISODate): number {
  return Math.round((aUtc(a) - aUtc(da)) / MS_GIORNO);
}

/** Il giorno di calendario locale dell'utente. Unico punto che legge il fuso orario. */
export function oggi(): ISODate {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export function confronta(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 0 = lunedì … 6 = domenica */
export function giornoSettimana(d: ISODate): number {
  return (new Date(aUtc(d)).getUTCDay() + 6) % 7;
}

export function formattaLunga(d: ISODate): string {
  const [, m, g] = d.split('-').map(Number);
  return `${GIORNI[giornoSettimana(d)]} ${g} ${MESI[m - 1]}`;
}

export function formattaCorta(d: ISODate): string {
  const [, m, g] = d.split('-').map(Number);
  return `${g} ${MESI[m - 1]}`;
}

export function nomeMese(mese: number): string {
  return MESI[mese - 1];
}

/** Tutti i giorni del mese indicato. `mese` va da 1 a 12. */
export function giorniDelMese(anno: number, mese: number): ISODate[] {
  const giorni: ISODate[] = [];
  let d: ISODate = `${anno}-${pad(mese)}-01`;
  while (Number(d.slice(5, 7)) === mese) {
    giorni.push(d);
    d = addDays(d, 1);
  }
  return giorni;
}
