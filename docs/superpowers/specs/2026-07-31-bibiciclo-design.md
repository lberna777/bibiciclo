# BibiCiclo — Specifica di design

**Data:** 2026-07-31
**Stato:** approvata, pronta per il piano di implementazione

---

## 1. Perché esiste

Le app di monitoraggio del ciclo più diffuse raccolgono dati sanitari su un server e li rivendono. BibiCiclo fa le stesse cose utili — sapere quando arriva il ciclo e quando cade la finestra fertile — senza che un solo dato lasci il telefono.

L'utente è una persona sola, la ragazza di Lorenzo, poco a suo agio con le interfacce digitali. Da qui il vincolo che governa ogni decisione di questo documento: **se una funzione costa un tap in più o richiede di interpretare un simbolo, va ripensata.**

## 2. Cosa fa (perimetro della v1)

Dentro:

- Calendario del ciclo con previsione del prossimo e della finestra fertile
- Registrazione giornaliera del flusso (leggero / medio / tanto) con nota libera opzionale
- Promemoria tramite eventi esportati nel Calendario di iOS
- Esportazione e reimportazione dei dati in un file

Fuori (esplicitamente rinviato):

- Tracciamento di dolori, umore, sintomi, temperatura basale
- Notifiche push
- Sincronizzazione fra dispositivi, account, backup automatico su cloud
- Statistiche e grafici storici

## 3. Architettura

**Progressive Web App** installata sulla schermata Home dell'iPhone tramite "Aggiungi a Home" di Safari. Nessun backend: dopo il primo caricamento l'app vive interamente nel telefono e funziona offline.

Stack: React 19 + TypeScript + Vite + Tailwind + Zustand + `vite-plugin-pwa`. È lo stesso stack già in uso in `diritto-quiz-app`.

**Distribuzione:** GitHub Pages, repo pubblica. La repo contiene solo il codice dell'app; nessun dato dell'utente transita o risiede lì. Una repo pubblica è anzi una garanzia verificabile: chiunque può controllare che non esistano chiamate di rete verso l'esterno.

**Modello di privacy.** L'unica richiesta di rete che l'app effettua è il caricamento dei propri file statici. Non esiste analytics, telemetria, font remoti, CDN, error reporting. I dati risiedono in IndexedDB sul dispositivo e ne escono solo quando l'utente preme deliberatamente "Salva una copia dei dati". Nessun blocco con PIN: il telefono è già protetto dal proprio sblocco, e un passaggio in più contraddirebbe il vincolo di semplicità.

### Moduli

La regola strutturale: **tutta la matematica del ciclo sta in funzioni pure che non toccano né lo schermo né il disco.**

| Modulo | Responsabilità | Dipendenze |
|---|---|---|
| `core/dates.ts` | Aritmetica su date in formato `YYYY-MM-DD` | nessuna |
| `core/cycle.ts` | `prossimoCiclo()`, `finestraFertile()`, `statistiche()` | `core/dates` |
| `core/periods.ts` | `registraGiorno(stato, data, flusso, nota) → nuovo stato` | `core/dates` |
| `storage/db.ts` | Unico punto di accesso a IndexedDB, con versione di schema | `idb-keyval` |
| `storage/backup.ts` | Esporta/importa JSON, con validazione in ingresso | `core/*` |
| `calendar/ics.ts` | Genera il file `.ics` e lo passa alla condivisione iOS | `core/cycle` |
| `store.ts` | Stato Zustand: contiene i dati, delega i calcoli a `core/` | `core/*`, `storage/db` |
| `ui/` | Schermate e componenti. Non calcolano: chiedono e mostrano | `store` |

`core/` non importa nulla da `ui/`, `storage/` o `store.ts`. È la condizione che rende i test rapidi e affidabili.

## 4. Modello dati

Un unico oggetto JSON in IndexedDB, chiave `bibiciclo:v1`, salvato tramite `idb-keyval`. Il volume è nell'ordine dei kilobyte anche dopo anni: non serve un database relazionale.

