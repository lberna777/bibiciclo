import { describe, it, expect } from 'vitest';
import { lunghezzeCicli, durataMediana, isIrregolare, durataMestruazioni, previsione } from './cycle';
import type { Periodo } from '../types';

/** Costruisce cicli consecutivi a partire da una data, con le lunghezze indicate. */
function cicli(inizio: string, lunghezze: number[], durata = 5): Periodo[] {
  const out: Periodo[] = [];
  let d = inizio;
  const somma = (data: string, n: number) => {
    const dt = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10) ) + n * 86400000);
    const p = (x: number) => String(x).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
  };
  for (let i = 0; i <= lunghezze.length; i++) {
    out.push({ id: `p${i}`, inizio: d, fine: somma(d, durata - 1) });
    if (i < lunghezze.length) d = somma(d, lunghezze[i]);
  }
  return out;
}

describe('lunghezzeCicli', () => {
  it('è vuoto senza cicli', () => {
    expect(lunghezzeCicli([])).toEqual([]);
  });
  it('è vuoto con un solo ciclo', () => {
    expect(lunghezzeCicli(cicli('2026-01-01', []))).toEqual([]);
  });
  it('misura la distanza fra inizi consecutivi', () => {
    expect(lunghezzeCicli(cicli('2026-01-01', [28, 30]))).toEqual([28, 30]);
  });
  it('ordina i cicli anche se arrivano disordinati', () => {
    const p = cicli('2026-01-01', [28, 30]).reverse();
    expect(lunghezzeCicli(p)).toEqual([28, 30]);
  });
});

describe('durataMediana', () => {
  it('usa il valore dichiarato senza storico', () => {
    expect(durataMediana([], 30)).toBe(30);
  });
  it('usa il valore dichiarato con un solo ciclo', () => {
    expect(durataMediana(cicli('2026-01-01', []), 26)).toBe(26);
  });
  it('calcola la mediana di cicli regolari', () => {
    expect(durataMediana(cicli('2026-01-01', [28, 28, 29, 28, 28]), 28)).toBe(28);
  });
  it('non si lascia spostare da un ciclo anomalo isolato', () => {
    expect(durataMediana(cicli('2026-01-01', [28, 28, 45, 28, 28]), 28)).toBe(28);
  });
  it('considera solo gli ultimi 6 cicli', () => {
    // dieci cicli: i primi quattro da 40, gli ultimi sei da 28
    const p = cicli('2026-01-01', [40, 40, 40, 40, 28, 28, 28, 28, 28, 28]);
    expect(durataMediana(p, 28)).toBe(28);
  });
  it('vincola verso il basso a 21 giorni', () => {
    expect(durataMediana(cicli('2026-01-01', [10, 10, 10]), 28)).toBe(21);
  });
  it('vincola verso l alto a 45 giorni', () => {
    expect(durataMediana(cicli('2026-01-01', [90, 90, 90]), 28)).toBe(45);
  });
  it('vincola anche il valore dichiarato', () => {
    expect(durataMediana([], 200)).toBe(45);
  });
  it('calcola la mediana con valori distinti al centro (caso pari)', () => {
    // 10 cicli: i primi 4 da 40, gli ultimi 6 con valori distinti [27, 28, 29, 30, 31, 32]
    // Dopo ordinamento: [27, 28, 29, 30, 31, 32]
    // Mediana = (v[2] + v[3]) / 2 = (29 + 30) / 2 = 29.5 → Math.round = 30
    const p = cicli('2026-01-01', [40, 40, 40, 40, 27, 28, 29, 30, 31, 32]);
    expect(durataMediana(p, 28)).toBe(30);
  });
});

describe('isIrregolare', () => {
  it('è falso con meno di 3 lunghezze misurate', () => {
    expect(isIrregolare(cicli('2026-01-01', [28, 40]))).toBe(false);
  });
  it('è falso quando l escursione è entro 7 giorni', () => {
    expect(isIrregolare(cicli('2026-01-01', [27, 28, 30, 29]))).toBe(false);
  });
  it('è vero quando l escursione supera 7 giorni', () => {
    expect(isIrregolare(cicli('2026-01-01', [24, 28, 38, 30]))).toBe(true);
  });
});

