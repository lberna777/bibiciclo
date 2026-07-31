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
    // dayLogs copre l'intero periodo (03, 05, 07 luglio: scarti di 2 giorni,
    // entro TOLLERANZA) così che inizio/fine del periodo siano entrambi
    // giorni realmente registrati — altrimenti derivaPeriodi non potrebbe
    // restituire immutato un periodo con un fine "fasullo".
    const valido = {
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 30, dataInstallazione: '2026-01-01' },
      periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }],
      dayLogs: {
        '2026-07-03': { flusso: 'medio' },
        '2026-07-05': { flusso: 'medio' },
        '2026-07-07': { flusso: 'leggero' },
      },
    };
    expect(migra(valido, '2026-07-31')).toEqual(valido);
  });
  it('reintegra i campi mancanti senza perdere i dati presenti', () => {
    const parziale = { schemaVersion: 1, periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }] };
    const s = migra(parziale, '2026-07-31');
    expect(s.settings.cicloMedioDichiarato).toBe(28);
    expect(s.dayLogs).toEqual({});
    // dayLogs è assente: un periodo salvato senza giorni di diario a
    // sostenerlo non deve sopravvivere alla migrazione (i periods sono
    // sempre derivati dal diario, mai presi per buoni così come sono salvati).
    expect(s.periods).toEqual([]);
  });

  it('scarta le voci di dayLogs non valide mantenendo quelle valide', () => {
    const grezzo = {
      dayLogs: {
        '2026-07-01': { flusso: 'medio' }, // valida, deve sopravvivere
        '2026-07-02': {}, // senza flusso
        '2026-07-03': { flusso: 'boh' }, // flusso non riconosciuto
        '2026-07-04': 'non un oggetto',
        '2026-13-45': { flusso: 'medio' }, // data inesistente
      },
    };
    const s = migra(grezzo, '2026-07-31');
    expect(s.dayLogs).toEqual({ '2026-07-01': { flusso: 'medio' } });
  });

  it('scarta dayLogs se è un array', () => {
    const s = migra({ dayLogs: ['a', 'b'] }, '2026-07-31');
    expect(s.dayLogs).toEqual({});
  });

  it('mantiene la voce ma scarta una nota che non è una stringa', () => {
    const s = migra({ dayLogs: { '2026-07-01': { flusso: 'medio', nota: 123 } } }, '2026-07-31');
    expect(s.dayLogs).toEqual({ '2026-07-01': { flusso: 'medio' } });
  });

  it('deriva i periods da dayLogs invece di fidarsi di periods salvati che li contraddicono', () => {
    const grezzo = {
      dayLogs: {
        '2026-07-03': { flusso: 'medio' },
        '2026-07-04': { flusso: 'medio' },
      },
      // periodo salvato completamente estraneo ai dayLogs sopra
      periods: [{ id: 'pX', inizio: '2026-01-01', fine: '2026-01-05' }],
    };
    const s = migra(grezzo, '2026-07-31');
    expect(s.periods).toEqual([{ id: expect.any(String), inizio: '2026-07-03', fine: '2026-07-04' }]);
  });

  it('riusa l id di un periodo salvato quando il suo inizio combacia con un gruppo derivato', () => {
    const grezzo = {
      dayLogs: {
        '2026-07-03': { flusso: 'medio' },
        '2026-07-04': { flusso: 'medio' },
      },
      // il fine salvato (03) non combacia col gruppo derivato (03..04), ma l'inizio sì
      periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-03' }],
    };
    const s = migra(grezzo, '2026-07-31');
    expect(s.periods).toEqual([{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-04' }]);
  });

  it('conserva uno schemaVersion più recente di quello del codice', () => {
    expect(migra({ schemaVersion: 99 }, '2026-07-31').schemaVersion).toBe(99);
  });

  it('timbra schemaVersion 1 se quello salvato è uguale, mancante o non numerico', () => {
    expect(migra({ schemaVersion: 1 }, '2026-07-31').schemaVersion).toBe(1);
    expect(migra({ schemaVersion: 'boh' }, '2026-07-31').schemaVersion).toBe(1);
    expect(migra({}, '2026-07-31').schemaVersion).toBe(1);
  });
});
