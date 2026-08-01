export type ISODate = string; // "YYYY-MM-DD"

export type Flusso = 'leggero' | 'medio' | 'tanto';

export interface Periodo {
  id: string;
  inizio: ISODate;
  fine: ISODate;
}

export interface DayLog {
  flusso: Flusso;
  nota?: string;
}

export interface Stato {
  schemaVersion: number;
  settings: {
    cicloMedioDichiarato: number;
    /**
     * Deve restare stabile per tutta la vita dei dati: non va mai
     * riscritta dopo la prima installazione. Il generatore di `.ics`
     * (`calendar/ics.ts`) calcola `SEQUENCE` come giorni trascorsi da
     * questa data — deve crescere in modo monotono perché iOS aggiorni un
     * evento esistente invece di ignorarlo — e assegna gli `UID` per
     * posizione (slot), dove ogni slot indica una data diversa a ogni
     * esportazione. Se questo valore cambiasse, `SEQUENCE` potrebbe
     * retrocedere e una nuova esportazione produrrebbe eventi duplicati
     * invece di aggiornare quelli già aggiunti al Calendario di iOS.
     */
    dataInstallazione: ISODate;
  };
  periods: Periodo[];
  dayLogs: Record<ISODate, DayLog>;
}
