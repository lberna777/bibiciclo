// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { DayLog } from '../types';

// Richiesto da React perché `act(...)` sappia di essere in un ambiente di
// test: senza RTL nessun altro punto lo imposta automaticamente.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registraMock = vi.fn().mockResolvedValue(undefined);
const rimuoviMock = vi.fn().mockResolvedValue(undefined);
let dayLogDiProva: DayLog | undefined;

// FoglioRegistrazione legge/scrive solo tramite `useStore`: sostituiamo il
// modulo dello store con dei mock che possiamo ispezionare, senza toccare
// IndexedDB né Zustand.
vi.mock('../store', () => ({
  useStore: (
    selector: (s: { stato: { dayLogs: Record<string, DayLog> }; registra: unknown; rimuovi: unknown }) => unknown,
  ) => selector({ stato: { dayLogs: { '2026-07-10': dayLogDiProva } as Record<string, DayLog> }, registra: registraMock, rimuovi: rimuoviMock }),
}));

import FoglioRegistrazione from './FoglioRegistrazione';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function monta() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      createElement(FoglioRegistrazione, {
        data: '2026-07-10',
        onChiudi: () => {},
        onScegliGiorno: () => {},
      }),
    );
  });
}

function bottoneRimuovi(): HTMLButtonElement {
  const bottone = Array.from(container!.querySelectorAll('button')).find(
    (b) => b.textContent === 'Rimuovi questo giorno',
  );
  if (!bottone) throw new Error('Bottone "Rimuovi questo giorno" non trovato nel markup renderizzato.');
  return bottone;
}

afterEach(() => {
  if (root && container) {
    act(() => root!.unmount());
    container.remove();
  }
  root = null;
  container = null;
  registraMock.mockClear();
  rimuoviMock.mockClear();
  vi.restoreAllMocks();
});

describe('FoglioRegistrazione — conferma prima di rimuovere (Minor 7)', () => {
  it('chiede conferma con il messaggio previsto prima di rimuovere', () => {
    dayLogDiProva = { flusso: 'medio' };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    monta();

    act(() => bottoneRimuovi().click());

    expect(confirmSpy).toHaveBeenCalledWith('Vuoi togliere questo giorno dal diario?');
  });

  it('se l utente annulla la conferma, non chiama rimuovi', () => {
    dayLogDiProva = { flusso: 'medio' };
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    monta();

    act(() => bottoneRimuovi().click());

    expect(rimuoviMock).not.toHaveBeenCalled();
  });

  it('se l utente conferma, chiama rimuovi con la data del giorno', () => {
    dayLogDiProva = { flusso: 'medio' };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    monta();

    act(() => bottoneRimuovi().click());

    expect(rimuoviMock).toHaveBeenCalledWith('2026-07-10');
  });
});
