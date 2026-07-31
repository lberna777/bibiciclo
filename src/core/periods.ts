import type { Flusso, ISODate, Periodo, Stato } from '../types';
import { addDays, confronta, diffDays } from './dates';

/** Giorni di scarto entro cui una registrazione appartiene ancora allo stesso ciclo. */
const TOLLERANZA = 2;

let contatore = 0;
function nuovoId(): string {
  contatore += 1;
  return `p${Date.now().toString(36)}${contatore.toString(36)}`;
}

const ordina = (p: Periodo[]) => [...p].sort((a, b) => confronta(a.inizio, b.inizio));

const contiene = (p: Periodo, d: ISODate) => d >= p.inizio && d <= p.fine;

/**
 * Registra un giorno di flusso.
 *
 * Il giorno viene assorbito dal ciclo che gli sta vicino entro TOLLERANZA giorni:
 * dimenticare di segnare un giorno non deve spezzare un ciclo in due, perché due
 * `inizio` fasulli falserebbero tutte le medie successive.
 */
export function registraGiorno(stato: Stato, data: ISODate, flusso: Flusso, nota?: string): Stato {
  const dayLogs = { ...stato.dayLogs, [data]: nota ? { flusso, nota } : { flusso } };
  const periods = ordina(stato.periods);

  const dentro = periods.find((p) => contiene(p, data));
  if (dentro) return { ...stato, dayLogs };

  const daEstendereAvanti = periods.find((p) => {
    const scarto = diffDays(p.fine, data);
    return scarto > 0 && scarto <= TOLLERANZA;
  });
  if (daEstendereAvanti) {
    return {
      ...stato,
      dayLogs,
      periods: periods.map((p) => (p.id === daEstendereAvanti.id ? { ...p, fine: data } : p)),
    };
  }

  const daEstendereIndietro = periods.find((p) => {
    const scarto = diffDays(data, p.inizio);
    return scarto > 0 && scarto <= TOLLERANZA;
  });
  if (daEstendereIndietro) {
    return {
      ...stato,
      dayLogs,
      periods: periods.map((p) => (p.id === daEstendereIndietro.id ? { ...p, inizio: data } : p)),
    };
  }

  return {
    ...stato,
    dayLogs,
    periods: ordina([...periods, { id: nuovoId(), inizio: data, fine: data }]),
  };
}

/**
 * Rimuove un giorno dal diario e riallinea i cicli.
 * Se il giorno era centrale, il ciclo viene spezzato in due: è un caso raro,
 * ma va gestito senza lasciare periodi che contengono giorni non registrati.
 */
export function rimuoviGiorno(stato: Stato, data: ISODate): Stato {
  if (!stato.dayLogs[data]) return stato;

  const dayLogs = { ...stato.dayLogs };
  delete dayLogs[data];

  const contenitore = stato.periods.find((p) => contiene(p, data));
  if (!contenitore) return { ...stato, dayLogs };

  const risultanti: Periodo[] = [];
  if (data > contenitore.inizio) {
    risultanti.push({ ...contenitore, fine: addDays(data, -1) });
  }
  if (data < contenitore.fine) {
    risultanti.push({ id: nuovoId(), inizio: addDays(data, 1), fine: contenitore.fine });
  }

  return {
    ...stato,
    dayLogs,
    periods: ordina([...stato.periods.filter((p) => p.id !== contenitore.id), ...risultanti]),
  };
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
