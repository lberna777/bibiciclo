import { create } from 'zustand';
import type { Flusso, ISODate, Stato } from './types';
import { oggi } from './core/dates';
import { registraGiorno, rimuoviGiorno } from './core/periods';
import { caricaStato, salvaStato, statoIniziale } from './storage/db';

export type Tab = 'oggi' | 'calendario' | 'impostazioni';

interface Store {
  stato: Stato;
  pronto: boolean;
  errore: string | null;
  tab: Tab;
  carica: () => Promise<void>;
  setTab: (t: Tab) => void;
  registra: (data: ISODate, flusso: Flusso, nota?: string) => Promise<void>;
  rimuovi: (data: ISODate) => Promise<void>;
  completaOnboarding: (ultimoInizio: ISODate, cicloMedio: number) => Promise<void>;
  aggiornaDurataMedia: (giorni: number) => Promise<void>;
  sostituisciStato: (nuovo: Stato) => Promise<void>;
}

export const useStore = create<Store>((set, get) => {
  async function applica(nuovo: Stato) {
    set({ stato: nuovo });
    try {
      await salvaStato(nuovo);
      set({ errore: null });
    } catch {
      // Lo stato resta in memoria: la modifica dell'utente non deve sparire
      // sotto i suoi occhi anche se il salvataggio su disco è fallito.
      set({
        errore:
          "Non sono riuscita a salvare sul telefono. Se chiudi l'app potresti perdere le ultime modifiche.",
      });
    }
  }

  return {
    stato: statoIniziale(oggi()),
    pronto: false,
    errore: null,
    tab: 'oggi',

    carica: async () => {
      try {
        const stato = await caricaStato();
        set({ stato, pronto: true, errore: null });
      } catch {
        // Non passare a pronto: true né ripiegare su uno stato vuoto — uno
        // stato vuoto lascerebbe che la prima scrittura sovrascriva dati che
        // sono solo momentaneamente illeggibili, non persi.
        set({ errore: 'Non riesco a leggere i dati salvati su questo telefono.' });
      }
    },

    setTab: (tab) => set({ tab }),

    registra: async (data, flusso, nota) => {
      await applica(registraGiorno(get().stato, data, flusso, nota));
    },

    rimuovi: async (data) => {
      await applica(rimuoviGiorno(get().stato, data));
    },

    completaOnboarding: async (ultimoInizio, cicloMedio) => {
      const conImpostazioni: Stato = {
        ...get().stato,
        settings: { ...get().stato.settings, cicloMedioDichiarato: cicloMedio },
      };
      await applica(registraGiorno(conImpostazioni, ultimoInizio, 'medio'));
    },

    aggiornaDurataMedia: async (giorni) => {
      const s = get().stato;
      await applica({ ...s, settings: { ...s.settings, cicloMedioDichiarato: giorni } });
    },

    sostituisciStato: async (nuovo) => {
      await applica(nuovo);
    },
  };
});