```ts
type Flusso = 'leggero' | 'medio' | 'tanto';

interface Stato {
  schemaVersion: number;              // 1
  settings: {
    cicloMedioDichiarato: number;     // dall'onboarding, default 28
    dataInstallazione: string;        // YYYY-MM-DD
  };
  periods: Array<{
    id: string;
    inizio: string;                   // YYYY-MM-DD, primo giorno registrato
    fine: string;                     // YYYY-MM-DD, ultimo giorno registrato
  }>;
  dayLogs: Record<string, {           // chiave = YYYY-MM-DD
    flusso: Flusso;
    nota?: string;
  }>;
}
```

`periods` e `dayLogs` sono separati di proposito: `periods` alimenta le previsioni, `dayLogs` è il diario. Se il diario si corrompe, le previsioni continuano a funzionare.

**Le date sono sempre stringhe `YYYY-MM-DD`, mai oggetti `Date`.** L'aritmetica sui giorni avviene su queste stringhe. Usare timestamp esporrebbe al bug classico delle app di calendario: fusi orari e ora legale che spostano un giorno avanti o indietro.

### Apertura e chiusura di un ciclo

Non esiste uno stato "aperto" esplicito: `fine` contiene sempre l'ultimo giorno registrato, e un ciclo è considerato *in corso* quando la sua `fine` dista non più di 2 giorni da oggi. Eliminare lo stato nullo elimina anche la possibilità che resti incoerente.

**`periods` non viene costruito: viene derivato.** È una funzione pura di `dayLogs`, ricalcolata a ogni modifica del diario:

1. si ordinano tutte le date registrate;
2. si raggruppano quelle consecutive il cui scarto è **≤ 2 giorni**;
3. ogni gruppo diventa un ciclo, con `inizio` al primo giorno del gruppo e `fine` all'ultimo.

Ne discendono per costruzione tre garanzie che, mantenute a mano, si romperebbero: `inizio` e `fine` sono sempre giorni *realmente registrati*; due cicli vicini non possono restare separati per errore; e a parità di diario lo stato è sempre lo stesso, indipendentemente dall'ordine in cui i giorni sono stati inseriti o tolti.

La tolleranza di 2 giorni serve a un caso reale: dimenticare di segnare un giorno non deve spezzare un ciclo in due, perché due `inizio` fasulli falserebbero tutte le medie successive.

**Rimozione.** Toccando un giorno già registrato, il foglio offre anche "Rimuovi questo giorno": il giorno esce dal diario e i cicli si ricalcolano. Se era l'unico giorno del ciclo, il ciclo sparisce. Se era un giorno centrale, il ciclo si spezza **solo se** il buco lasciato supera la tolleranza — altrimenti resta uno, esattamente come se quel giorno non fosse mai stato registrato. È la stessa regola applicata in entrambe le direzioni, e per questo è difficile da sbagliare.

## 5. Algoritmo di previsione

**Durata del ciclo.** Si calcola la distanza in giorni fra gli `inizio` consecutivi. Si prende la **mediana degli ultimi 6 cicli** — non la media aritmetica, perché un singolo ciclo anomalo da 45 giorni non deve spostare le previsioni per mesi. Con meno di 2 cicli registrati si usa `cicloMedioDichiarato`. Il risultato è vincolato all'intervallo **21–45 giorni**: fuori da lì si tratta *spesso* di un errore di inserimento — ma non sempre. Cicli genuinamente lunghi (50 giorni e oltre) esistono e sono regolari, quindi l'avviso di irregolarità non scatterebbe: l'app annuncerebbe con sicurezza una data calcolata su una durata che si è riscritta da sola. Per questo il vincolo non è silenzioso: quando interviene, la previsione lo dichiara e la schermata Oggi lo dice, invitando a correggere la durata a mano dalle impostazioni.

**Prossimo ciclo.** `ultimo inizio + durata mediana`.

**Finestra fertile.** L'ovulazione è stimata **14 giorni prima del prossimo ciclo previsto**: la fase luteale è la parte stabile del ciclo, molto più della prima metà. La finestra fertile va da **5 giorni prima dell'ovulazione a 1 giorno dopo** — sei giorni, perché gli spermatozoi sopravvivono fino a cinque giorni nel tratto riproduttivo.

