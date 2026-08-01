# BibiCiclo — cosa è stato verificato, e cosa resta aperto

**Data:** 2026-08-01 · Stato: implementazione completa, 139 test verdi, build pulita.

Questo documento esiste perché la cronologia git dice *cosa* è cambiato ma non *cosa è stato provato* né *cosa si è deciso di rimandare*. Se riapri il progetto fra mesi, parti da qui.

---

## 1. Verificato eseguendo l'app, non solo i test

Tutto quanto segue è stato provato guidando l'app nel browser a 375×812, o eseguendo il codice reale in uno script:

- **Onboarding completo** → i dati arrivano in IndexedDB nella forma giusta.
- **Previsioni** → con ultimo ciclo il 20 luglio e media 28 giorni: "tra 16 giorni, lunedì 17 agosto", finestra fertile 29 luglio – 4 agosto. Coincide col calcolo a mano.
- **Registrazione di un giorno** → il diario si aggiorna, i cicli si riderivano, il titolo passa a "Sei al giorno 1 del ciclo".
- **`key={data}` sul foglio** → aprendo un giorno diverso la nota è vuota e non compare "Rimuovi". Senza quella `key` avrebbe mostrato *e salvato* i valori del giorno precedente.
- **Aree di tocco** → misurate con `getBoundingClientRect()` su ogni controllo di ogni schermata: **nessuno sotto 44px** su entrambi gli assi. Celle del calendario 44,4×44,4; frecce dei mesi 48×45,3.
- **Esportazione `.ics`** → file reale: CRLF ovunque, 12 eventi bilanciati, 6 sveglie solo sui cicli, 12 UID distinti, nessuna riga oltre 75 caratteri, `DTEND` esclusivo corretto.
- **Backup** → round-trip identico (id e note comprese); tutti i percorsi d'errore rispondono in italiano: JSON invalido, `null`, array, versione futura.
- **Ritardo lungo** → con un ciclo di 172 giorni fa la schermata dice "Non segni il ciclo da 172 giorni", senza la vecchia rassicurazione fuori luogo.

## 2. Mai verificato — richiede un iPhone

Questi punti **non sono stati provati** e sono l'unica cosa che separa il progetto dal dirsi finito:

1. Installazione sulla Home da Safari: icona, nome, avvio a schermo intero, funzionamento in modalità aereo.
2. **`navigator.share` con un file dentro una PWA installata.** È il rischio numero uno del progetto. Su Chromium desktop scatta il ripiego sul download, che funziona; il comportamento su iOS può solo essere confermato sul dispositivo. Se il pannello nativo non si apre, il ripiego è già scritto e costa due tocchi in più.
3. Se iOS **aggiorni o duplichi** gli eventi del calendario a una seconda esportazione. Gli UID sono stabili per posizione e la `SEQUENCE` cresce, che è la condizione perché l'aggiornamento avvenga — ma non è una garanzia che possiamo dare noi.
4. Il giro completo end-to-end sul telefono di chi la userà.

## 3. Rimandato consapevolmente

Nessuno di questi blocca l'uso; sono annotati perché siano una scelta e non una dimenticanza.

- **Griglia del mese duplicata** fra `Onboarding.SelettoreData` e `Calendario`. Le due copie sono già divergenti di proposito (limiti, spaziature, stili). L'array delle iniziali dei giorni è invece **già a tre copie** (`Oggi`, `Calendario`, `Onboarding`): quello è maturo per l'estrazione.
- **`src/store.ts` e le schermate non hanno test propri.** `vite.config.ts` include solo `src/**/*.test.ts`, quindi un eventuale `.test.tsx` verrebbe saltato in silenzio. Conseguenza pratica: ogni modifica futura va riprovata a mano nel browser.
- **`basataSuStorico`** è calcolato e testato ma nessuna schermata lo legge.
- **Promemoria di ri-esportazione** (spec §8): non esiste; non memorizziamo quando il `.ics` è stato generato, quindi il Calendario può continuare a suonare su previsioni vecchie.
- **Nessun ripiegamento di riga RFC 5545** in `generaIcs`: corretto oggi (righe ~51 caratteri), diventa non conforme se un titolo cresce oltre 75.
- **Chiusura del foglio dal fondo** scarta una nota non salvata senza chiedere.
- **`registerType: 'autoUpdate'`** ricarica la pagina quando arriva una nuova versione: se succede a foglio aperto, quel che non è salvato si perde.

## 4. Tre punti difficili da ricostruire

Segnalati dalla review finale come i posti dove il ragionamento non si legge dal codice:

1. **Chi possiede `periods`.** `dayLogs` è l'unica fonte di verità; `periods` è *sempre* derivato. E `TOLLERANZA = 2` fa tre mestieri diversi: raggruppa i giorni in un ciclo, decide se un ciclo è "in corso", e quindi sceglie quale delle quattro frasi mostra la schermata Oggi. Cambiarlo per aggiustare il raggruppamento cambierebbe anche quando l'app dice "Sei al giorno N".
2. **Le misure a 44px sono funzionali, non estetiche.** `p-0.5`, `gap-0.5`, `min-w-11`, `leading-5`, i vari `py-3`: ognuno è il residuo di una correzione, e ognuno sembra qualcosa che un riordino futuro "semplificherebbe". Il vincolo sta scritto nel piano, lontano dal codice che lo applica.
3. **Lo schema di aggiornamento del `.ics` è un accordo fra tre file.** Gli UID sono per posizione (`ciclo-1`…`ciclo-6`), quindi la stessa posizione indica una data diversa a ogni esportazione; funziona solo perché `SEQUENCE` cresce; e cresce solo perché **`dataInstallazione` non viene mai riscritta**. Chi "sistemasse" `migra` per aggiornarla al ripristino romperebbe l'aggiornamento del calendario, e nessun test lo intercetterebbe.
