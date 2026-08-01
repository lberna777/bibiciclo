import { useRef, useState } from 'react';
import { diffDays, oggi } from '../core/dates';
import { eventiPrevisti, generaIcs } from '../calendar/ics';
import { esportaJson, importaJson, nomeFileBackup } from '../storage/backup';
import { condividiFile } from '../lib/share';
import { useStore } from '../store';
import Avvertenza from '../components/Avvertenza';

/**
 * Un messaggio per ciascun esito di `condividiFile`. Su 'annullato' non si
 * dichiara un successo: il pannello si è chiuso senza consegnare il file.
 */
const MESSAGGI_CALENDARIO = {
  condiviso: 'Scegli "Calendario" per aggiungere le date.',
  scaricato: 'File scaricato: aprilo dall\'app File per aggiungerlo al Calendario.',
  annullato: 'Non è stato aggiunto niente. Riprova quando vuoi.',
} as const;

const MESSAGGI_BACKUP = {
  condiviso: 'Copia salvata. Conservala in un posto sicuro.',
  scaricato: 'Copia scaricata. Conservala in un posto sicuro.',
  annullato: 'La copia non è stata salvata. Riprova quando vuoi.',
} as const;

export default function Impostazioni() {
  const stato = useStore((s) => s.stato);
  const aggiornaDurataMedia = useStore((s) => s.aggiornaDurataMedia);
  const sostituisciStato = useStore((s) => s.sostituisciStato);
  const [messaggio, setMessaggio] = useState('');
  const inputFile = useRef<HTMLInputElement>(null);

  async function aggiungiAlCalendario() {
    const eventi = eventiPrevisti(stato.periods, stato.settings.cicloMedioDichiarato, oggi());
    if (eventi.length === 0) {
      setMessaggio('Segna almeno un ciclo prima di esportare le date.');
      return;
    }
    // SEQUENCE crescente: iOS aggiorna un evento con lo stesso UID solo se il
    // numero di sequenza è più alto. I giorni trascorsi dall'installazione
    // crescono da soli, senza bisogno di memorizzare un contatore.
    const sequenza = diffDays(stato.settings.dataInstallazione, oggi());
    const file = new File([generaIcs(eventi, sequenza)], 'bibiciclo.ics', { type: 'text/calendar' });
    const esito = await condividiFile(file, 'Date di BibiCiclo');
    setMessaggio(MESSAGGI_CALENDARIO[esito]);
  }

  async function salvaCopia() {
    const file = new File([esportaJson(stato)], nomeFileBackup(oggi()), { type: 'application/json' });
    setMessaggio(MESSAGGI_BACKUP[await condividiFile(file, 'Backup di BibiCiclo')]);
  }

  async function ripristina(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Questa operazione sostituisce tutti i dati attuali. Vuoi continuare?')) return;

    try {
      const { stato: ripristinato, giorniScartati } = importaJson(await file.text(), oggi());
      await sostituisciStato(ripristinato);
      // Il ripristino sovrascrive il telefono: se il file conteneva voci
      // illeggibili va detto, perche' quel file potrebbe essere l'ultima copia.
      setMessaggio(
        giorniScartati === 0
          ? 'Dati ripristinati.'
          : `Dati ripristinati, ma ${giorniScartati} ${giorniScartati === 1 ? 'giorno' : 'giorni'} del file non ${giorniScartati === 1 ? 'era leggibile' : 'erano leggibili'}. Se hai un'altra copia del backup, provala prima di segnare altro.`,
      );
    } catch (err) {
      setMessaggio(err instanceof Error ? err.message : 'Non sono riuscita a leggere il file.');
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Impostazioni</h1>

      <section className="space-y-2.5">
        <button
          onClick={() => void aggiungiAlCalendario()}
          className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
        >
          📅 Aggiungi le date al Calendario
        </button>
        <p className="text-[11px] leading-snug text-tenue">
          Aggiunge al Calendario dell'iPhone i prossimi sei cicli previsti, con un avviso due
          giorni prima. Rifallo ogni tanto: le previsioni migliorano man mano che segni i cicli.
        </p>
      </section>

      <section className="space-y-2.5">
        <button
          onClick={() => void salvaCopia()}
          className="w-full rounded-2xl border border-bordo bg-white py-3.5 text-sm font-bold text-rosa-scuro"
        >
          Salva una copia dei dati
        </button>
        <button
          onClick={() => inputFile.current?.click()}
          className="w-full rounded-2xl border border-bordo bg-white py-3.5 text-sm font-bold text-rosa-scuro"
        >
          Ripristina da una copia
        </button>
        <input ref={inputFile} type="file" accept=".json,application/json" onChange={ripristina} className="hidden" />
        <p className="text-[11px] leading-snug text-tenue">
          I dati stanno solo su questo telefono. Se cancelli l'app o cambi telefono, senza una
          copia vanno persi.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between rounded-2xl border border-bordo bg-white p-4">
          <div>
            <div className="text-sm font-semibold">Durata media del ciclo</div>
            <div className="text-[11px] text-tenue">Usata finché non ci sono abbastanza dati</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void aggiornaDurataMedia(Math.max(21, stato.settings.cicloMedioDichiarato - 1))}
              className="h-11 w-11 rounded-full border border-bordo text-xl text-rosa"
            >
              −
            </button>
            <span className="w-7 text-center text-lg font-bold">{stato.settings.cicloMedioDichiarato}</span>
            <button
              onClick={() => void aggiornaDurataMedia(Math.min(45, stato.settings.cicloMedioDichiarato + 1))}
              className="h-11 w-11 rounded-full border border-bordo text-xl text-rosa"
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-bordo bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Da leggere</h2>
        <Avvertenza />
      </section>

      {messaggio && (
        <p className="rounded-2xl bg-rosa-chiaro px-4 py-3 text-[13px] text-rosa-scuro">{messaggio}</p>
      )}

      <p className="text-center text-[11px] text-tenue">BibiCiclo · versione 1.0</p>
    </div>
  );
}
