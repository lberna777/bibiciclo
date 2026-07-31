// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { condividiFile } from './share';

function fileDiProva(): File {
  return new File(['contenuto'], 'prova.ics', { type: 'text/calendar' });
}

function definisciNavigatorShare(canShare: unknown, share: unknown) {
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
}

const createObjectURLOriginale = URL.createObjectURL;
const revokeObjectURLOriginale = URL.revokeObjectURL;

afterEach(() => {
  vi.restoreAllMocks();
  // Riporta il navigator allo stato "assente": ogni test parte pulito.
  // @ts-expect-error canShare non è opzionale nei tipi DOM, ma va rimosso fra un test e l'altro.
  delete navigator.canShare;
  // @ts-expect-error share non è opzionale nei tipi DOM, ma va rimosso fra un test e l'altro.
  delete navigator.share;
  URL.createObjectURL = createObjectURLOriginale;
  URL.revokeObjectURL = revokeObjectURLOriginale;
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
