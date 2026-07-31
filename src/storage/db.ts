import { get, set } from 'idb-keyval';
import type { ISODate, Periodo, Stato } from '../types';
import { oggi } from '../core/dates';

const CHIAVE = 'bibiciclo:v1';
const VERSIONE_SCHEMA = 1;

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

/**
 * Normalizza qualunque cosa fosse salvata in uno `Stato` valido.
 * Un dato corrotto non deve mai impedire l'avvio dell'app: nel dubbio si
 * conserva ciò che è riconoscibile e si reintegrano i campi mancanti.
 */
export function migra(grezzo: unknown, dataInstallazione: ISODate): Stato {
  const base = statoIniziale(dataInstallazione);
  if (!grezzo || typeof grezzo !== 'object') return base;

  const g = grezzo as Partial<Stato>;
  return {
    schemaVersion: VERSIONE_SCHEMA,
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
    periods: periodiValidi(g.periods),
    dayLogs: g.dayLogs && typeof g.dayLogs === 'object' ? g.dayLogs : {},
  };
}

export async function caricaStato(): Promise<Stato> {
  return migra(await get(CHIAVE), oggi());
}

export async function salvaStato(stato: Stato): Promise<void> {
  await set(CHIAVE, stato);
}