describe('durataMestruazioni', () => {
  it('vale 5 giorni senza storico', () => {
    expect(durataMestruazioni([])).toBe(5);
  });
  it('è la mediana delle durate registrate', () => {
    expect(durataMestruazioni(cicli('2026-01-01', [28, 28], 4))).toBe(4);
  });
});

describe('previsione', () => {
  it('è nulla senza alcun ciclo', () => {
    expect(previsione([], 28, '2026-07-16')).toBeNull();
  });

  it('con un solo ciclo usa il valore dichiarato', () => {
    const p = previsione(cicli('2026-07-03', []), 28, '2026-07-16')!;
    expect(p.prossimoInizio).toBe('2026-07-31');
    expect(p.basataSuStorico).toBe(false);
    expect(p.giorniAlProssimo).toBe(15);
  });

  it('colloca la finestra fertile fra 19 e 13 giorni prima del prossimo ciclo', () => {
    const p = previsione(cicli('2026-07-03', []), 28, '2026-07-16')!;
    // ovulazione = 31 luglio - 14 = 17 luglio; finestra = 12-18 luglio
    expect(p.fertileInizio).toBe('2026-07-12');
    expect(p.fertileFine).toBe('2026-07-18');
  });

  it('usa lo storico quando ci sono almeno due cicli', () => {
    // quattro cicli: 1 gen, 31 gen, 2 mar, 1 apr → il prossimo cade il 1 maggio
    const p = previsione(cicli('2026-01-01', [30, 30, 30]), 28, '2026-04-05')!;
    expect(p.durataMediana).toBe(30);
    expect(p.basataSuStorico).toBe(true);
    expect(p.prossimoInizio).toBe('2026-05-01');
  });

  it('segnala il ritardo con giorni negativi', () => {
    const p = previsione(cicli('2026-07-03', []), 28, '2026-08-03')!;
    expect(p.prossimoInizio).toBe('2026-07-31');
    expect(p.giorniAlProssimo).toBe(-3);
  });

  it('calcola comunque la finestra fertile quando i cicli sono irregolari', () => {
    const p = previsione(cicli('2026-01-01', [24, 28, 38, 30]), 28, '2026-05-01')!;
    expect(p.irregolare).toBe(true);
    // Mediana di [24, 28, 30, 38] = (28 + 30) / 2 = 29
    // Prossimo inizio: 2026-05-01 + 29 = 2026-05-30
    // Ovulazione: 2026-05-30 - 14 = 2026-05-16
    // Fertile inizio: 2026-05-16 - 5 = 2026-05-11
    // Fertile fine: 2026-05-16 + 1 = 2026-05-17
    expect(p.fertileInizio).toBe('2026-05-11');
    expect(p.fertileFine).toBe('2026-05-17');
  });

  it('rileva quando la durata è vincolata: mediana grezza 90', () => {
    const p = previsione(cicli('2026-01-01', [90, 90, 90]), 28, '2026-01-01')!;
    expect(p.durataMediana).toBe(45);
    expect(p.durataVincolata).toBe(true);
  });

  it('rileva quando la durata è vincolata: mediana grezza 10', () => {
    const p = previsione(cicli('2026-01-01', [10, 10, 10]), 28, '2026-01-01')!;
    expect(p.durataMediana).toBe(21);
    expect(p.durataVincolata).toBe(true);
  });

  it('rileva quando la durata è vincolata: dichiarato 200 senza storico', () => {
    const p = previsione(cicli('2026-01-01', []), 200, '2026-01-01')!;
    expect(p.durataMediana).toBe(45);
    expect(p.durataVincolata).toBe(true);
  });

  it('indica nessun vincolo con una durata normale', () => {
    const p = previsione(cicli('2026-01-01', [28, 28, 28]), 28, '2026-01-01')!;
    expect(p.durataMediana).toBe(28);
    expect(p.durataVincolata).toBe(false);
  });
});
