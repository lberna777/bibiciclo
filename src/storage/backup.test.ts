import { describe, it, expect } from 'vitest';
import { esportaJson, importaJson, nomeFileBackup } from './backup';
import type { Stato } from '../types';

const stato: Stato = {
  schemaVersion: 1,
  settings: { cicloMedioDichiarato: 29, dataInstallazione: '2026-07-01' },
  periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }],
  dayLogs: {
    '2026-07-03': { flusso: 'medio', nota: 'ciao' },
    '2026-07-05': { flusso: 'leggero' },
    '2026-07-07': { flusso: 'tanto' },
  },
};

describe('esporta e importa', () => {
  it('conserva lo stato attraverso il ciclo completo', () => {
    const { stato: importato, giorniScartati } = importaJson(esportaJson(stato), '2026-08-01');
    expect(importato).toEqual(stato);
    expect(giorniScartati).toBe(0);
  });

  it('rifiuta un file che non è JSON', () => {
    expect(() => importaJson('non sono json', '2026-08-01')).toThrow(/non sembra un backup/i);
  });

  it('rifiuta un JSON che non è un backup di BibiCiclo', () => {
    expect(() => importaJson('{"foo":1}', '2026-08-01')).toThrow(/non sembra un backup/i);
  });

  it('rifiuta un backup di una versione più recente', () => {
    const futuro = JSON.stringify({ ...stato, schemaVersion: 99 });
    expect(() => importaJson(futuro, '2026-08-01')).toThrow(/versione più recente/i);
  });

  it('rileva i giorni scartati per voci corrotte nel diario', () => {
    const backupConVociMale = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: {
        '2026-07-03': { flusso: 'medio' },           // valido
        '2026-07-04': { flusso: 'pippo' },           // flusso invalido
        '2026-07-05': { flusso: 'leggero' },         // valido
        '2026-13-45': { flusso: 'tanto' },           // data invalida
        '2026-07-06': { flusso: 'medio', nota: 'ok' }, // valido
      },
    });

    const { stato: importato, giorniScartati } = importaJson(backupConVociMale, '2026-08-01');
    expect(giorniScartati).toBe(2); // 2026-07-04 e 2026-13-45 scartati
    expect(Object.keys(importato.dayLogs)).toHaveLength(3); // solo 3 giorni validi
    expect(importato.dayLogs['2026-07-03']).toBeDefined();
    expect(importato.dayLogs['2026-07-05']).toBeDefined();
    expect(importato.dayLogs['2026-07-06']).toBeDefined();
  });

  it('rifiuta un backup con dayLogs come array (nessun giorno leggibile)', () => {
    const backupConArrayDayLogs = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: ['not', 'an', 'object'],
    });

    expect(() => importaJson(backupConArrayDayLogs, '2026-08-01')).toThrow(
      /non contiene nessun giorno leggibile/i,
    );
  });

  it('preserva i giorni anche con periodi nonsensici nel file', () => {
    const backupConPeriiodiNonsensici = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [
        { id: 'broken', inizio: 'non-una-data', fine: 'pure-questa' },
        { id: 'p2' }, // non ha inizio/fine
      ],
      dayLogs: {
        '2026-07-03': { flusso: 'medio' },
        '2026-07-05': { flusso: 'leggero' },
        '2026-07-07': { flusso: 'tanto' },
      },
    });

    const { stato: importato, giorniScartati } = importaJson(backupConPeriiodiNonsensici, '2026-08-01');
    expect(giorniScartati).toBe(0); // i periodi non c'entrano, sono derivati
    expect(Object.keys(importato.dayLogs)).toHaveLength(3);
    // I periodi vengono ricalcolati dai dayLogs validi
    expect(importato.periods).toHaveLength(1);
    expect(importato.periods[0]).toEqual({ id: expect.any(String), inizio: '2026-07-03', fine: '2026-07-07' });
  });
});

describe('importaJson rifiuta un file senza nessun giorno leggibile (invece di svuotare i dati)', () => {
  it('dayLogs assente', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
    });
    expect(() => importaJson(backup, '2026-08-01')).toThrow(
      "Questo backup non contiene nessun giorno leggibile. Non l'ho importato, così non sovrascrivi quello che hai già.",
    );
  });

  it('dayLogs null', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: null,
    });
    expect(() => importaJson(backup, '2026-08-01')).toThrow(
      "Questo backup non contiene nessun giorno leggibile. Non l'ho importato, così non sovrascrivi quello che hai già.",
    );
  });

  it('dayLogs è un array', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: ['not', 'an', 'object'],
    });
    expect(() => importaJson(backup, '2026-08-01')).toThrow(
      "Questo backup non contiene nessun giorno leggibile. Non l'ho importato, così non sovrascrivi quello che hai già.",
    );
  });

  it('dayLogs è una stringa', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: 'boh',
    });
    expect(() => importaJson(backup, '2026-08-01')).toThrow(
      "Questo backup non contiene nessun giorno leggibile. Non l'ho importato, così non sovrascrivi quello che hai già.",
    );
  });

  it('dayLogs con solo voci corrotte (nessuna sopravvive)', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: { '2026-07-04': { flusso: 'pippo' }, '2026-13-45': { flusso: 'tanto' } },
    });
    expect(() => importaJson(backup, '2026-08-01')).toThrow(/non contiene nessun giorno leggibile/i);
  });

  it('un {} genuinamente vuoto è un backup legittimo: nessun errore', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [],
      dayLogs: {},
    });
    const { stato: importato, giorniScartati } = importaJson(backup, '2026-08-01');
    expect(giorniScartati).toBe(0);
    expect(importato.dayLogs).toEqual({});
  });

  it('un backup normale con giorni continua a funzionare come prima', () => {
    const backup = JSON.stringify({
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-03' }],
      dayLogs: { '2026-07-03': { flusso: 'medio' } },
    });
    const { stato: importato, giorniScartati } = importaJson(backup, '2026-08-01');
    expect(giorniScartati).toBe(0);
    expect(importato.dayLogs).toEqual({ '2026-07-03': { flusso: 'medio' } });
  });
});

describe('nomeFileBackup', () => {
  it('include la data', () => {
    expect(nomeFileBackup('2026-08-01')).toBe('bibiciclo-backup-2026-08-01.json');
  });
});

describe('Round-trip con più periodi', () => {
  it('preserva due periodi separati e multiple dayLogs con nota', () => {
    const statoConDuePeriodi: Stato = {
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
      periods: [
        { id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' },
        { id: 'p2', inizio: '2026-07-20', fine: '2026-07-24' },
      ],
      dayLogs: {
        '2026-07-03': { flusso: 'medio', nota: 'giorno 1' },
        '2026-07-05': { flusso: 'leggero' },
        '2026-07-07': { flusso: 'tanto', nota: 'ultimo giorno primo ciclo' },
        '2026-07-20': { flusso: 'leggero' },
        '2026-07-22': { flusso: 'medio' },
        '2026-07-24': { flusso: 'tanto', nota: 'fine secondo ciclo' },
      },
    };

    const exported = esportaJson(statoConDuePeriodi);
    const { stato: importato, giorniScartati } = importaJson(exported, '2026-08-01');

    expect(importato).toEqual(statoConDuePeriodi);
    expect(giorniScartati).toBe(0);
  });
});
