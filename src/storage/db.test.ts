import { describe, it, expect } from 'vitest';
import { statoIniziale, migra } from './db';

describe('statoIniziale', () => {
  it('parte vuoto con i valori predefiniti', () => {
    const s = statoIniziale('2026-07-31');
    expect(s.schemaVersion).toBe(1);
    expect(s.settings.cicloMedioDichiarato).toBe(28);
    expect(s.settings.dataInstallazione).toBe('2026-07-31');
    expect(s.periods).toEqual([]);
    expect(s.dayLogs).toEqual({});
  });
});

describe('migra', () => {
  it('restituisce lo stato iniziale se non c è nulla di salvato', () => {
    expect(migra(undefined, '2026-07-31').periods).toEqual([]);
  });
  it('restituisce lo stato iniziale se il salvataggio è irriconoscibile', () => {
    expect(migra({ pippo: 1 }, '2026-07-31').schemaVersion).toBe(1);
  });
  it('conserva uno stato valido', () => {
    const valido = {
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 30, dataInstallazione: '2026-01-01' },
      periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }],
      dayLogs: { '2026-07-03': { flusso: 'medio' } },
    };
    expect(migra(valido, '2026-07-31')).toEqual(valido);
  });
  it('reintegra i campi mancanti senza perdere i dati presenti', () => {
    const parziale = { schemaVersion: 1, periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }] };
    const s = migra(parziale, '2026-07-31');
    expect(s.periods).toHaveLength(1);
    expect(s.settings.cicloMedioDichiarato).toBe(28);
    expect(s.dayLogs).toEqual({});
  });
});
