import { describe, it, expect } from 'vitest';
import { eventiPrevisti, generaIcs } from './ics';
import type { Periodo } from '../types';

const unCiclo: Periodo[] = [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }];

describe('eventiPrevisti', () => {
  it('è vuoto senza cicli registrati', () => {
    expect(eventiPrevisti([], 28, '2026-07-16')).toEqual([]);
  });

  it('genera sei cicli previsti e sei finestre fertili', () => {
    const e = eventiPrevisti(unCiclo, 28, '2026-07-16');
    expect(e.filter((x) => x.tipo === 'ciclo')).toHaveLength(6);
    expect(e.filter((x) => x.tipo === 'fertile')).toHaveLength(6);
  });

  it('colloca il primo ciclo previsto alla data attesa', () => {
    const e = eventiPrevisti(unCiclo, 28, '2026-07-16');
    expect(e[0]).toMatchObject({ tipo: 'ciclo', inizio: '2026-07-31' });
  });

  it('distanzia i cicli successivi della durata mediana', () => {
    const cicli = eventiPrevisti(unCiclo, 28, '2026-07-16').filter((x) => x.tipo === 'ciclo');
    expect(cicli[1].inizio).toBe('2026-08-28');
  });

  it('usa una fine esclusiva, come richiede il formato iCalendar', () => {
    const primo = eventiPrevisti(unCiclo, 28, '2026-07-16')[0];
    // 5 giorni di mestruazioni a partire dal 31 luglio: fine esclusa il 5 agosto
    expect(primo.fineEsclusa).toBe('2026-08-05');
  });

  it('assegna UID deterministici, così una nuova esportazione aggiorna invece di duplicare', () => {
    const a = eventiPrevisti(unCiclo, 28, '2026-07-16');
    const b = eventiPrevisti(unCiclo, 28, '2026-07-20');
    expect(a[0].uid).toBe(b[0].uid);
  });
});

describe('generaIcs', () => {
  const ics = () => generaIcs(eventiPrevisti(unCiclo, 28, '2026-07-16'));

  it('produce un calendario valido', () => {
    expect(ics()).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics().trimEnd()).toMatch(/END:VCALENDAR$/);
  });

  it('usa terminatori di riga CRLF come impone lo standard', () => {
    expect(ics()).toContain('\r\n');
    expect(ics()).not.toMatch(/[^\r]\n/);
  });

  it('scrive eventi di giornata intera', () => {
    expect(ics()).toContain('DTSTART;VALUE=DATE:20260731');
    expect(ics()).toContain('DTEND;VALUE=DATE:20260805');
  });

  it('include un avviso a due giorni di anticipo per il ciclo', () => {
    expect(ics()).toContain('TRIGGER:-P2D');
  });

  it('contiene un VEVENT per ogni evento', () => {
    const n = ics().match(/BEGIN:VEVENT/g)!.length;
    expect(n).toBe(12);
  });
});
