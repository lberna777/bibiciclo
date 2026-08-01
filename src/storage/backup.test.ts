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
    expect(importaJson(esportaJson(stato), '2026-08-01')).toEqual(stato);
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
    const imported = importaJson(exported, '2026-08-01');

    expect(imported).toEqual(statoConDuePeriodi);
  });
});
