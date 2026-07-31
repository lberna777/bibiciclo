import type { Flusso, ISODate, Periodo, Stato } from '../types';
import { confronta, diffDays } from './dates';

/** Giorni di scarto entro cui una registrazione appartiene ancora allo stesso ciclo. */
const TOLLERANZA = 2;

let contatore = 0;
function nuovoId(): string {
  contatore += 1;
  return `p${Date.now().toString(36)}${contatore.toString(36)}`;
}

const ordina = (p: Periodo[]) => [...p].sort((a, b) => confronta(a.inizio, b.inizio));

/**
 * Normalizza i periodi derivandoli da dayLogs.
 *
 * Raggruppa i giorni registrati in cicli, dove due giorni appartengono allo stesso ciclo
 * se il gap tra loro è ≤ TOLLERANZA. Preserva gli ID dei periodi esistenti quando possibile
 * (matchando l'inizio), altrimenti minta nuovi ID.
 *
 * Questa derivazione garantisce che:
 * - Ogni `inizio` e `fine` di un periodo è un giorno effettivamente registrato
 * - Due registrazioni non creano mai una "fusione cieca" di periodi distinti
 * - Lo stato è una pura funzione del diario: stessa dayLogs → stessi periods
 */
function normalizza(dayLogs: Record<ISODate, unknown>, periodsEsistenti: Periodo[]): Periodo[] {
  const dates = Object.keys(dayLogs).sort();

  if (dates.length === 0) return [];

  const groups: ISODate[][] = [];
  let currentGroup: ISODate[] = [dates[0]];

  for (let i = 1; i < dates.length; i++) {
    const gap = diffDays(dates[i - 1], dates[i]);
    if (gap <= TOLLERANZA) {
      currentGroup.push(dates[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [dates[i]];
    }
  }
  groups.push(currentGroup);

  const newPeriods = groups.map((group) => {
    const inizio = group[0];
    const fine = group[group.length - 1];

    const existing = periodsEsistenti.find((p) => p.inizio === inizio);
    const id = existing?.id ?? nuovoId();

    return { id, inizio, fine };
  });

  return ordina(newPeriods);
}

/**
 * Registra un giorno di flusso.
 *
 * Il giorno viene assorbito dal ciclo che gli sta vicino entro TOLLERANZA giorni:
 * dimenticare di segnare un giorno non deve spezzare un ciclo in due, perché due
 * `inizio` fasulli falserebbero tutte le medie successive.
 */
export function registraGiorno(stato: Stato, data: ISODate, flusso: Flusso, nota?: string): Stato {
  const dayLogs = { ...stato.dayLogs, [data]: nota ? { flusso, nota } : { flusso } };
  const periods = normalizza(dayLogs, stato.periods);
  return { ...stato, dayLogs, periods };
}

/**
 * Rimuove un giorno dal diario e riallinea i cicli.
 * I cicli vengono automaticamente ricalcolati dal normalizzer, il quale garantisce
 * che ogni boundary di un periodo è un giorno effettivamente registrato.
 */
export function rimuoviGiorno(stato: Stato, data: ISODate): Stato {
  if (!stato.dayLogs[data]) return stato;

  const dayLogs = { ...stato.dayLogs };
  delete dayLogs[data];

  const periods = normalizza(dayLogs, stato.periods);
  return { ...stato, dayLogs, periods };
}

/** Il ciclo è "in corso" se l'ultimo giorno registrato dista non più di TOLLERANZA da oggi. */
export function cicloInCorso(stato: Stato, oggi: ISODate): Periodo | null {
  const p = ordina(stato.periods).at(-1);
  if (!p) return null;
  const scarto = diffDays(p.fine, oggi);
  return scarto >= 0 && scarto <= TOLLERANZA ? p : null;
}

/** Numero del giorno all'interno del ciclo in corso, a partire da 1. */
export function giornoDelCiclo(stato: Stato, oggi: ISODate): number | null {
  const p = cicloInCorso(stato, oggi);
  return p ? diffDays(p.inizio, oggi) + 1 : null;
}
