import { get, set } from 'idb-keyval';
import type { DayLog, Flusso, ISODate, Periodo, Stato } from '../types';
import { oggi } from '../core/dates';
import { derivaPeriodi } from '../core/periods';

const CHIAVE = 'bibiciclo:v1';
const VERSIONE_SCHEMA = 1;

const FLUSSI_VALIDI: readonly Flusso[] = ['leggero', 'medio', 'tanto'];

export function statoIniziale(dataInstallazione: ISODate): Stato {
  return {
    schemaVersion: VERSIONE_SCHEMA,
    settings: { cicloMedioDichiarato: 28, dataInstallazione },
    periods: [],
    dayLogs: {},
  };
}

function periodiValidi(v: unknown): Periodo[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (p): p is Periodo =>
      !!p && typeof p.id === 'string' && typeof p.inizio === 'string' && typeof p.fine === 'string',
  );
}

/** `YYYY-MM-DD` sintatticamente e come data di calendario realmente esistente (respinge `2026-13-45`). */
function dataValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Filtro di sicurezza per `dayLogs`, non un validatore che comunica errori
 * all'utente: le voci irriconoscibili vengono scartate in silenzio, quelle
 * riconoscibili conservate. Una `nota` che non è una stringa viene scartata
 * ma la voce resta (il `flusso` è comunque valido).
 */
function dayLogsValidi(v: unknown): Record<ISODate, DayLog> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};

  const risultato: Record<ISODate, DayLog> = {};
  for (const [data, valore] of Object.entries(v as Record<string, unknown>)) {
    if (!dataValida(data)) continue;
    if (!valore || typeof valore !== 'object') continue;

    const flusso = (valore as { flusso?: unknown }).flusso;
    if (!FLUSSI_VALIDI.includes(flusso as Flusso)) continue;

    const nota = (valore as { nota?: unknown }).nota;
    risultato[data] = typeof nota === 'string' ? { flusso: flusso as Flusso, nota } : { flusso: flusso as Flusso };
  }
  return risultato;
}

/**
 * Normalizza qualunque cosa fosse salvata in uno `Stato` valido.
 * Un dato corrotto non deve mai impedire l'avvio dell'app: nel dubbio si
 * conserva ciò che è riconoscibile e si reintegrano i campi mancanti.
 */
export function migra(grezzo: unknown, dataInstallazione: ISODate): Stato {
  const base = statoIniziale(dataInstallazione);
  if (!grezzo || typeof grezzo !== 'object') return base;

  const g = grezzo as Partial<Stato>;
  const dayLogs = dayLogsValidi(g.dayLogs);

  return {
    // Uno schemaVersion superiore al nostro significa che il dato è stato
    // scritto da una versione più recente dell'app: non va mai declassato,
    // perché quel numero è l'unico segnale che avvisa il codice di essere
    // indietro rispetto ai dati sul disco.
    schemaVersion:
      typeof g.schemaVersion === 'number' && g.schemaVersion > VERSIONE_SCHEMA
        ? g.schemaVersion
        : VERSIONE_SCHEMA,
    settings: {
      cicloMedioDichiarato:
        typeof g.settings?.cicloMedioDichiarato === 'number'
          ? g.settings.cicloMedioDichiarato
          : base.settings.cicloMedioDichiarato,
      dataInstallazione:
        typeof g.settings?.dataInstallazione === 'string'
          ? g.settings.dataInstallazione
          : dataInstallazione,
    },
    // I periods salvati non sono attendibili di per sé (potrebbero contraddire
    // i dayLogs): si derivano sempre dal diario, riusando solo gli id di quelli
    // salvati quando il loro inizio combacia con un gruppo derivato.
    periods: derivaPeriodi(dayLogs, periodiValidi(g.periods)),
    dayLogs,
  };
}

export async function caricaStato(): Promise<Stato> {
  return migra(await get(CHIAVE), oggi());
}

export async function salvaStato(stato: Stato): Promise<void> {
  await set(CHIAVE, stato);
}
