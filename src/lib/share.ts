/**
 * Consegna un file all'utente. Su iOS apre il pannello di condivisione nativo,
 * da cui il file può essere aperto direttamente nell'app di destinazione.
 * Se la condivisione di file non è disponibile, ripiega sul download.
 *
 * Restituisce quale dei tre esiti si è verificato:
 * - 'condiviso': il pannello di condivisione ha consegnato il file con successo.
 * - 'annullato': il pannello si è chiuso senza consegnare il file. Copre sia
 *   l'annullamento deliberato dell'utente sia il caso in cui non esiste alcuna
 *   app di destinazione disponibile — la piattaforma segnala entrambi i casi
 *   allo stesso modo (AbortError), quindi non possiamo distinguerli, e non
 *   dobbiamo dichiarare un successo che non è avvenuto.
 * - 'scaricato': il file è stato scaricato invece che condiviso (condivisione
 *   non disponibile per questo file, oppure fallita per un motivo diverso
 *   dall'annullamento).
 */
export async function condividiFile(file: File, titolo: string): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo });
      return 'condiviso';
    } catch (err) {
      // Il pannello si è chiuso senza consegnare il file: annullamento dell'utente
      // o assenza di un'app di destinazione. Non è un successo, ma nemmeno un
      // errore da segnalare come tale al chiamante.
      if (err instanceof DOMException && err.name === 'AbortError') return 'annullato';
      // Qualsiasi altro errore: si prosegue col ripiego.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'scaricato';
}