**Irregolarità.** Se la differenza fra il ciclo più lungo e il più corto **fra gli ultimi 6 registrati** (gli stessi usati per la mediana) supera **7 giorni**, i cicli sono considerati irregolari. Con meno di 3 cicli registrati la valutazione non viene effettuata: non ci sono dati sufficienti per parlare di regolarità. In tal caso:

- il linguaggio passa da "arriva il 30 luglio" a "arriva **intorno al** 30 luglio";
- la finestra fertile **resta visibile**, accompagnata da un avvertimento esplicito: le mestruazioni recenti sono state irregolari e questa stima è poco affidabile.

**Durata delle mestruazioni.** Mediana delle durate registrate, default 5 giorni.

**Ritardo.** Se la data prevista è già passata e non è stato registrato alcun ciclo, l'app non mostra un numero negativo ma cambia frase: *"Il ciclo è in ritardo di 3 giorni"*, con una nota che ricorda che qualche giorno di scarto è normale.

## 6. Avvertenza sanitaria

Mostrata come schermata durante il primo avvio, prima di qualsiasi domanda, e ripetuta in forma breve e permanente sotto la sezione della finestra fertile.

Contenuto: l'app **stima, non misura**; **non è un metodo contraccettivo** e non sostituisce un parere medico. Il metodo del calendario ha un tasso di fallimento nell'uso reale intorno al 12–24%.

È un requisito funzionale, non una formalità legale: è ciò che distingue uno strumento onesto da uno che si assume una responsabilità che non può reggere.

## 7. Schermate

### 7.1 Primo avvio

Tre passaggi: avvertenza sanitaria → "Quando è iniziato l'ultimo ciclo?" (calendario da toccare) → "Ogni quanti giorni ti viene, più o meno?" (28 preimpostato, regolabile con −/+). Al termine l'app mostra già una previsione.

### 7.2 Oggi (schermata principale)

La risposta scritta a parole, in caratteri grandi: *"Il ciclo arriva tra 14 giorni"*, con sotto la data e lo stato della finestra fertile. Striscia dei sette giorni della settimana corrente, con i giorni fertili evidenziati e oggi in risalto. Un unico bottone d'azione: **"🩸 Oggi mi è venuto"**. In fondo, il rimando al calendario.

Nessun anello di avanzamento e nessuna legenda di colori da decifrare: la lettura non richiede interpretazione.

Se esiste un ciclo in corso e il giorno odierno non è ancora stato registrato, compare una riga di promemoria ("Non hai ancora segnato oggi").

### 7.3 Foglio di registrazione

Pannello che sale dal basso, aperto dal bottone della home oppure toccando un giorno qualsiasi del calendario. Contiene: la data in chiaro, i tre livelli di flusso con **"Medio" già preselezionato**, un campo nota opzionale, il bottone **Salva**, e sotto il rimando testuale **"È già iniziato? Scegli il giorno giusto ›"**.

La preselezione del flusso riduce l'operazione tipica a un solo tap su Salva. Se il foglio viene chiuso senza salvare, la riga di promemoria nella home segnala che il giorno non è stato registrato.

Lo stesso componente serve entrambi i punti di ingresso — è così che si correggono gli errori e si recuperano i giorni dimenticati.

### 7.4 Calendario

Vista mensile con navigazione fra i mesi. Codifica: giorni di ciclo registrati, finestra fertile, ciclo previsto (tratteggiato), oggi evidenziato. Legenda sempre visibile. Toccando un giorno si apre il foglio di registrazione su quella data.

### 7.5 Impostazioni

"Aggiungi le prossime date al Calendario" · "Salva una copia dei dati" · "Ripristina da una copia" · durata media modificabile a mano · avvertenza sanitaria per esteso · versione dell'app.

## 8. Promemoria via Calendario iOS

L'app genera un file `.ics` contenente i prossimi **6 cicli previsti** e le relative finestre fertili, ciascuno con un avviso (`VALARM`) a 2 giorni di anticipo. Il file viene consegnato tramite `navigator.share({ files: [...] })`, che su iOS apre il pannello di condivisione nativo: un tocco su "Calendario" e le date sono aggiunte.

