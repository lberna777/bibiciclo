import type { ISODate, Stato } from '../types';
import { migra } from './db';

const VERSIONE_SCHEMA = 1;

export function esportaJson(stato: Stato): string {
  return JSON.stringify(stato, null, 2);
}

export function nomeFileBackup(oggi: ISODate): string {
  return `bibiciclo-backup-${oggi}.json`;
}

/**
 * Legge un file di backup. I messaggi d'errore sono rivolti all'utente:
 * devono spiegare cosa fare, non cosa è andato storto tecnicamente.
 */
export function importaJson(testo: string, oggi: ISODate): Stato {
  let grezzo: unknown;
  try {
    grezzo = JSON.parse(testo);
  } catch {
    throw new Error('Questo file non sembra un backup di BibiCiclo.');
  }

  if (!grezzo || typeof grezzo !== 'object' || !('schemaVersion' in grezzo)) {
    throw new Error('Questo file non sembra un backup di BibiCiclo.');
  }

  const versione = (grezzo as { schemaVersion: unknown }).schemaVersion;
  if (typeof versione !== 'number') {
    throw new Error('Questo file non sembra un backup di BibiCiclo.');
  }
  if (versione > VERSIONE_SCHEMA) {
    throw new Error('Questo backup viene da una versione più recente dell\'app. Aggiorna BibiCiclo e riprova.');
  }

  return migra(grezzo, oggi);
}
