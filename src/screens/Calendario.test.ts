import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Periodo, Stato } from '../types';

let statoDiProva: Stato;

vi.mock('../store', () => ({
  useStore: (selector: (s: { stato: Stato }) => unknown) => selector({ stato: statoDiProva }),
}));

import Calendario from './Calendario';

const TESTO_AVVERTENZA_BREVE = 'Sono stime, non certezze. BibiCiclo non è un metodo contraccettivo.';
const TESTO_IRREGOLARITA =
  'I tuoi ultimi cicli sono stati piuttosto irregolari, quindi questa previsione — e';

function statoCon(periods: Periodo[], cicloMedioDichiarato = 28): Stato {
  const dayLogs: Stato['dayLogs'] = {};
  for (const p of periods) dayLogs[p.inizio] = { flusso: 'medio' };
  return {
    schemaVersion: 1,
    settings: { cicloMedioDichiarato, dataInstallazione: '2026-01-01' },
    periods,
    dayLogs,
  };
}

function renderizza(stato: Stato): string {
  statoDiProva = stato;
  return renderToStaticMarkup(createElement(Calendario));
}

describe('Calendario — avvertenza sanitaria permanente (Important 3)', () => {
  it('è sempre presente in fondo alla schermata, anche con cicli regolari', () => {
    const html = renderizza(statoCon([{ id: 'p1', inizio: '2026-01-03', fine: '2026-01-07' }]));
    expect(html).toContain(TESTO_AVVERTENZA_BREVE);
  });

  it('è presente anche senza nessun ciclo registrato', () => {
    const html = renderizza(statoCon([]));
    expect(html).toContain(TESTO_AVVERTENZA_BREVE);
  });
});

describe('Calendario — avviso di irregolarità sulla finestra fertile (Important 3)', () => {
  it('non compare quando i cicli sono regolari', () => {
    // Quattro cicli, lunghezze 27/28/29/28: escursione 2 giorni, entro la soglia di 7.
    const periods: Periodo[] = [
      { id: 'p0', inizio: '2026-01-01', fine: '2026-01-05' },
      { id: 'p1', inizio: '2026-01-28', fine: '2026-02-01' },
      { id: 'p2', inizio: '2026-02-25', fine: '2026-03-01' },
      { id: 'p3', inizio: '2026-03-26', fine: '2026-03-30' },
    ];
    const html = renderizza(statoCon(periods));
    expect(html).not.toContain(TESTO_IRREGOLARITA);
  });

  it('compare, con la stessa frase di Oggi.tsx, quando i cicli sono irregolari — e la finestra fertile resta calcolata', () => {
    // Stesse lunghezze usate in core/cycle.test.ts per isIrregolare: [24, 28, 38, 30] → escursione 14 > 7.
    const periods: Periodo[] = [
      { id: 'p0', inizio: '2026-01-01', fine: '2026-01-05' },
      { id: 'p1', inizio: '2026-01-25', fine: '2026-01-29' },
      { id: 'p2', inizio: '2026-02-22', fine: '2026-02-26' },
      { id: 'p3', inizio: '2026-04-01', fine: '2026-04-05' },
    ];
    const html = renderizza(statoCon(periods));
    expect(html).toContain(TESTO_IRREGOLARITA);
    // La legenda "fertile" resta comunque presente: la finestra non sparisce.
    expect(html).toContain('fertile');
  });
});
