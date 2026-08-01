import type { ISODate, Stato } from '../types';
import { migra } from './db';

const VERSIONE_SCHEMA = 1;

export interface EsitoImport {
  stato: Stato;
  /** Quante voci di diario presenti nel file non sono state importate. */
  giorniScartati: number;
}

export function esportaJson(stato: Stato): string {
  return JSON.stringify(stato, null, 2);
}

export function nomeFileBackup(oggi: ISODate): string {
  return `bibiciclo-backup-${oggi}.json`;
}

/**
 * Conta il numero di chiavi valide in un oggetto dayLogs raw.
 * Ritorna 0 se dayLogs non è un oggetto valido (null, array, ecc.).
 */
function contaGiorniRaw(dayLogsRaw: unknown): number {
  if (!dayLogsRaw || typeof dayLogsRaw !== 'object' || Array.isArray(dayLogsRaw)) {
    return 0;
  }
  return Object.keys(dayLogsRaw as Record<string, unknown>).length;
}

/**
 * Legge un file di backup. I messaggi d'errore sono rivolti all'utente:
 * devono spiegare cosa fare, non cosa è andato storto tecnicamente.
 *
 * Ritorna sia lo stato importato che il numero di voci di diario che non
 * hanno potuto essere importate (corrotte o in formato non riconoscibile).
 * Questo permette al chiamante di informare l'utente se alcuni giorni sono
 * stati scartati.
 */
export function importaJson(testo: string, oggi: ISODate): EsitoImport {
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

  // Contiamo i giorni grezzi (prima della validazione)
  const dayLogsRaw = (grezzo as { dayLogs?: unknown }).dayLogs;
  const giorniRaw = contaGiorniRaw(dayLogsRaw);

  // Applichiamo la migrazione, che valida e filtra
  const stato = migra(grezzo, oggi);

  // Giorni scartati = quelli che erano presenti nel file ma non sono sopravvissuti alla validazione
  const giorniScartati = Math.max(0, giorniRaw - Object.keys(stato.dayLogs).length);

  return { stato, giorniScartati };
}
