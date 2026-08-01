// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apriCalendario, condividiFile } from './share';

function fileDiProva(): File {
  return new File(['contenuto'], 'prova.ics', { type: 'text/calendar' });
}

function definisciNavigatorShare(canShare: unknown, share: unknown) {
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
}

const createObjectURLOriginale = URL.createObjectURL;
const revokeObjectURLOriginale = URL.revokeObjectURL;
const locationOriginale = window.location;

/**
 * Sostituisce `window.location` con un oggetto finto il cui setter di `href`
 * può registrare il valore ricevuto oppure lanciare, per simulare sia la
 * navigazione riuscita sia il rifiuto che una PWA installata standalone può
 * opporre. Ripristinato nell'afterEach comune, come `URL.createObjectURL`.
 */
function definisciLocation(comportamento: { lanciaErrore: boolean }, cattura?: { href: string }) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      set href(v: string) {
        if (comportamento.lanciaErrore) throw new Error('navigazione rifiutata');
        if (cattura) cattura.href = v;
      },
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  // Riporta il navigator allo stato "assente": ogni test parte pulito.
  // @ts-expect-error canShare non è opzionale nei tipi DOM, ma va rimosso fra un test e l'altro.
  delete navigator.canShare;
  // @ts-expect-error share non è opzionale nei tipi DOM, ma va rimosso fra un test e l'altro.
  delete navigator.share;
  URL.createObjectURL = createObjectURLOriginale;
  URL.revokeObjectURL = revokeObjectURLOriginale;
  Object.defineProperty(window, 'location', { configurable: true, value: locationOriginale });
});

describe('condividiFile', () => {
  it('usa la condivisione nativa quando disponibile e restituisce "condiviso"', async () => {
    const canShare = vi.fn().mockReturnValue(true);
    const share = vi.fn().mockResolvedValue(undefined);
    definisciNavigatorShare(canShare, share);

    const file = fileDiProva();
    const esito = await condividiFile(file, 'Titolo di prova');

    expect(esito).toBe('condiviso');
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Titolo di prova' });
  });

  it('tratta la chiusura del pannello (AbortError) come "annullato", non come successo', async () => {
    const canShare = vi.fn().mockReturnValue(true);
    const share = vi.fn().mockRejectedValue(new DOMException('Annullato dall\'utente', 'AbortError'));
    definisciNavigatorShare(canShare, share);

    const esito = await condividiFile(fileDiProva(), 'Titolo di prova');

    expect(esito).toBe('annullato');
  });

  it('ripiega sul download quando la condivisione fallisce per un altro motivo', async () => {
    const canShare = vi.fn().mockReturnValue(true);
    const share = vi.fn().mockRejectedValue(new Error('errore generico di condivisione'));
    definisciNavigatorShare(canShare, share);

    const createObjectURL = vi.fn().mockReturnValue('blob:finto');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();

    let ancoraCliccata: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      ancoraCliccata = this;
    });

    const file = fileDiProva();
    const esito = await condividiFile(file, 'Titolo di prova');

    expect(esito).toBe('scaricato');
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(ancoraCliccata).not.toBeNull();
    expect(ancoraCliccata!.download).toBe('prova.ics');
    expect(ancoraCliccata!.href).toContain('blob:finto');
  });

  it('scarica direttamente quando "canShare" non esiste affatto', async () => {
    // Non dipende dall'afterEach del test precedente: rimuove esplicitamente
    // entrambe le proprietà, per restare valido indipendentemente dall'ordine
    // di esecuzione dei test.
    // @ts-expect-error simula un browser senza Web Share API: canShare assente, non solo falsy.
    delete navigator.canShare;
    // @ts-expect-error idem per share, così il test non dipende da uno stato lasciato da altri test.
    delete navigator.share;

    const createObjectURL = vi.fn().mockReturnValue('blob:finto');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();

    let ancoraCliccata: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      ancoraCliccata = this;
    });

    const file = fileDiProva();
    const esito = await condividiFile(file, 'Titolo di prova');

    expect(esito).toBe('scaricato');
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(ancoraCliccata).not.toBeNull();
    expect(ancoraCliccata!.download).toBe('prova.ics');
  });

  it('scarica direttamente quando "canShare" esiste ma restituisce false per questo file', async () => {
    const canShare = vi.fn().mockReturnValue(false);
    const share = vi.fn();
    definisciNavigatorShare(canShare, share);

    const createObjectURL = vi.fn().mockReturnValue('blob:finto');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();

    let ancoraCliccata: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      ancoraCliccata = this;
    });

    const file = fileDiProva();
    const esito = await condividiFile(file, 'Titolo di prova');

    expect(esito).toBe('scaricato');
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
    expect(share).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(ancoraCliccata).not.toBeNull();
    expect(ancoraCliccata!.download).toBe('prova.ics');
  });

  it("revoca l'URL dell'oggetto 10 secondi dopo il download", async () => {
    // @ts-expect-error simula assenza di canShare per forzare il ramo di download.
    delete navigator.canShare;

    const createObjectURL = vi.fn().mockReturnValue('blob:finto');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    vi.useFakeTimers();
    try {
      const file = fileDiProva();
      const esito = await condividiFile(file, 'Titolo di prova');

      expect(esito).toBe('scaricato');
      expect(revokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10_000);

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:finto');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('apriCalendario', () => {
  it('naviga verso il contenuto .ics e restituisce "aperto"', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:finto');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const cattura = { href: '' };
    definisciLocation({ lanciaErrore: false }, cattura);

    vi.useFakeTimers();
    try {
      const esito = await apriCalendario('BEGIN:VCALENDAR\nEND:VCALENDAR');

      expect(esito).toBe('aperto');
      expect(cattura.href).toBe('blob:finto');
      const blobUsato = createObjectURL.mock.calls[0][0] as Blob;
      expect(blobUsato).toBeInstanceOf(Blob);
      expect(blobUsato.type).toBe('text/calendar');

      // Revocato su timer, non subito: coerente con quanto già fa condividiFile.
      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10_000);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:finto');
    } finally {
      vi.useRealTimers();
    }
  });

  it('se la navigazione lancia, ripiega su condividiFile e ne restituisce l\'esito', async () => {
    // Nessuna Web Share API disponibile: il ripiego di condividiFile atterra
    // sul download, il cui esito deve propagarsi da apriCalendario.
    URL.createObjectURL = vi.fn().mockReturnValue('blob:finto');
    URL.revokeObjectURL = vi.fn();
    definisciLocation({ lanciaErrore: true });

    let ancoraCliccata: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      ancoraCliccata = this;
    });

    const esito = await apriCalendario('BEGIN:VCALENDAR\nEND:VCALENDAR');

    expect(esito).toBe('scaricato');
    expect(ancoraCliccata).not.toBeNull();
    expect(ancoraCliccata!.download).toBe('bibiciclo.ics');
  });
});
