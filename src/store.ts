import { create } from 'zustand';
import type { Flusso, ISODate, Stato } from './types';
import { oggi } from './core/dates';
import { registraGiorno, rimuoviGiorno } from './core/periods';
import { caricaStato, salvaStato, statoIniziale } from './storage/db';

export type Tab = 'oggi' | 'calendario' | 'impostazioni';

interface Store {
  stato: Stato;
  pronto: boolean;
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
    await salvaStato(nuovo);
  }

  return {
    stato: statoIniziale(oggi()),
    pronto: false,
    tab: 'oggi',

    carica: async () => {
      set({ stato: await caricaStato(), pronto: true });
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
