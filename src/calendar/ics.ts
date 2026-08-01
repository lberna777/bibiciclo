import type { ISODate, Periodo } from '../types';
import { addDays } from '../core/dates';
import {
  durataMediana,
  durataMestruazioni,
  previsione,
  GIORNI_FASE_LUTEALE,
  FERTILE_PRIMA,
  FERTILE_DOPO,
} from '../core/cycle';

const CICLI_ESPORTATI = 6;

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
 * Escapa i caratteri speciali secondo RFC 5545 per parametri di testo in iCalendar.
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Prossimi cicli previsti e relative finestre fertili.
 * Gli UID sono slot-based (ciclo-1, ciclo-2, ...) e stabili tra le esportazioni,
 * così un calendario che onora gli UID aggiornerà gli eventi esistenti anziché duplicarli.
 * Tuttavia, non possiamo garantire come iOS gestisca gli aggiornamenti per UID;
 * se compaiono duplicati, gli eventi precedenti possono essere eliminati manualmente.
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
    const n = i + 1;
    eventi.push({
      uid: `bibiciclo-ciclo-${n}@bibiciclo`,
      titolo: 'Ciclo previsto',
      inizio,
      fineEsclusa: addDays(inizio, mestruazioni),
      tipo: 'ciclo',
    });

    const ovulazione = addDays(inizio, -GIORNI_FASE_LUTEALE);
    const fertileInizio = addDays(ovulazione, -FERTILE_PRIMA);
    eventi.push({
      uid: `bibiciclo-fertile-${n}@bibiciclo`,
      titolo: 'Periodo fertile (stima)',
      inizio: fertileInizio,
      fineEsclusa: addDays(ovulazione, FERTILE_DOPO + 1),
      tipo: 'fertile',
    });
  }

  return eventi;
}

export function generaIcs(eventi: EventoPrevisto[], sequenza = 0): string {
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
      `SEQUENCE:${sequenza}`,
      `DTSTART;VALUE=DATE:${compatta(e.inizio)}`,
      `DTEND;VALUE=DATE:${compatta(e.fineEsclusa)}`,
      `SUMMARY:${escapeText(e.titolo)}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.tipo === 'ciclo') {
      righe.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText('Il ciclo dovrebbe arrivare fra due giorni')}`,
        'TRIGGER:-P2D',
        'END:VALARM',
      );
    }
    righe.push('END:VEVENT');
  }

  righe.push('END:VCALENDAR');
  return righe.join('\r\n') + '\r\n';
}
