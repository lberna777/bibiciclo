import { describe, it, expect } from 'vitest';
import { eventiPrevisti, generaIcs } from './ics';
import type { Periodo } from '../types';

const unCiclo: Periodo[] = [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }];
const altriCicli: Periodo[] = [{ id: 'p1', inizio: '2026-06-05', fine: '2026-06-09' }];

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

  it('mantiene UIDs slot-based stabili anche con storia diversa', () => {
    const a = eventiPrevisti(unCiclo, 28, '2026-07-16');
    const b = eventiPrevisti(altriCicli, 28, '2026-07-16');
    // UIDs sono basati su slot (1..6), non sulle date
    expect(a[0].uid).toBe('bibiciclo-ciclo-1@bibiciclo');
    expect(b[0].uid).toBe('bibiciclo-ciclo-1@bibiciclo');
  });

  it('assegna 12 UID distinti per 6 cicli', () => {
    const e = eventiPrevisti(unCiclo, 28, '2026-07-16');
    const uids = e.map((x) => x.uid);
    const uniche = new Set(uids);
    expect(uniche.size).toBe(12);
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

  it('include SEQUENCE per ogni evento', () => {
    expect(ics()).toContain('SEQUENCE:0');
  });

  it('include avvisi solo per gli eventi ciclo, esattamente 6', () => {
    const output = ics();
    const alarmCount = (output.match(/BEGIN:VALARM/g) || []).length;
    expect(alarmCount).toBe(6);
  });

  it('gli avvisi ciclo hanno trigger a due giorni di anticipo', () => {
    const output = ics();
    const alarmMatches = output.match(/BEGIN:VALARM[\s\S]*?END:VALARM/g) || [];
    expect(alarmMatches.length).toBe(6);
    alarmMatches.forEach((alarm) => {
      expect(alarm).toContain('TRIGGER:-P2D');
    });
  });

  it('nessun evento fertile contiene VALARM', () => {
    const output = ics();
    const fertileEvents = output.match(/UID:bibiciclo-fertile-\d+[\s\S]*?END:VEVENT/g) || [];
    expect(fertileEvents.length).toBe(6);
    fertileEvents.forEach((event) => {
      expect(event).not.toContain('VALARM');
    });
  });

  it('contiene un VEVENT per ogni evento', () => {
    const n = ics().match(/BEGIN:VEVENT/g)!.length;
    expect(n).toBe(12);
  });

  it('escapa caratteri speciali nei titoli', () => {
    const evento = [
      { uid: 'test', titolo: 'Titolo; con, separatori \\ e\nnewline', inizio: '2026-07-31' as const, fineEsclusa: '2026-08-05' as const, tipo: 'ciclo' as const },
    ];
    const output = generaIcs(evento);
    expect(output).toContain('SUMMARY:Titolo\\; con\\, separatori \\\\ e\\nnewline');
  });

  it('accetta sequenza nei parametri', () => {
    const e = eventiPrevisti(unCiclo, 28, '2026-07-16');
    const output = generaIcs(e, 42);
    const matches = output.match(/SEQUENCE:42/g) || [];
    expect(matches.length).toBe(12);
  });
});
