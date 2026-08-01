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

/**
 * Apre un file `.ics` facendo navigare la scheda corrente verso il suo
 * contenuto, invece di condividerlo come file. È la differenza che conta su
 * iOS: la condivisione di un file `.ics` offre destinazioni come "Salva su
 * File" — Calendario di norma non compare come app di destinazione — mentre
 * una navigazione verso un contenuto di tipo `text/calendar` fa comparire
 * l'anteprima nativa di importazione ("Aggiungi tutti gli eventi").
 *
 * Non tocca `condividiFile`, che resta il meccanismo giusto per il backup
 * JSON (quello sì vuole essere salvato, non aperto) e su cui si appoggiano
 * i test esistenti.
 *
 * Restituisce quale dei quattro esiti si è verificato:
 * - 'aperto': la navigazione verso il contenuto .ics è partita. Su iOS
 *   dovrebbe comparire l'anteprima nativa del Calendario, ma non è
 *   verificabile da qui: nessun ambiente di sviluppo o test riproduce
 *   quella schermata.
 * - 'condiviso' / 'scaricato' / 'annullato': la navigazione non era
 *   disponibile o è fallita (una PWA installata standalone può rifiutarla),
 *   quindi si è ripiegato su `condividiFile` — che riporta quale di questi
 *   tre esiti si è verificato.
 */
export async function apriCalendario(ics: string): Promise<'aperto' | 'condiviso' | 'scaricato' | 'annullato'> {
  try {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    // Programmata prima di tentare la navigazione: così l'URL viene comunque
    // revocato anche se l'assegnazione sotto lancia un'eccezione, senza
    // lasciare un Blob agganciato per errore.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    window.location.href = url;
    return 'aperto';
  } catch {
    // La navigazione non è disponibile o è stata rifiutata: si ripiega sulla
    // condivisione del file, che gestisce già da sé i propri esiti.
    const file = new File([ics], 'bibiciclo.ics', { type: 'text/calendar' });
    return condividiFile(file, 'Date di BibiCiclo');
  }
}
