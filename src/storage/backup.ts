import type { ISODate, Stato } from '../types';
import { migra, VERSIONE_SCHEMA } from './db';

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
 * Un `dayLogs` grezzo è un backup "legittimamente vuoto" solo se è un
 * oggetto piano con zero chiavi: un diario mai iniziato. Qualunque altra
 * forma (assente, `null`, un array, una stringa, o un oggetto con chiavi
 * che non sono sopravvissute alla validazione) non è un vuoto genuino: è
 * un file illeggibile, e va trattato come tale anziché come "niente da
 * importare".
 */
function eraVuotoLegittimo(dayLogsRaw: unknown): boolean {
  return (
    !!dayLogsRaw &&
    typeof dayLogsRaw === 'object' &&
    !Array.isArray(dayLogsRaw) &&
    Object.keys(dayLogsRaw as Record<string, unknown>).length === 0
  );
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

  // Se non è sopravvissuto nessun giorno e il file non era un backup
  // genuinamente vuoto, l'importazione non ha recuperato niente di
  // leggibile: restituire successo scriverebbe questo stato vuoto sopra
  // ai dati reali dell'utente. Meglio rifiutare esplicitamente che
  // dichiarare un ripristino riuscito che in realtà cancella tutto.
  if (Object.keys(stato.dayLogs).length === 0 && !eraVuotoLegittimo(dayLogsRaw)) {
    throw new Error(
      'Questo backup non contiene nessun giorno leggibile. Non l\'ho importato, così non sovrascrivi quello che hai già.',
    );
  }

  // Giorni scartati = quelli che erano presenti nel file ma non sono sopravvissuti alla validazione
  const giorniScartati = Math.max(0, giorniRaw - Object.keys(stato.dayLogs).length);

  return { stato, giorniScartati };
}
