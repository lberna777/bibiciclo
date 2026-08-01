# BibiCiclo

App per il monitoraggio del ciclo mestruale che non invia dati da nessuna parte.

I dati restano nell'IndexedDB del telefono. Non esiste backend, non esistono account,
non esistono analytics. L'unica richiesta di rete è il caricamento dei file dell'app.

## Installazione su iPhone

Aprire l'indirizzo dell'app in Safari, poi Condividi → Aggiungi a Home.

## Sviluppo

    npm install
    npm run dev      # sviluppo
    npm test         # test della logica del ciclo
    npm run build    # build di produzione

La logica del ciclo sta in `src/core/` in funzioni pure, coperte da test.
Le previsioni sono stime: l'app non è un metodo contraccettivo.
