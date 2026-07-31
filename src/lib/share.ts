/**
 * Consegna un file all'utente. Su iOS apre il pannello di condivisione nativo,
 * da cui il file può essere aperto direttamente nell'app di destinazione.
 * Se la condivisione di file non è disponibile, ripiega sul download.
 * Restituisce quale delle due strade è stata usata.
 */
export async function condividiFile(file: File, titolo: string): Promise<'condiviso' | 'scaricato'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo });
      return 'condiviso';
    } catch (err) {
      // L'utente ha annullato il pannello: non è un errore da segnalare.
      if (err instanceof DOMException && err.name === 'AbortError') return 'condiviso';
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
