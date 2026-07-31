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
    dataInstallazione: ISODate;
  };
  periods: Periodo[];
  dayLogs: Record<ISODate, DayLog>;
}
