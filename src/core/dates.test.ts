/**
 * IMPORTANT: This test suite requires TZ=Europe/Rome to run correctly.
 * The npm scripts (test, test:watch) set this automatically, but direct
 * vitest invocations (e.g., `npx vitest`, IDE test runners) will fail the
 * `oggi()` test if run in a different timezone. Set TZ=Europe/Rome before
 * running vitest directly if testing outside Rome's timezone.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addDays, diffDays, confronta, formattaLunga, formattaCorta, giornoSettimana, giorniDelMese, oggi, nomeMese } from './dates';

describe('addDays', () => {
  it('somma giorni dentro lo stesso mese', () => {
    expect(addDays('2026-07-03', 5)).toBe('2026-07-08');
  });
  it('attraversa il cambio di mese', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02');
  });
  it('attraversa il cambio di anno', () => {
    expect(addDays('2026-12-30', 4)).toBe('2027-01-03');
  });
  it('sottrae giorni', () => {
    expect(addDays('2026-01-02', -3)).toBe('2025-12-30');
  });
  // This is the PRIMARY test that discriminates correct UTC-based arithmetic from
  // incorrect naive local-time arithmetic. A naive implementation that uses local
  // time getters/setters would return '2026-10-25' because the autumn DST fold
  // (when local clocks go back from 02:00 to 01:00) confuses date arithmetic.
  // In UTC, there is no fold—a day is always exactly 24 hours.
  it('somma giorni a cavallo del cambio di ora legale d autunno', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });
  it('somma giorni a cavallo del cambio di ora legale di primavera', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
  it('gestisce il 29 febbraio di un anno bisestile', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('diffDays', () => {
  it('conta i giorni fra due date', () => {
    expect(diffDays('2026-07-03', '2026-07-31')).toBe(28);
  });
  it('restituisce un valore negativo se la seconda data precede la prima', () => {
    expect(diffDays('2026-07-31', '2026-07-03')).toBe(-28);
  });
  it('restituisce zero per la stessa data', () => {
    expect(diffDays('2026-07-03', '2026-07-03')).toBe(0);
  });
  it('conta i giorni a cavallo del cambio di ora legale', () => {
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
  });
});

describe('confronta', () => {
  it('ordina le date crescenti', () => {
    const date = ['2026-08-01', '2026-07-03', '2026-12-25'];
    expect([...date].sort(confronta)).toEqual(['2026-07-03', '2026-08-01', '2026-12-25']);
  });
});

describe('formattazione', () => {
  it('formatta in italiano per esteso', () => {
    expect(formattaLunga('2026-07-30')).toBe('giovedì 30 luglio');
  });
  it('formatta in forma corta', () => {
    expect(formattaCorta('2026-07-30')).toBe('30 luglio');
  });
});

describe('giornoSettimana', () => {
  it('conta da lunedì', () => {
    expect(giornoSettimana('2026-07-27')).toBe(0); // lunedì
    expect(giornoSettimana('2026-08-02')).toBe(6); // domenica
  });
});

describe('giorniDelMese', () => {
  it('restituisce tutti i giorni del mese', () => {
    const g = giorniDelMese(2026, 2);
    expect(g).toHaveLength(28);
    expect(g[0]).toBe('2026-02-01');
    expect(g[27]).toBe('2026-02-28');
  });
  it('gestisce febbraio bisestile', () => {
    expect(giorniDelMese(2028, 2)).toHaveLength(29);
  });
});

describe('oggi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restituisce il giorno di calendario locale', () => {
    // 2026-07-30T23:30:00Z is 2026-07-31T01:30:00+02:00 in Rome (CEST)
    // This tests that oggi() uses local getters, not UTC getters
    vi.setSystemTime(new Date('2026-07-30T23:30:00Z'));
    expect(oggi()).toBe('2026-07-31');
  });
});

describe('nomeMese', () => {
  it('restituisce il nome del mese in italiano', () => {
    expect(nomeMese(1)).toBe('gennaio');
    expect(nomeMese(7)).toBe('luglio');
    expect(nomeMese(12)).toBe('dicembre');
  });
});
