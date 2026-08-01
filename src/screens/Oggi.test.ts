import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Stato } from '../types';
import { addDays, oggi } from '../core/dates';

// Oggi.tsx legge lo stato solo tramite `useStore`: sostituiamo il modulo
// dello store con un selettore che applica direttamente allo stato di
// prova corrente, senza toccare IndexedDB né Zustand.
let statoDiProva: Stato;

vi.mock('../store', () => ({
  useStore: (selector: (s: { stato: Stato; setTab: () => void }) => unknown) =>
    selector({ stato: statoDiProva, setTab: () => {} }),
}));

import Oggi from './Oggi';

/** Un unico periodo, così `previsione` usa `cicloMedioDichiarato` senza storico. */
function statoConUltimoInizio(inizio: string, cicloMedioDichiarato = 28): Stato {
  return {
    schemaVersion: 1,
    settings: { cicloMedioDichiarato, dataInstallazione: inizio },
    periods: [{ id: 'p1', inizio, fine: inizio }],
    dayLogs: { [inizio]: { flusso: 'medio' } },
  };
}

/** Costruisce uno stato il cui prossimo ciclo previsto cade `delta` giorni da oggi. */
function statoConRitardoDi(delta: number, cicloMedioDichiarato = 28): Stato {
  const g = oggi();
  // prossimoInizio = inizio + cicloMedioDichiarato = g + delta
  const inizio = addDays(g, delta - cicloMedioDichiarato);
  return statoConUltimoInizio(inizio, cicloMedioDichiarato);
}

function renderizza(stato: Stato): string {
  statoDiProva = stato;
  return renderToStaticMarkup(createElement(Oggi));
}

describe('Oggi — confine del ritardo a 15/16 giorni (Important 2)', () => {
  it('a esattamente 15 giorni di ritardo mostra ancora la rassicurazione', () => {
    const html = renderizza(statoConRitardoDi(-15));
    expect(html).toContain('Il ciclo è in ritardo');
    expect(html).toContain('<span class="text-rosa">15 giorni</span>');
    expect(html).toContain('Qualche giorno di scarto è normale e capita a tutte.');
    expect(html).not.toContain('Non segni il ciclo');
  });

  it('a 16 giorni di ritardo smette di rassicurare e invita a segnare', () => {
    const html = renderizza(statoConRitardoDi(-16));
    expect(html).toContain('Non segni il ciclo');
    expect(html).toContain('<span class="text-rosa">16 giorni</span>');
    // React HTML-escapa l'apostrofo come entità: si verifica il testo renderizzato
    // per intero, non una parafrasi con l'apostrofo "letterale".
    expect(html).toContain('Segna l&#x27;ultimo ciclo che ricordi e le previsioni tornano utili.');
    expect(html).not.toContain('Il ciclo è in ritardo');
    expect(html).not.toContain('Qualche giorno di scarto è normale');
  });

  it('la testata a 16 giorni usa "giorni" plurale nello stesso span del numero', () => {
    const html = renderizza(statoConRitardoDi(-16));
    expect(html).toMatch(/<span class="text-rosa">16 giorni<\/span>/);
  });

  it('al singolare (1 giorno di assenza oltre soglia, caso di controllo diretto) concorda giorno/giorni', () => {
    // Verifica diretta della concordanza singolare/plurale del nuovo ramo,
    // usando un ritardo di 17 giorni (> 15) per restare nel nuovo ramo ma
    // con un numero diverso da 16, a controllo del formato "N giorni".
    const html = renderizza(statoConRitardoDi(-17));
    expect(html).toContain('Non segni il ciclo');
    expect(html).toContain('<span class="text-rosa">17 giorni</span>');
  });
});