**Ripiego:** se la condivisione di file non è disponibile nel contesto PWA installata, si degrada a un link di download normale (`Blob` + `<a download>`), che comporta due tap in più.

Poiché le previsioni si aggiornano con i cicli reali, le impostazioni segnalano quando le date esportate sono più vecchie di tre mesi e invitano a rigenerarle. Gli eventi generati usano `UID` deterministici, così una nuova esportazione aggiorna gli eventi esistenti anziché duplicarli.

## 9. Backup

**Esportazione:** l'intero oggetto `Stato` serializzato in un file `bibiciclo-backup-YYYY-MM-DD.json`, consegnato con lo stesso meccanismo di condivisione del `.ics`. Nessuna cifratura: una password dimenticata renderebbe il backup inutile, e il rischio maggiore qui è la perdita dei dati, non l'intercettazione.

**Importazione:** selezione del file, validazione della struttura e dello `schemaVersion`, richiesta di conferma esplicita ("questa operazione sostituisce i dati attuali"), quindi sostituzione.

Il backup è la sola rete di sicurezza esistente in un'architettura senza server: cancellare l'app, cambiare telefono o subire uno svuotamento dello storage da parte di Safari comporta altrimenti la perdita definitiva dei dati.

## 10. Verifica

**Test automatici (vitest) su `core/`**, che essendo puro si testa senza browser. Casi da coprire:

- nessun ciclo registrato → previsione basata sul valore dichiarato
- un solo ciclo → idem
- sei cicli regolari → previsione stabile, nessun avvertimento di irregolarità
- sei cicli con un valore anomalo isolato → la mediana non si sposta
- cicli irregolari (variabilità > 7 giorni) → linguaggio approssimativo e avvertimento presente, finestra fertile comunque calcolata
- durata calcolata fuori dall'intervallo 21–45 → vincolata agli estremi
- giorno saltato entro la tolleranza → il ciclo non si spezza; oltre la tolleranza → si apre un ciclo nuovo
- attraversamento del cambio d'anno
- attraversamento del cambio di ora legale (fine ottobre, fine marzo)
- esporta → importa → lo stato risultante è identico all'originale

**Verifica manuale** nel browser durante lo sviluppo, e sull'iPhone reale prima della consegna, con almeno un ciclo fittizio già registrato per valutare l'app "abitata" anziché vuota.

## 11. Rischi noti

| Rischio | Mitigazione |
|---|---|
| `navigator.share` con file si comporta diversamente in PWA installata su iOS | Verificato come **primo** esperimento del piano, prima di costruirci sopra. Ripiego già definito (§8) |
| Safari svuota lo storage se il dispositivo è a corto di spazio | Backup esplicito (§9); l'app invita a salvare una copia dopo il primo ciclo completo registrato |
| Bug di fuso orario nelle date | Date come stringhe `YYYY-MM-DD`, mai `Date`; test dedicati sull'ora legale |
| L'utente smette di usarla perché la registrazione è noiosa | Flusso preselezionato, un tap per salvare, nessun campo obbligatorio |
| L'app viene scambiata per un metodo contraccettivo | Avvertenza all'avvio e permanente (§6) |

## 12. Decisioni prese e alternative scartate

- **PWA anziché app nativa iOS** — pur avendo accesso a un Mac, l'app nativa comporta 99$/anno per restare installata. La PWA non ha costi ricorrenti e offre tutto il necessario per questo perimetro.
- **Eventi nel Calendario anziché notifiche push** — su iOS il Web Push richiede un server che invii la notifica; non esiste API per notifiche locali programmate. Un server contraddirebbe il presupposto dell'app. Gli avvisi nativi del Calendario sono affidabili e non richiedono infrastruttura.
- **Nessun blocco con PIN** — attrito quotidiano non giustificato, dato che il telefono ha già il proprio sblocco.
- **Niente tracciamento di dolori e umore** — scelta esplicita dell'utente: meno campi, registrazione più rapida.
- **Backup non cifrato** — il rischio dominante è la perdita dei dati, non l'intercettazione; una password dimenticata trasformerebbe la rete di sicurezza in un file inutile.
- **Mediana anziché media** per la durata del ciclo — robusta rispetto ai valori anomali.
