import { describe, it, expect } from 'vitest';
import { registraGiorno, rimuoviGiorno, cicloInCorso, giornoDelCiclo } from './periods';
import type { Stato } from '../types';

function statoVuoto(): Stato {
  return {
    schemaVersion: 1,
    settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
    periods: [],
    dayLogs: {},
  };
}

describe('registraGiorno', () => {
  it('apre un ciclo nuovo partendo da zero', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-03' });
    expect(s.dayLogs['2026-07-03']).toEqual({ flusso: 'medio' });
  });

  it('non modifica lo stato ricevuto', () => {
    const originale = statoVuoto();
    registraGiorno(originale, '2026-07-03', 'medio');
    expect(originale.periods).toHaveLength(0);
  });

  it('salva la nota quando è presente', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'tanto', 'mal di schiena');
    expect(s.dayLogs['2026-07-03']).toEqual({ flusso: 'tanto', nota: 'mal di schiena' });
  });

  it('estende in avanti il giorno successivo', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-04', 'medio');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0].fine).toBe('2026-07-04');
  });

  it('estende in avanti anche saltando un giorno (tolleranza 2)', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-05', 'leggero');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0].fine).toBe('2026-07-05');
  });

  it('apre un ciclo nuovo oltre la tolleranza', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-06', 'medio');
    expect(s.periods).toHaveLength(2);
  });

  it('estende all indietro se il giorno precede di poco un ciclo esistente', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-04', 'medio');
    s = registraGiorno(s, '2026-07-03', 'leggero');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0].inizio).toBe('2026-07-03');
  });

  it('aggiorna soltanto il diario se il giorno cade dentro un ciclo esistente', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-05', 'medio');
    s = registraGiorno(s, '2026-07-04', 'tanto');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-05' });
    expect(s.dayLogs['2026-07-04'].flusso).toBe('tanto');
  });

  it('mantiene i cicli ordinati per data', () => {
    let s = registraGiorno(statoVuoto(), '2026-08-01', 'medio');
    s = registraGiorno(s, '2026-07-03', 'medio');
    expect(s.periods.map((p) => p.inizio)).toEqual(['2026-07-03', '2026-08-01']);
  });
});

describe('rimuoviGiorno', () => {
  it('elimina il ciclo se il giorno era l unico', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = rimuoviGiorno(s, '2026-07-03');
    expect(s.periods).toHaveLength(0);
    expect(s.dayLogs['2026-07-03']).toBeUndefined();
  });

  it('accorcia il ciclo se si rimuove l ultimo giorno', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-04', 'medio');
    s = rimuoviGiorno(s, '2026-07-04');
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-03' });
  });

  it('accorcia il ciclo se si rimuove il primo giorno', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-04', 'medio');
    s = rimuoviGiorno(s, '2026-07-03');
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-04', fine: '2026-07-04' });
  });

  it('togliere un giorno centrale non spezza il ciclo se il buco resta nella tolleranza', () => {
    let s = statoVuoto();
    for (const d of ['2026-07-03', '2026-07-04', '2026-07-05']) s = registraGiorno(s, d, 'medio');
    s = rimuoviGiorno(s, '2026-07-04');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-05' });
  });

  it('rimuovere giorni spezza il ciclo se il buco supera la tolleranza', () => {
    let s = statoVuoto();
    for (const d of ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']) {
      s = registraGiorno(s, d, 'medio');
    }
    s = rimuoviGiorno(s, '2026-07-02');
    s = rimuoviGiorno(s, '2026-07-03');
    expect(s.periods).toHaveLength(2);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-01', fine: '2026-07-01' });
    expect(s.periods[1]).toMatchObject({ inizio: '2026-07-04', fine: '2026-07-05' });
  });

  it('non fa nulla se il giorno non era registrato', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(rimuoviGiorno(s, '2026-09-09').periods).toHaveLength(1);
  });

  it('riempire il buco tra due periodi li fonde in uno', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-01', 'medio');
    s = registraGiorno(s, '2026-07-05', 'medio');
    s = registraGiorno(s, '2026-07-03', 'medio');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-01', fine: '2026-07-05' });
  });

  it('rimuovere un giorno limite di un periodo a gap tollerato mantiene il logbook consistente', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-01', 'medio');
    s = registraGiorno(s, '2026-07-03', 'medio');
    s = rimuoviGiorno(s, '2026-07-03');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-01', fine: '2026-07-01' });
    expect(s.dayLogs['2026-07-01']).toBeDefined();
  });

  it('invariante: ogni period ha inizio e fine nei dayLogs', () => {
    let s = statoVuoto();
    for (const d of ['2026-07-01', '2026-07-03', '2026-07-05']) {
      s = registraGiorno(s, d, 'medio');
    }
    for (const period of s.periods) {
      expect(s.dayLogs[period.inizio]).toBeDefined();
      expect(s.dayLogs[period.fine]).toBeDefined();
    }
  });

  it('estendere indietro con tolleranza 2', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-04', 'medio');
    s = registraGiorno(s, '2026-07-02', 'medio');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-02', fine: '2026-07-04' });
  });

  it('non estendere indietro oltre tolleranza 2', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-04', 'medio');
    s = registraGiorno(s, '2026-07-01', 'medio');
    expect(s.periods).toHaveLength(2);
  });
});

describe('cicloInCorso e giornoDelCiclo', () => {
  it('riconosce un ciclo in corso entro la tolleranza', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(cicloInCorso(s, '2026-07-05')?.inizio).toBe('2026-07-03');
  });
  it('non riconosce un ciclo concluso da giorni', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(cicloInCorso(s, '2026-07-20')).toBeNull();
  });
  it('conta i giorni dall inizio del ciclo in corso, partendo da 1', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(giornoDelCiclo(s, '2026-07-03')).toBe(1);
    expect(giornoDelCiclo(s, '2026-07-05')).toBe(3);
  });
  it('è nullo senza ciclo in corso', () => {
    expect(giornoDelCiclo(statoVuoto(), '2026-07-03')).toBeNull();
  });
});
