import type { ISODate, Periodo } from '../types';
import { addDays } from '../core/dates';
import { durataMediana, durataMestruazioni, previsione } from '../core/cycle';

const CICLI_ESPORTATI = 6;
const GIORNI_FASE_LUTEALE = 14;
const FERTILE_PRIMA = 5;
const FERTILE_DOPO = 1;

export interface EventoPrevisto {
  uid: string;
  titolo: string;
  inizio: ISODate;
  /** Il giorno successivo all'ultimo incluso: iCalendar vuole DTEND esclusivo. */
  fineEsclusa: ISODate;
  tipo: 'ciclo' | 'fertile';
}

const compatta = (d: ISODate) => d.replace(/-/g, '');

/**
 * Prossimi cicli previsti e relative finestre fertili.
 * Gli UID sono derivati dalla data, così riesportare aggiorna gli eventi
 * esistenti nel calendario anziché duplicarli.
 */
export function eventiPrevisti(
  periods: Periodo[],
  dichiarato: number,
  oggi: ISODate,
  quanti = CICLI_ESPORTATI,
): EventoPrevisto[] {
  const p = previsione(periods, dichiarato, oggi);
  if (!p) return [];

  const durata = durataMediana(periods, dichiarato);
  const mestruazioni = durataMestruazioni(periods);
  const eventi: EventoPrevisto[] = [];

  for (let i = 0; i < quanti; i++) {
    const inizio = addDays(p.prossimoInizio, durata * i);
    eventi.push({
      uid: `ciclo-${compatta(inizio)}@bibiciclo`,
      titolo: 'Ciclo previsto',
      inizio,
      fineEsclusa: addDays(inizio, mestruazioni),
      tipo: 'ciclo',
    });

    const ovulazione = addDays(inizio, -GIORNI_FASE_LUTEALE);
    const fertileInizio = addDays(ovulazione, -FERTILE_PRIMA);
    eventi.push({
      uid: `fertile-${compatta(fertileInizio)}@bibiciclo`,
      titolo: 'Periodo fertile (stima)',
      inizio: fertileInizio,
      fineEsclusa: addDays(ovulazione, FERTILE_DOPO + 1),
      tipo: 'fertile',
    });
  }

  return eventi;
}

export function generaIcs(eventi: EventoPrevisto[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const righe: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BibiCiclo//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const e of eventi) {
    righe.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compatta(e.inizio)}`,
      `DTEND;VALUE=DATE:${compatta(e.fineEsclusa)}`,
      `SUMMARY:${e.titolo}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.tipo === 'ciclo') {
      righe.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Il ciclo dovrebbe arrivare fra due giorni',
        'TRIGGER:-P2D',
        'END:VALARM',
      );
    }
    righe.push('END:VEVENT');
  }

  righe.push('END:VCALENDAR');
  return righe.join('\r\n') + '\r\n';
}
