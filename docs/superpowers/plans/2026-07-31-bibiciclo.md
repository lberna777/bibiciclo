# BibiCiclo — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire una PWA installabile su iPhone che prevede l'arrivo del ciclo e la finestra fertile, registra il flusso giornaliero, esporta le date nel Calendario iOS e permette backup — senza che alcun dato lasci il dispositivo.

**Architecture:** Applicazione React interamente client-side, senza backend. Tutta la logica del ciclo vive in funzioni pure sotto `src/core/` che non toccano né lo schermo né il disco, e sono coperte da test vitest. Un singolo oggetto JSON in IndexedDB conserva lo stato; `src/storage/` è l'unico strato che vi accede. La UI legge da uno store Zustand e non esegue calcoli.

**Tech Stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4 (`@tailwindcss/vite`), Zustand 5, `idb-keyval` 6, `vite-plugin-pwa`, vitest 3. Deploy su GitHub Pages tramite GitHub Actions.

## Global Constraints

- **Lingua:** ogni testo visibile all'utente è in italiano. Nomi di funzioni e tipi in italiano quando descrivono il dominio (`registraGiorno`, `Previsione`), in inglese per i concetti tecnici standard (`addDays`, `store`).
- **Date:** sempre stringhe `YYYY-MM-DD` (tipo `ISODate`). L'aritmetica sui giorni usa esclusivamente `src/core/dates.ts`. L'unico punto in cui si legge l'ora locale del dispositivo è la funzione `oggi()`.
- **Nessuna rete:** vietati analytics, telemetria, font remoti, CDN, error reporting, qualsiasi `fetch` verso un host esterno. L'app carica solo i propri file statici.
- **Nessuna dipendenza oltre quelle elencate in Tech Stack** senza motivazione esplicita.
- **Target:** Safari su iOS 16.4+, in modalità standalone (installata sulla Home).
- **Nome dell'app:** `BibiCiclo`. Base path di deploy: `/bibiciclo/`.
- **Avvertenza sanitaria:** il testo di §6 della specifica va riportato verbatim dove indicato. Non riformularlo.
- **Intervalli fissi:** durata ciclo vincolata a 21–45 giorni; finestra fertile da ovulazione−5 a ovulazione+1; ovulazione = prossimo inizio − 14 giorni; soglia di irregolarità 7 giorni di escursione; tolleranza di continuità di un ciclo 2 giorni.

**Specifica di riferimento:** `docs/superpowers/specs/2026-07-31-bibiciclo-design.md`

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/types.ts` | Tipi condivisi: `ISODate`, `Flusso`, `Periodo`, `Stato` |
| `src/core/dates.ts` | Aritmetica e formattazione di date `YYYY-MM-DD` |
| `src/core/cycle.ts` | Statistiche e previsioni. Funzioni pure |
| `src/core/periods.ts` | Registrazione e rimozione di un giorno. Funzioni pure |
| `src/storage/db.ts` | Unico accesso a IndexedDB, con versione di schema |
| `src/storage/backup.ts` | Serializzazione e validazione del backup |
| `src/calendar/ics.ts` | Generazione del file `.ics` |
| `src/lib/share.ts` | Consegna di un file all'utente (condivisione nativa o download) |
| `src/store.ts` | Store Zustand: stato, azioni, tab attiva |
| `src/App.tsx` | Radice: onboarding o applicazione, selezione della schermata |
| `src/components/TabBar.tsx` | Barra inferiore a tre voci |
| `src/components/FoglioRegistrazione.tsx` | Pannello di registrazione del flusso |
| `src/components/Avvertenza.tsx` | Testo dell'avvertenza sanitaria, riusato in due punti |
| `src/screens/Onboarding.tsx` | Tre passaggi del primo avvio |
| `src/screens/Oggi.tsx` | Schermata principale |
| `src/screens/Calendario.tsx` | Vista mensile |
| `src/screens/Impostazioni.tsx` | Calendario iOS, backup, durata media, avvertenza |

`src/core/` non importa nulla da `src/ui`, `src/storage/` o `src/store.ts`. È la condizione che rende i test rapidi e affidabili.

---

## Task 1: Impalcatura del progetto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`
- Test: `src/core/dates.test.ts` (solo per verificare che vitest giri)

**Interfaces:**
- Consumes: niente
- Produces: comandi `npm run dev`, `npm run build`, `npm test`

- [ ] **Step 1: Inizializzare la repository**

```bash
cd /home/lorenzo/Idee/bibiciclo
git init
git branch -M main
```

- [ ] **Step 2: Creare `package.json`**

```json
{
  "name": "bibiciclo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "TZ=Europe/Rome vitest run",
    "test:watch": "TZ=Europe/Rome vitest",
    "icons": "node scripts/make-icons.mjs"
  },
  "dependencies": {
    "idb-keyval": "^6.2.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.3.4",
    "sharp": "^0.33.5",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.8.3",
    "vite": "^7.0.0",
    "vite-plugin-pwa": "^1.0.0",
    "vitest": "^3.0.0"
  }
}
```

Poi: `npm install`

- [ ] **Step 3: Creare `vite.config.ts`**

Il `base` deve corrispondere al nome della repository GitHub, altrimenti su GitHub Pages i file non vengono trovati.

```ts
// `defineConfig` da vitest/config estende quello di Vite e riconosce la sezione `test`.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/bibiciclo/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Creare `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

Creare anche `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "scripts"]
}
```

- [ ] **Step 5: Creare `index.html`**

I meta `apple-*` sono ciò che rende l'app a schermo intero una volta aggiunta alla Home su iOS.

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#fdf7f8" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="BibiCiclo" />
    <title>BibiCiclo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Creare `src/index.css`**

```css
@import "tailwindcss";

@theme {
  --color-rosa: #d4547e;
  --color-rosa-scuro: #c0426c;
  --color-rosa-chiaro: #fce8ee;
  --color-crema: #fdf7f8;
  --color-inchiostro: #3b2b31;
  --color-tenue: #a98d95;
  --color-bordo: #f0dfe4;
  --color-verde: #dcefe6;
  --color-verde-scuro: #3f7a63;
}

html, body, #root { height: 100%; }

body {
  background: var(--color-crema);
  color: var(--color-inchiostro);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior-y: none;
}
```

- [ ] **Step 7: Creare `src/main.tsx` e un `src/App.tsx` provvisorio**

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```tsx
// src/App.tsx
export default function App() {
  return <div className="p-6 text-2xl font-bold">BibiCiclo</div>;
}
```

- [ ] **Step 8: Creare `.gitignore`**

```
node_modules
dist
dev-dist
.DS_Store
.superpowers
```

- [ ] **Step 9: Scrivere un test minimo per verificare che vitest funzioni**

```ts
// src/core/dates.test.ts
import { describe, it, expect } from 'vitest';

describe('impalcatura', () => {
  it('vitest è configurato', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10: Verificare che tutto giri**

Run: `npm test`
Expected: 1 test PASS

Run: `npm run build`
Expected: build completata, cartella `dist/` creata

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: impalcatura Vite + React + TS + Tailwind + vitest"
```

---

## Task 2: PWA installabile e deploy su GitHub Pages

Al termine di questa task l'app — ancora vuota — deve essere installabile sulla Home dell'iPhone. Questo va verificato **ora**: scoprire un problema di installazione alla fine costerebbe molto di più.

**Files:**
- Create: `public/icona.svg`, `scripts/make-icons.mjs`, `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`

**Interfaces:**
- Consumes: impalcatura della Task 1
- Produces: app raggiungibile su `https://<utente>.github.io/bibiciclo/`, installabile su iOS

- [ ] **Step 1: Creare l'icona sorgente `public/icona.svg`**

Il fondo riempie tutta la tela senza angoli arrotondati: iOS applica da sé la maschera all'`apple-touch-icon`, e le zone trasparenti le comporrebbe su nero.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fce8ee"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#d4547e" stroke-width="34"
          stroke-linecap="round" stroke-dasharray="700 943" transform="rotate(-90 256 256)"/>
  <circle cx="256" cy="256" r="58" fill="#d4547e"/>
</svg>
```

- [ ] **Step 2: Creare `scripts/make-icons.mjs`**

iOS richiede PNG per l'icona della Home: un SVG nel manifest non basta. Il `.flatten()` garantisce che il PNG non abbia pixel trasparenti.

```js
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icona.svg');
const misure = [
  ['public/icona-192.png', 192],
  ['public/icona-512.png', 512],
  ['public/apple-touch-icon.png', 180],
];

for (const [file, size] of misure) {
  await sharp(svg)
    .resize(size, size)
    .flatten({ background: '#fce8ee' })
    .png()
    .toFile(file);
  console.log('creato', file, size);
}
```

- [ ] **Step 3: Generare le icone**

Run: `npm run icons`
Expected: tre file PNG creati in `public/`

- [ ] **Step 4: Aggiungere il link all'icona in `index.html`**

Dentro `<head>`, dopo i meta `apple-*`:

```html
<link rel="apple-touch-icon" href="/bibiciclo/apple-touch-icon.png" />
```

- [ ] **Step 5: Configurare `vite-plugin-pwa` in `vite.config.ts`**

Sostituire il blocco `plugins`:

```ts
import { VitePWA } from 'vite-plugin-pwa';

// ...
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icona.svg'],
      manifest: {
        name: 'BibiCiclo',
        short_name: 'BibiCiclo',
        description: 'Il tuo ciclo, solo sul tuo telefono.',
        lang: 'it',
        start_url: '/bibiciclo/',
        scope: '/bibiciclo/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fdf7f8',
        theme_color: '#fdf7f8',
        icons: [
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
```

- [ ] **Step 6: Registrare il service worker in `src/main.tsx`**

Aggiungere in cima al file, dopo gli import esistenti:

```tsx
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });
```

- [ ] **Step 7: Creare il workflow di deploy `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 8: Verificare la build in locale**

Run: `npm run build && npm run preview`
Expected: build completata; `dist/manifest.webmanifest` e `dist/sw.js` presenti

- [ ] **Step 9: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: PWA installabile e workflow di deploy su GitHub Pages"
```

Poi creare la repository pubblica su GitHub, impostare Settings → Pages → Source su "GitHub Actions", e fare push:

```bash
gh repo create bibiciclo --public --source=. --remote=origin --push
```

- [ ] **Step 10: VERIFICA SU IPHONE — non proseguire senza**

Aprire `https://<utente>.github.io/bibiciclo/` in Safari sull'iPhone, Condividi → Aggiungi a Home.

Verificare: l'icona compare corretta, il nome sotto l'icona è "BibiCiclo", aprendola parte a schermo intero senza la barra di Safari, e in modalità aereo continua ad aprirsi.

Se qualcosa non torna, va risolto qui.

---

## Task 3: Verifica della condivisione di file su iOS

Il rischio principale del progetto (§11 della specifica). Va sciolto prima di costruirci sopra il calendario e il backup.

**Files:**
- Create: `src/lib/share.ts`
- Modify: `src/App.tsx` (schermata di prova temporanea)

**Interfaces:**
- Consumes: PWA installata dalla Task 2
- Produces: `condividiFile(file: File, titolo: string): Promise<'condiviso' | 'scaricato' | 'annullato'>`

- [ ] **Step 1: Scrivere `src/lib/share.ts`**

`navigator.canShare` va interrogato con il file effettivo: alcuni browser accettano la condivisione di testo ma non di file.

```ts
/**
 * Consegna un file all'utente. Su iOS apre il pannello di condivisione nativo,
 * da cui il file può essere aperto direttamente nell'app di destinazione.
 * Se la condivisione di file non è disponibile, ripiega sul download.
 *
 * Esiti:
 * - 'condiviso'  il pannello ha consegnato il file
 * - 'scaricato'  si è usato il ripiego del download
 * - 'annullato'  il pannello si è chiuso senza consegnare nulla. Copre sia
 *                l'annullamento deliberato sia l'assenza di destinazioni:
 *                non sappiamo distinguerli, e non dobbiamo dichiarare un
 *                successo che non c'è stato.
 */
export async function condividiFile(
  file: File,
  titolo: string,
): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo });
      return 'condiviso';
    } catch (err) {
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
```

- [ ] **Step 2: Sostituire `src/App.tsx` con una schermata di prova temporanea**

```tsx
import { useState } from 'react';
import { condividiFile } from './lib/share';

const ICS_PROVA = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//BibiCiclo//IT',
  'BEGIN:VEVENT',
  'UID:prova@bibiciclo',
  'DTSTAMP:20260731T120000Z',
  'DTSTART;VALUE=DATE:20260810',
  'DTEND;VALUE=DATE:20260811',
  'SUMMARY:Prova BibiCiclo',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

export default function App() {
  const [esito, setEsito] = useState('');

  async function prova() {
    const file = new File([ICS_PROVA], 'prova.ics', { type: 'text/calendar' });
    setEsito(await condividiFile(file, 'Prova BibiCiclo'));
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Prova condivisione</h1>
      <button onClick={prova} className="w-full rounded-2xl bg-rosa px-4 py-4 font-bold text-white">
        Condividi un evento di prova
      </button>
      <p className="text-tenue">Esito: {esito || '—'}</p>
    </div>
  );
}
```

- [ ] **Step 3: Pubblicare**

```bash
git add -A
git commit -m "chore: verifica condivisione file su iOS"
git push
```

- [ ] **Step 4: VERIFICA SU IPHONE — decide il resto del piano**

Aprire l'app **installata sulla Home** (non in Safari: il comportamento può differire), premere il bottone.

Esito atteso: si apre il pannello di condivisione iOS; toccando "Calendario" compare la schermata di aggiunta evento; l'esito mostrato è `condiviso`.

Annotare l'esito in fondo a `docs/superpowers/specs/2026-07-31-bibiciclo-design.md`, sotto un titolo "Esito verifica condivisione (Task 3)". Se l'esito è `scaricato`, annotare cosa succede toccando il file scaricato: è il percorso che l'utente dovrà seguire, e va documentato nella schermata Impostazioni.

- [ ] **Step 5: Commit dell'annotazione**

```bash
git add docs/
git commit -m "docs: esito della verifica di condivisione su iOS"
```

---

## Task 4: `core/dates.ts` — aritmetica sulle date

**Files:**
- Create: `src/types.ts`, `src/core/dates.ts`
- Test: `src/core/dates.test.ts` (sostituisce il test provvisorio della Task 1)

**Interfaces:**
- Consumes: niente
- Produces:
  - `type ISODate = string`
  - `addDays(d: ISODate, n: number): ISODate`
  - `diffDays(da: ISODate, a: ISODate): number`
  - `oggi(): ISODate`
  - `confronta(a: ISODate, b: ISODate): number`
  - `formattaLunga(d: ISODate): string` → `"giovedì 30 luglio"`
  - `formattaCorta(d: ISODate): string` → `"30 luglio"`
  - `giornoSettimana(d: ISODate): number` → 0 = lunedì … 6 = domenica
  - `nomeMese(mese: number): string` → `"luglio"` (mese 1-12)
  - `giorniDelMese(anno: number, mese: number): ISODate[]` (mese 1-12)

- [ ] **Step 1: Creare `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Scrivere i test in `src/core/dates.test.ts`**

Il caso dell'ora legale è il motivo per cui questo modulo esiste: in Italia il 25 ottobre 2026 le lancette tornano indietro di un'ora, e un'implementazione basata su `Date` locale sbaglierebbe di un giorno.

Attenzione a una trappola: quel test discrimina un'implementazione sbagliata **solo se il processo gira in un fuso che osserva l'ora legale**. Su CI (`ubuntu-latest`, UTC) aritmetica locale e UTC coincidono, e il test diventerebbe decorativo. Per questo gli script `test` e `test:watch` fissano `TZ=Europe/Rome`. Il test di primavera e quello su `diffDays` non discriminano in nessun caso — il primo perché il cambio di primavera toglie un'ora sola, il secondo perché `Math.round` assorbe qualunque scarto sotto le 12 ore — quindi sono normali test di regressione e i loro nomi non devono promettere altro.

```ts
import { describe, it, expect } from 'vitest';
import { addDays, diffDays, confronta, formattaLunga, formattaCorta, giornoSettimana, giorniDelMese } from './dates';

describe('addDays', () => {
  it('somma giorni dentro lo stesso mese', () => {
    expect(addDays('2026-07-03', 5)).toBe('2026-07-08');
  });
  it('attraversa il cambio di mese', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02');
  });
  it('attraversa il cambio di anno', () => {
    expect(addDays('2026-12-30', 4)).toBe('2027-01-03');
  });
  it('sottrae giorni', () => {
    expect(addDays('2026-01-02', -3)).toBe('2025-12-30');
  });
  it('attraversa la fine dell ora legale senza perdere un giorno', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });
  it('attraversa l inizio dell ora legale senza perdere un giorno', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
  it('gestisce il 29 febbraio di un anno bisestile', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('diffDays', () => {
  it('conta i giorni fra due date', () => {
    expect(diffDays('2026-07-03', '2026-07-31')).toBe(28);
  });
  it('restituisce un valore negativo se la seconda data precede la prima', () => {
    expect(diffDays('2026-07-31', '2026-07-03')).toBe(-28);
  });
  it('restituisce zero per la stessa data', () => {
    expect(diffDays('2026-07-03', '2026-07-03')).toBe(0);
  });
  it('non sbaglia attraversando l ora legale', () => {
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
  });
});

describe('confronta', () => {
  it('ordina le date crescenti', () => {
    const date = ['2026-08-01', '2026-07-03', '2026-12-25'];
    expect([...date].sort(confronta)).toEqual(['2026-07-03', '2026-08-01', '2026-12-25']);
  });
});

describe('formattazione', () => {
  it('formatta in italiano per esteso', () => {
    expect(formattaLunga('2026-07-30')).toBe('giovedì 30 luglio');
  });
  it('formatta in forma corta', () => {
    expect(formattaCorta('2026-07-30')).toBe('30 luglio');
  });
});

describe('giornoSettimana', () => {
  it('conta da lunedì', () => {
    expect(giornoSettimana('2026-07-27')).toBe(0); // lunedì
    expect(giornoSettimana('2026-08-02')).toBe(6); // domenica
  });
});

describe('giorniDelMese', () => {
  it('restituisce tutti i giorni del mese', () => {
    const g = giorniDelMese(2026, 2);
    expect(g).toHaveLength(28);
    expect(g[0]).toBe('2026-02-01');
    expect(g[27]).toBe('2026-02-28');
  });
  it('gestisce febbraio bisestile', () => {
    expect(giorniDelMese(2028, 2)).toHaveLength(29);
  });
});
```

- [ ] **Step 3: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./dates"`

- [ ] **Step 4: Implementare `src/core/dates.ts`**

Tutta l'aritmetica avviene in UTC, dove i giorni durano sempre 24 ore. L'unico punto che legge il fuso locale è `oggi()`, ed è corretto così: il giorno di calendario dell'utente è quello locale.

```ts
import type { ISODate } from '../types';

const MS_GIORNO = 86_400_000;

const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const pad = (n: number) => String(n).padStart(2, '0');

function aUtc(d: ISODate): number {
  const [y, m, g] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, g);
}

function daUtc(ms: number): ISODate {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return daUtc(aUtc(d) + n * MS_GIORNO);
}

export function diffDays(da: ISODate, a: ISODate): number {
  return Math.round((aUtc(a) - aUtc(da)) / MS_GIORNO);
}

/** Il giorno di calendario locale dell'utente. Unico punto che legge il fuso orario. */
export function oggi(): ISODate {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export function confronta(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 0 = lunedì … 6 = domenica */
export function giornoSettimana(d: ISODate): number {
  return (new Date(aUtc(d)).getUTCDay() + 6) % 7;
}

export function formattaLunga(d: ISODate): string {
  const [, m, g] = d.split('-').map(Number);
  return `${GIORNI[giornoSettimana(d)]} ${g} ${MESI[m - 1]}`;
}

export function formattaCorta(d: ISODate): string {
  const [, m, g] = d.split('-').map(Number);
  return `${g} ${MESI[m - 1]}`;
}

export function nomeMese(mese: number): string {
  return MESI[mese - 1];
}

/** Tutti i giorni del mese indicato. `mese` va da 1 a 12. */
export function giorniDelMese(anno: number, mese: number): ISODate[] {
  const giorni: ISODate[] = [];
  let d: ISODate = `${anno}-${pad(mese)}-01`;
  while (Number(d.slice(5, 7)) === mese) {
    giorni.push(d);
    d = addDays(d, 1);
  }
  return giorni;
}
```

- [ ] **Step 5: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: tutti PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/core/dates.ts src/core/dates.test.ts
git commit -m "feat(core): aritmetica e formattazione delle date"
```

---

## Task 5: `core/cycle.ts` — statistiche e previsioni

**Files:**
- Create: `src/core/cycle.ts`
- Test: `src/core/cycle.test.ts`

**Interfaces:**
- Consumes: `Periodo`, `ISODate` da `src/types`; `addDays`, `diffDays`, `confronta` da `src/core/dates`
- Produces:
  - `lunghezzeCicli(periods: Periodo[]): number[]`
  - `durataMediana(periods: Periodo[], dichiarato: number): number`
  - `isIrregolare(periods: Periodo[]): boolean`
  - `durataMestruazioni(periods: Periodo[]): number`
  - `previsione(periods: Periodo[], dichiarato: number, oggi: ISODate): Previsione | null`
  - `interface Previsione { prossimoInizio; giorniAlProssimo; durataMediana; durataMestruazioni; fertileInizio; fertileFine; irregolare; basataSuStorico }`

- [ ] **Step 1: Scrivere i test in `src/core/cycle.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { lunghezzeCicli, durataMediana, isIrregolare, durataMestruazioni, previsione } from './cycle';
import type { Periodo } from '../types';

/** Costruisce cicli consecutivi a partire da una data, con le lunghezze indicate. */
function cicli(inizio: string, lunghezze: number[], durata = 5): Periodo[] {
  const out: Periodo[] = [];
  let d = inizio;
  const somma = (data: string, n: number) => {
    const dt = new Date(Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10) ) + n * 86400000);
    const p = (x: number) => String(x).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
  };
  for (let i = 0; i <= lunghezze.length; i++) {
    out.push({ id: `p${i}`, inizio: d, fine: somma(d, durata - 1) });
    if (i < lunghezze.length) d = somma(d, lunghezze[i]);
  }
  return out;
}

describe('lunghezzeCicli', () => {
  it('è vuoto senza cicli', () => {
    expect(lunghezzeCicli([])).toEqual([]);
  });
  it('è vuoto con un solo ciclo', () => {
    expect(lunghezzeCicli(cicli('2026-01-01', []))).toEqual([]);
  });
  it('misura la distanza fra inizi consecutivi', () => {
    expect(lunghezzeCicli(cicli('2026-01-01', [28, 30]))).toEqual([28, 30]);
  });
  it('ordina i cicli anche se arrivano disordinati', () => {
    const p = cicli('2026-01-01', [28, 30]).reverse();
    expect(lunghezzeCicli(p)).toEqual([28, 30]);
  });
});

describe('durataMediana', () => {
  it('usa il valore dichiarato senza storico', () => {
    expect(durataMediana([], 30)).toBe(30);
  });
  it('usa il valore dichiarato con un solo ciclo', () => {
    expect(durataMediana(cicli('2026-01-01', []), 26)).toBe(26);
  });
  it('calcola la mediana di cicli regolari', () => {
    expect(durataMediana(cicli('2026-01-01', [28, 28, 29, 28, 28]), 28)).toBe(28);
  });
  it('non si lascia spostare da un ciclo anomalo isolato', () => {
    expect(durataMediana(cicli('2026-01-01', [28, 28, 45, 28, 28]), 28)).toBe(28);
  });
  it('considera solo gli ultimi 6 cicli', () => {
    // dieci cicli: i primi quattro da 40, gli ultimi sei da 28
    const p = cicli('2026-01-01', [40, 40, 40, 40, 28, 28, 28, 28, 28, 28]);
    expect(durataMediana(p, 28)).toBe(28);
  });
  it('vincola verso il basso a 21 giorni', () => {
    expect(durataMediana(cicli('2026-01-01', [10, 10, 10]), 28)).toBe(21);
  });
  it('vincola verso l alto a 45 giorni', () => {
    expect(durataMediana(cicli('2026-01-01', [90, 90, 90]), 28)).toBe(45);
  });
  it('vincola anche il valore dichiarato', () => {
    expect(durataMediana([], 200)).toBe(45);
  });
});

describe('isIrregolare', () => {
  it('è falso con meno di 3 lunghezze misurate', () => {
    expect(isIrregolare(cicli('2026-01-01', [28, 40]))).toBe(false);
  });
  it('è falso quando l escursione è entro 7 giorni', () => {
    expect(isIrregolare(cicli('2026-01-01', [27, 28, 30, 29]))).toBe(false);
  });
  it('è vero quando l escursione supera 7 giorni', () => {
    expect(isIrregolare(cicli('2026-01-01', [24, 28, 38, 30]))).toBe(true);
  });
});

describe('durataMestruazioni', () => {
  it('vale 5 giorni senza storico', () => {
    expect(durataMestruazioni([])).toBe(5);
  });
  it('è la mediana delle durate registrate', () => {
    expect(durataMestruazioni(cicli('2026-01-01', [28, 28], 4))).toBe(4);
  });
});

describe('previsione', () => {
  it('è nulla senza alcun ciclo', () => {
    expect(previsione([], 28, '2026-07-16')).toBeNull();
  });

  it('con un solo ciclo usa il valore dichiarato', () => {
    const p = previsione(cicli('2026-07-03', []), 28, '2026-07-16')!;
    expect(p.prossimoInizio).toBe('2026-07-31');
    expect(p.basataSuStorico).toBe(false);
    expect(p.giorniAlProssimo).toBe(15);
  });

  it('colloca la finestra fertile fra 19 e 13 giorni prima del prossimo ciclo', () => {
    const p = previsione(cicli('2026-07-03', []), 28, '2026-07-16')!;
    // ovulazione = 31 luglio - 14 = 17 luglio; finestra = 12-18 luglio
    expect(p.fertileInizio).toBe('2026-07-12');
    expect(p.fertileFine).toBe('2026-07-18');
  });

  it('usa lo storico quando ci sono almeno due cicli', () => {
    // quattro cicli: 1 gen, 31 gen, 2 mar, 1 apr → il prossimo cade il 1 maggio
    const p = previsione(cicli('2026-01-01', [30, 30, 30]), 28, '2026-04-05')!;
    expect(p.durataMediana).toBe(30);
    expect(p.basataSuStorico).toBe(true);
    expect(p.prossimoInizio).toBe('2026-05-01');
  });

  it('segnala il ritardo con giorni negativi', () => {
    const p = previsione(cicli('2026-07-03', []), 28, '2026-08-03')!;
    expect(p.prossimoInizio).toBe('2026-07-31');
    expect(p.giorniAlProssimo).toBe(-3);
  });

  it('calcola comunque la finestra fertile quando i cicli sono irregolari', () => {
    const p = previsione(cicli('2026-01-01', [24, 28, 38, 30]), 28, '2026-05-01')!;
    expect(p.irregolare).toBe(true);
    expect(p.fertileInizio).toBeTruthy();
    expect(p.fertileFine).toBeTruthy();
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./cycle"`

- [ ] **Step 3: Implementare `src/core/cycle.ts`**

```ts
import type { ISODate, Periodo } from '../types';
import { addDays, confronta, diffDays } from './dates';

const CICLI_CONSIDERATI = 6;
const DURATA_MIN = 21;
const DURATA_MAX = 45;
const SOGLIA_IRREGOLARITA = 7;
const GIORNI_FASE_LUTEALE = 14;
const FERTILE_PRIMA = 5;
const FERTILE_DOPO = 1;
const DURATA_MESTRUAZIONI_DEFAULT = 5;

export interface Previsione {
  prossimoInizio: ISODate;
  /** Negativo se la data prevista è già passata. */
  giorniAlProssimo: number;
  durataMediana: number;
  durataMestruazioni: number;
  fertileInizio: ISODate;
  fertileFine: ISODate;
  irregolare: boolean;
  /** false quando la previsione poggia sul valore dichiarato anziché sullo storico. */
  basataSuStorico: boolean;
  /** true quando la durata usata è stata riportata dentro l'intervallo 21-45. */
  durataVincolata: boolean;
}

function ordinati(periods: Periodo[]): Periodo[] {
  return [...periods].sort((a, b) => confronta(a.inizio, b.inizio));
}

function mediana(valori: number[]): number {
  const v = [...valori].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

const vincola = (n: number) => Math.min(DURATA_MAX, Math.max(DURATA_MIN, n));

/** Distanze in giorni fra inizi consecutivi, in ordine cronologico. */
export function lunghezzeCicli(periods: Periodo[]): number[] {
  const p = ordinati(periods);
  const out: number[] = [];
  for (let i = 1; i < p.length; i++) out.push(diffDays(p[i - 1].inizio, p[i].inizio));
  return out;
}

const ultime = (periods: Periodo[]) => lunghezzeCicli(periods).slice(-CICLI_CONSIDERATI);

/**
 * Mediana delle ultime lunghezze misurate, vincolata a 21-45 giorni.
 * La mediana, e non la media, perché un singolo ciclo anomalo non deve
 * spostare le previsioni per mesi.
 */
export function durataMediana(periods: Periodo[], dichiarato: number): number {
  const l = ultime(periods);
  return vincola(l.length === 0 ? dichiarato : mediana(l));
}

/** Servono almeno 3 lunghezze misurate per dire qualcosa sulla regolarità. */
export function isIrregolare(periods: Periodo[]): boolean {
  const l = ultime(periods);
  if (l.length < 3) return false;
  return Math.max(...l) - Math.min(...l) > SOGLIA_IRREGOLARITA;
}

export function durataMestruazioni(periods: Periodo[]): number {
  if (periods.length === 0) return DURATA_MESTRUAZIONI_DEFAULT;
  return mediana(periods.map((p) => diffDays(p.inizio, p.fine) + 1));
}

/** La durata prima del vincolo, per sapere se il vincolo è intervenuto. */
const rawDurata = (periods: Periodo[], dichiarato: number): number => {
  const l = ultime(periods);
  return l.length === 0 ? dichiarato : mediana(l);
};

export function previsione(periods: Periodo[], dichiarato: number, oggi: ISODate): Previsione | null {
  if (periods.length === 0) return null;

  const p = ordinati(periods);
  const ultimo = p[p.length - 1];
  const raw = rawDurata(periods, dichiarato);
  const durata = durataMediana(periods, dichiarato);
  const prossimoInizio = addDays(ultimo.inizio, durata);

  // L'ovulazione si stima all'indietro dal prossimo ciclo: la fase luteale
  // è la parte stabile del ciclo, molto più della prima metà.
  const ovulazione = addDays(prossimoInizio, -GIORNI_FASE_LUTEALE);

  return {
    prossimoInizio,
    giorniAlProssimo: diffDays(oggi, prossimoInizio),
    durataMediana: durata,
    durataMestruazioni: durataMestruazioni(periods),
    fertileInizio: addDays(ovulazione, -FERTILE_PRIMA),
    fertileFine: addDays(ovulazione, FERTILE_DOPO),
    irregolare: isIrregolare(periods),
    basataSuStorico: ultime(periods).length > 0,
    durataVincolata: raw !== durata,
  };
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: tutti PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/cycle.ts src/core/cycle.test.ts
git commit -m "feat(core): statistiche del ciclo e previsioni"
```

---

## Task 6: `core/periods.ts` — registrazione e rimozione dei giorni

**Files:**
- Create: `src/core/periods.ts`
- Test: `src/core/periods.test.ts`

**Interfaces:**
- Consumes: `Stato`, `Flusso`, `ISODate` da `src/types`; `addDays`, `diffDays`, `confronta` da `src/core/dates`
- Produces:
  - `registraGiorno(stato: Stato, data: ISODate, flusso: Flusso, nota?: string): Stato`
  - `rimuoviGiorno(stato: Stato, data: ISODate): Stato`
  - `cicloInCorso(stato: Stato, oggi: ISODate): Periodo | null`
  - `giornoDelCiclo(stato: Stato, oggi: ISODate): number | null`

- [ ] **Step 1: Scrivere i test in `src/core/periods.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { registraGiorno, rimuoviGiorno, cicloInCorso, giornoDelCiclo } from './periods';
import type { Stato } from '../types';

function statoVuoto(): Stato {
  return {
    schemaVersion: 1,
    settings: { cicloMedioDichiarato: 28, dataInstallazione: '2026-07-01' },
    periods: [],
    dayLogs: {},
  };
}

describe('registraGiorno', () => {
  it('apre un ciclo nuovo partendo da zero', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-03' });
    expect(s.dayLogs['2026-07-03']).toEqual({ flusso: 'medio' });
  });

  it('non modifica lo stato ricevuto', () => {
    const originale = statoVuoto();
    registraGiorno(originale, '2026-07-03', 'medio');
    expect(originale.periods).toHaveLength(0);
  });

  it('salva la nota quando è presente', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'tanto', 'mal di schiena');
    expect(s.dayLogs['2026-07-03']).toEqual({ flusso: 'tanto', nota: 'mal di schiena' });
  });

  it('estende in avanti il giorno successivo', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-04', 'medio');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0].fine).toBe('2026-07-04');
  });

  it('estende in avanti anche saltando un giorno (tolleranza 2)', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-05', 'leggero');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0].fine).toBe('2026-07-05');
  });

  it('apre un ciclo nuovo oltre la tolleranza', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-06', 'medio');
    expect(s.periods).toHaveLength(2);
  });

  it('estende all indietro se il giorno precede di poco un ciclo esistente', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-04', 'medio');
    s = registraGiorno(s, '2026-07-03', 'leggero');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0].inizio).toBe('2026-07-03');
  });

  it('aggiorna soltanto il diario se il giorno cade dentro un ciclo esistente', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-05', 'medio');
    s = registraGiorno(s, '2026-07-04', 'tanto');
    expect(s.periods).toHaveLength(1);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-05' });
    expect(s.dayLogs['2026-07-04'].flusso).toBe('tanto');
  });

  it('mantiene i cicli ordinati per data', () => {
    let s = registraGiorno(statoVuoto(), '2026-08-01', 'medio');
    s = registraGiorno(s, '2026-07-03', 'medio');
    expect(s.periods.map((p) => p.inizio)).toEqual(['2026-07-03', '2026-08-01']);
  });
});

describe('rimuoviGiorno', () => {
  it('elimina il ciclo se il giorno era l unico', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = rimuoviGiorno(s, '2026-07-03');
    expect(s.periods).toHaveLength(0);
    expect(s.dayLogs['2026-07-03']).toBeUndefined();
  });

  it('accorcia il ciclo se si rimuove l ultimo giorno', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-04', 'medio');
    s = rimuoviGiorno(s, '2026-07-04');
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-03' });
  });

  it('accorcia il ciclo se si rimuove il primo giorno', () => {
    let s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    s = registraGiorno(s, '2026-07-04', 'medio');
    s = rimuoviGiorno(s, '2026-07-03');
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-04', fine: '2026-07-04' });
  });

  it('spezza il ciclo in due se si rimuove un giorno centrale', () => {
    let s = statoVuoto();
    for (const d of ['2026-07-03', '2026-07-04', '2026-07-05']) s = registraGiorno(s, d, 'medio');
    s = rimuoviGiorno(s, '2026-07-04');
    expect(s.periods).toHaveLength(2);
    expect(s.periods[0]).toMatchObject({ inizio: '2026-07-03', fine: '2026-07-03' });
    expect(s.periods[1]).toMatchObject({ inizio: '2026-07-05', fine: '2026-07-05' });
  });

  it('non fa nulla se il giorno non era registrato', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(rimuoviGiorno(s, '2026-09-09').periods).toHaveLength(1);
  });
});

describe('cicloInCorso e giornoDelCiclo', () => {
  it('riconosce un ciclo in corso entro la tolleranza', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(cicloInCorso(s, '2026-07-05')?.inizio).toBe('2026-07-03');
  });
  it('non riconosce un ciclo concluso da giorni', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(cicloInCorso(s, '2026-07-20')).toBeNull();
  });
  it('conta i giorni dall inizio del ciclo in corso, partendo da 1', () => {
    const s = registraGiorno(statoVuoto(), '2026-07-03', 'medio');
    expect(giornoDelCiclo(s, '2026-07-03')).toBe(1);
    expect(giornoDelCiclo(s, '2026-07-05')).toBe(3);
  });
  it('è nullo senza ciclo in corso', () => {
    expect(giornoDelCiclo(statoVuoto(), '2026-07-03')).toBeNull();
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./periods"`

- [ ] **Step 3: Implementare `src/core/periods.ts`**

```ts
import type { Flusso, ISODate, Periodo, Stato } from '../types';
import { confronta, diffDays } from './dates';

/** Giorni di scarto entro cui una registrazione appartiene ancora allo stesso ciclo. */
const TOLLERANZA = 2;

let contatore = 0;
function nuovoId(): string {
  contatore += 1;
  return `p${Date.now().toString(36)}${contatore.toString(36)}`;
}

const ordina = (p: Periodo[]) => [...p].sort((a, b) => confronta(a.inizio, b.inizio));

/**
 * Deriva i cicli dal diario.
 *
 * I giorni registrati vengono ordinati e raggruppati: due giorni consecutivi
 * appartengono allo stesso ciclo se distano al massimo TOLLERANZA. Ogni gruppo
 * diventa un ciclo che va dal suo primo al suo ultimo giorno.
 *
 * Derivare invece di costruire rende strutturali tre garanzie che, mantenute a
 * mano, si romperebbero:
 * - `inizio` e `fine` sono sempre giorni realmente registrati;
 * - due cicli vicini non possono restare separati per errore;
 * - a parità di diario lo stato è sempre lo stesso, comunque ci si sia arrivati.
 *
 * Gli id dei cicli esistenti vengono riusati quando l'inizio coincide.
 */
function normalizza(dayLogs: Record<ISODate, unknown>, periodsEsistenti: Periodo[]): Periodo[] {
  const date = Object.keys(dayLogs).sort();
  if (date.length === 0) return [];

  const gruppi: ISODate[][] = [];
  let gruppo: ISODate[] = [date[0]];

  for (let i = 1; i < date.length; i++) {
    if (diffDays(date[i - 1], date[i]) <= TOLLERANZA) {
      gruppo.push(date[i]);
    } else {
      gruppi.push(gruppo);
      gruppo = [date[i]];
    }
  }
  gruppi.push(gruppo);

  return ordina(
    gruppi.map((g) => {
      const inizio = g[0];
      const fine = g[g.length - 1];
      return { id: periodsEsistenti.find((p) => p.inizio === inizio)?.id ?? nuovoId(), inizio, fine };
    }),
  );
}

/**
 * Registra un giorno di flusso, poi rideriva i cicli.
 *
 * La tolleranza di TOLLERANZA giorni serve a un caso reale: dimenticare di
 * segnare un giorno non deve spezzare un ciclo in due, perché due `inizio`
 * fasulli falserebbero tutte le medie successive.
 */
export function registraGiorno(stato: Stato, data: ISODate, flusso: Flusso, nota?: string): Stato {
  const dayLogs = { ...stato.dayLogs, [data]: nota ? { flusso, nota } : { flusso } };
  return { ...stato, dayLogs, periods: normalizza(dayLogs, stato.periods) };
}

/**
 * Toglie un giorno dal diario, poi rideriva i cicli. Il ciclo si spezza solo se
 * il buco lasciato supera la tolleranza.
 */
export function rimuoviGiorno(stato: Stato, data: ISODate): Stato {
  if (!stato.dayLogs[data]) return stato;

  const dayLogs = { ...stato.dayLogs };
  delete dayLogs[data];

  return { ...stato, dayLogs, periods: normalizza(dayLogs, stato.periods) };
}

/** Il ciclo è "in corso" se l'ultimo giorno registrato dista non più di TOLLERANZA da oggi. */
export function cicloInCorso(stato: Stato, oggi: ISODate): Periodo | null {
  const p = ordina(stato.periods).at(-1);
  if (!p) return null;
  const scarto = diffDays(p.fine, oggi);
  return scarto >= 0 && scarto <= TOLLERANZA ? p : null;
}

/** Numero del giorno all'interno del ciclo in corso, a partire da 1. */
export function giornoDelCiclo(stato: Stato, oggi: ISODate): number | null {
  const p = cicloInCorso(stato, oggi);
  return p ? diffDays(p.inizio, oggi) + 1 : null;
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: tutti PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/periods.ts src/core/periods.test.ts
git commit -m "feat(core): registrazione e rimozione dei giorni di ciclo"
```

---

## Task 7: Persistenza e store

**Files:**
- Create: `src/storage/db.ts`, `src/store.ts`
- Test: `src/storage/db.test.ts`

**Interfaces:**
- Consumes: `Stato` da `src/types`; `oggi` da `src/core/dates`; `registraGiorno`, `rimuoviGiorno` da `src/core/periods`
- Produces:
  - `statoIniziale(dataInstallazione: ISODate): Stato`
  - `migra(grezzo: unknown, dataInstallazione: ISODate): Stato`
  - `caricaStato(): Promise<Stato>` / `salvaStato(s: Stato): Promise<void>`
  - `useStore()` con `{ stato, pronto, carica, registra, rimuovi, completaOnboarding, aggiornaDurataMedia, sostituisciStato, tab, setTab }`

- [ ] **Step 1: Scrivere i test in `src/storage/db.test.ts`**

Si testa `migra`, che è pura; `caricaStato`/`salvaStato` sono un involucro sottile attorno a `idb-keyval` e non hanno logica propria da verificare.

```ts
import { describe, it, expect } from 'vitest';
import { statoIniziale, migra } from './db';

describe('statoIniziale', () => {
  it('parte vuoto con i valori predefiniti', () => {
    const s = statoIniziale('2026-07-31');
    expect(s.schemaVersion).toBe(1);
    expect(s.settings.cicloMedioDichiarato).toBe(28);
    expect(s.settings.dataInstallazione).toBe('2026-07-31');
    expect(s.periods).toEqual([]);
    expect(s.dayLogs).toEqual({});
  });
});

describe('migra', () => {
  it('restituisce lo stato iniziale se non c è nulla di salvato', () => {
    expect(migra(undefined, '2026-07-31').periods).toEqual([]);
  });
  it('restituisce lo stato iniziale se il salvataggio è irriconoscibile', () => {
    expect(migra({ pippo: 1 }, '2026-07-31').schemaVersion).toBe(1);
  });
  it('conserva uno stato valido', () => {
    const valido = {
      schemaVersion: 1,
      settings: { cicloMedioDichiarato: 30, dataInstallazione: '2026-01-01' },
      periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }],
      dayLogs: { '2026-07-03': { flusso: 'medio' } },
    };
    expect(migra(valido, '2026-07-31')).toEqual(valido);
  });
  it('reintegra i campi mancanti senza perdere i dati presenti', () => {
    const parziale = { schemaVersion: 1, periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }] };
    const s = migra(parziale, '2026-07-31');
    expect(s.periods).toHaveLength(1);
    expect(s.settings.cicloMedioDichiarato).toBe(28);
    expect(s.dayLogs).toEqual({});
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./db"`

- [ ] **Step 3: Implementare `src/storage/db.ts`**

```ts
import { get, set } from 'idb-keyval';
import type { ISODate, Periodo, Stato } from '../types';
import { oggi } from '../core/dates';

const CHIAVE = 'bibiciclo:v1';
const VERSIONE_SCHEMA = 1;

export function statoIniziale(dataInstallazione: ISODate): Stato {
  return {
    schemaVersion: VERSIONE_SCHEMA,
    settings: { cicloMedioDichiarato: 28, dataInstallazione },
    periods: [],
    dayLogs: {},
  };
}

function periodiValidi(v: unknown): Periodo[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (p): p is Periodo =>
      !!p && typeof p.id === 'string' && typeof p.inizio === 'string' && typeof p.fine === 'string',
  );
}

/**
 * Normalizza qualunque cosa fosse salvata in uno `Stato` valido.
 * Un dato corrotto non deve mai impedire l'avvio dell'app: nel dubbio si
 * conserva ciò che è riconoscibile e si reintegrano i campi mancanti.
 */
export function migra(grezzo: unknown, dataInstallazione: ISODate): Stato {
  const base = statoIniziale(dataInstallazione);
  if (!grezzo || typeof grezzo !== 'object') return base;

  const g = grezzo as Partial<Stato>;
  return {
    schemaVersion: VERSIONE_SCHEMA,
    settings: {
      cicloMedioDichiarato:
        typeof g.settings?.cicloMedioDichiarato === 'number'
          ? g.settings.cicloMedioDichiarato
          : base.settings.cicloMedioDichiarato,
      dataInstallazione:
        typeof g.settings?.dataInstallazione === 'string'
          ? g.settings.dataInstallazione
          : dataInstallazione,
    },
    periods: periodiValidi(g.periods),
    dayLogs: g.dayLogs && typeof g.dayLogs === 'object' ? g.dayLogs : {},
  };
}

export async function caricaStato(): Promise<Stato> {
  return migra(await get(CHIAVE), oggi());
}

export async function salvaStato(stato: Stato): Promise<void> {
  await set(CHIAVE, stato);
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: tutti PASS

- [ ] **Step 5: Implementare `src/store.ts`**

Lo store non calcola nulla: conserva lo stato, delega a `core/` e persiste dopo ogni modifica.

```ts
import { create } from 'zustand';
import type { Flusso, ISODate, Stato } from './types';
import { oggi } from './core/dates';
import { registraGiorno, rimuoviGiorno } from './core/periods';
import { caricaStato, salvaStato, statoIniziale } from './storage/db';

export type Tab = 'oggi' | 'calendario' | 'impostazioni';

interface Store {
  stato: Stato;
  pronto: boolean;
  tab: Tab;
  carica: () => Promise<void>;
  setTab: (t: Tab) => void;
  registra: (data: ISODate, flusso: Flusso, nota?: string) => Promise<void>;
  rimuovi: (data: ISODate) => Promise<void>;
  completaOnboarding: (ultimoInizio: ISODate, cicloMedio: number) => Promise<void>;
  aggiornaDurataMedia: (giorni: number) => Promise<void>;
  sostituisciStato: (nuovo: Stato) => Promise<void>;
}

export const useStore = create<Store>((set, get) => {
  async function applica(nuovo: Stato) {
    set({ stato: nuovo });
    await salvaStato(nuovo);
  }

  return {
    stato: statoIniziale(oggi()),
    pronto: false,
    tab: 'oggi',

    carica: async () => {
      set({ stato: await caricaStato(), pronto: true });
    },

    setTab: (tab) => set({ tab }),

    registra: async (data, flusso, nota) => {
      await applica(registraGiorno(get().stato, data, flusso, nota));
    },

    rimuovi: async (data) => {
      await applica(rimuoviGiorno(get().stato, data));
    },

    completaOnboarding: async (ultimoInizio, cicloMedio) => {
      const conImpostazioni: Stato = {
        ...get().stato,
        settings: { ...get().stato.settings, cicloMedioDichiarato: cicloMedio },
      };
      await applica(registraGiorno(conImpostazioni, ultimoInizio, 'medio'));
    },

    aggiornaDurataMedia: async (giorni) => {
      const s = get().stato;
      await applica({ ...s, settings: { ...s.settings, cicloMedioDichiarato: giorni } });
    },

    sostituisciStato: async (nuovo) => {
      await applica(nuovo);
    },
  };
});
```

- [ ] **Step 6: Verificare che la compilazione passi**

Run: `npm run build`
Expected: build completata senza errori TypeScript

- [ ] **Step 7: Commit**

```bash
git add src/storage/db.ts src/storage/db.test.ts src/store.ts
git commit -m "feat: persistenza su IndexedDB e store Zustand"
```

---

## Task 8: Guscio dell'applicazione e barra delle schede

**Files:**
- Create: `src/components/TabBar.tsx`
- Modify: `src/App.tsx` (sostituisce la schermata di prova della Task 3)

**Interfaces:**
- Consumes: `useStore`, `Tab` da `src/store`
- Produces: `<TabBar />`; `App` che carica lo stato e mostra la schermata corrispondente alla tab attiva

- [ ] **Step 1: Creare `src/components/TabBar.tsx`**

Il `pb-[env(safe-area-inset-bottom)]` evita che la barra finisca sotto l'indicatore Home dell'iPhone.

```tsx
import { useStore, type Tab } from '../store';

const VOCI: Array<{ id: Tab; icona: string; testo: string }> = [
  { id: 'oggi', icona: '☀', testo: 'Oggi' },
  { id: 'calendario', icona: '▤', testo: 'Calendario' },
  { id: 'impostazioni', icona: '⚙', testo: 'Impostazioni' },
];

export default function TabBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);

  return (
    <nav className="flex shrink-0 border-t border-bordo bg-white pb-[env(safe-area-inset-bottom)]">
      {VOCI.map((v) => (
        <button
          key={v.id}
          onClick={() => setTab(v.id)}
          className={`flex-1 py-2.5 text-[10px] font-semibold ${tab === v.id ? 'text-rosa' : 'text-tenue'}`}
        >
          <span className="block text-lg leading-6">{v.icona}</span>
          {v.testo}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Riscrivere `src/App.tsx`**

Le schermate arrivano nelle task successive; per ora si usano segnaposto che verranno sostituiti uno alla volta.

```tsx
import { useEffect } from 'react';
import { useStore } from './store';
import TabBar from './components/TabBar';

export default function App() {
  const pronto = useStore((s) => s.pronto);
  const tab = useStore((s) => s.tab);
  const carica = useStore((s) => s.carica);
  const periods = useStore((s) => s.stato.periods);

  useEffect(() => {
    void carica();
  }, [carica]);

  if (!pronto) return <div className="p-6 text-tenue">Un attimo…</div>;

  if (periods.length === 0) return <div className="p-6">Onboarding (Task 9)</div>;

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {tab === 'oggi' && <div>Oggi (Task 10)</div>}
        {tab === 'calendario' && <div>Calendario (Task 12)</div>}
        {tab === 'impostazioni' && <div>Impostazioni (Task 15)</div>}
      </main>
      <TabBar />
    </div>
  );
}
```

- [ ] **Step 3: Verificare nel browser**

Run: `npm run dev`
Expected: compare "Onboarding (Task 9)". Nella console del browser non devono comparire errori.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/TabBar.tsx
git commit -m "feat(ui): guscio dell'app e barra delle schede"
```

---

## Task 9: Primo avvio

**Files:**
- Create: `src/components/Avvertenza.tsx`, `src/screens/Onboarding.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useStore().completaOnboarding`; `oggi`, `addDays`, `formattaLunga`, `giorniDelMese`, `giornoSettimana`, `nomeMese` da `src/core/dates`
- Produces: `<Avvertenza breve?: boolean />`, `<Onboarding />`

- [ ] **Step 1: Creare `src/components/Avvertenza.tsx`**

Il testo è quello della specifica §6 e non va riformulato.

```tsx
export default function Avvertenza({ breve = false }: { breve?: boolean }) {
  if (breve) {
    return (
      <p className="text-[11px] leading-snug text-tenue">
        Sono stime, non certezze. BibiCiclo non è un metodo contraccettivo.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-sm leading-relaxed text-inchiostro/80">
      <p>
        BibiCiclo <b>stima, non misura</b>. Le previsioni si basano sui tuoi cicli passati e
        possono sbagliare anche di parecchi giorni.
      </p>
      <p>
        <b>Non è un metodo contraccettivo</b> e non sostituisce il parere di un medico. Il metodo
        del calendario ha un tasso di fallimento nell'uso reale intorno al 12–24%.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Creare `src/screens/Onboarding.tsx`**

```tsx
import { useState } from 'react';
import { addDays, formattaLunga, giorniDelMese, giornoSettimana, nomeMese, oggi } from '../core/dates';
import { useStore } from '../store';
import Avvertenza from '../components/Avvertenza';

export default function Onboarding() {
  const [passo, setPasso] = useState(0);
  const [ultimoInizio, setUltimoInizio] = useState(addDays(oggi(), -14));
  const [cicloMedio, setCicloMedio] = useState(28);
  const completa = useStore((s) => s.completaOnboarding);

  return (
    <div className="flex h-full flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {passo === 0 && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight">Ciao Bibi 💗</h1>
          <p className="mt-3 text-base text-inchiostro/70">
            I tuoi dati restano su questo telefono. Non vengono inviati da nessuna parte,
            a nessuno.
          </p>
          <div className="mt-6 rounded-2xl border border-bordo bg-white p-4">
            <Avvertenza />
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setPasso(1)}
            className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
          >
            Ho capito, cominciamo
          </button>
        </>
      )}

      {passo === 1 && (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Quando è iniziato l'ultimo ciclo?
          </h1>
          <p className="mt-2 text-sm text-tenue">Tocca il giorno sul calendario.</p>
          <div className="mt-5">
            <SelettoreData valore={ultimoInizio} onCambia={setUltimoInizio} />
          </div>
          <div className="flex-1" />
          <p className="mb-3 text-center text-sm">
            Hai scelto <b>{formattaLunga(ultimoInizio)}</b>
          </p>
          <button
            onClick={() => setPasso(2)}
            className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
          >
            Avanti
          </button>
        </>
      )}

      {passo === 2 && (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Ogni quanti giorni ti viene, più o meno?
          </h1>
          <p className="mt-2 text-sm text-tenue">
            Se non lo sai, lascia 28: l'app imparerà da sola col tempo.
          </p>
          <div className="mt-10 flex items-center justify-center gap-7">
            <button
              onClick={() => setCicloMedio((n) => Math.max(21, n - 1))}
              className="h-16 w-16 rounded-full border border-bordo bg-white text-3xl font-bold text-rosa"
            >
              −
            </button>
            <div className="text-center">
              <div className="text-6xl font-extrabold text-rosa">{cicloMedio}</div>
              <div className="text-xs uppercase tracking-wider text-tenue">giorni</div>
            </div>
            <button
              onClick={() => setCicloMedio((n) => Math.min(45, n + 1))}
              className="h-16 w-16 rounded-full border border-bordo bg-white text-3xl font-bold text-rosa"
            >
              +
            </button>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => void completa(ultimoInizio, cicloMedio)}
            className="w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
          >
            Fatto
          </button>
        </>
      )}
    </div>
  );
}

/** Calendario compatto per scegliere una data passata. */
function SelettoreData({ valore, onCambia }: { valore: string; onCambia: (d: string) => void }) {
  const [anno, setAnno] = useState(Number(valore.slice(0, 4)));
  const [mese, setMese] = useState(Number(valore.slice(5, 7)));
  const giorni = giorniDelMese(anno, mese);
  const vuoti = giornoSettimana(giorni[0]);
  const limite = oggi();

  function spostaMese(delta: number) {
    const m = mese + delta;
    if (m < 1) { setMese(12); setAnno(anno - 1); }
    else if (m > 12) { setMese(1); setAnno(anno + 1); }
    else setMese(m);
  }

  return (
    <div className="rounded-2xl border border-bordo bg-white p-3">
      <div className="mb-2 flex items-center justify-between px-1 text-sm font-bold">
        <button onClick={() => spostaMese(-1)} className="px-3 py-1 text-rosa">‹</button>
        <span>{nomeMese(mese)} {anno}</span>
        <button onClick={() => spostaMese(1)} className="px-3 py-1 text-rosa">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-tenue">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, i) => <div key={i}>{g}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: vuoti }, (_, i) => <div key={`v${i}`} />)}
        {giorni.map((g) => {
          const futuro = g > limite;
          const scelto = g === valore;
          return (
            <button
              key={g}
              disabled={futuro}
              onClick={() => onCambia(g)}
              className={`aspect-square rounded-full text-sm ${
                scelto ? 'bg-rosa font-bold text-white' : futuro ? 'text-tenue/30' : 'text-inchiostro'
              }`}
            >
              {Number(g.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Collegare l'onboarding in `src/App.tsx`**

Sostituire la riga segnaposto:

```tsx
import Onboarding from './screens/Onboarding';
// ...
if (periods.length === 0) return <Onboarding />;
```

- [ ] **Step 4: Verificare nel browser**

Run: `npm run dev`

Percorrere i tre passaggi e verificare che al termine compaia il guscio con la barra delle schede. Ricaricare la pagina: l'onboarding non deve ripresentarsi, perché lo stato è stato salvato.

Per ripetere la prova, svuotare IndexedDB da DevTools → Application → Storage.

- [ ] **Step 5: Commit**

```bash
git add src/components/Avvertenza.tsx src/screens/Onboarding.tsx src/App.tsx
git commit -m "feat(ui): primo avvio con avvertenza e due domande"
```

---

## Task 10: Foglio di registrazione

Viene prima della schermata Oggi perché quest'ultima lo usa.

**Files:**
- Create: `src/components/FoglioRegistrazione.tsx`

**Interfaces:**
- Consumes: `useStore().registra`, `useStore().rimuovi`, `useStore().stato.dayLogs`; `formattaLunga` da `src/core/dates`
- Produces: `<FoglioRegistrazione data={ISODate} onChiudi={() => void} onScegliGiorno={() => void} />`

- [ ] **Step 1: Creare `src/components/FoglioRegistrazione.tsx`**

Il flusso arriva preselezionato su "medio": nel caso tipico l'operazione si riduce a un solo tocco su Salva.

```tsx
import { useState } from 'react';
import type { Flusso, ISODate } from '../types';
import { formattaLunga } from '../core/dates';
import { useStore } from '../store';

const LIVELLI: Array<{ id: Flusso; gocce: string; testo: string }> = [
  { id: 'leggero', gocce: '💧', testo: 'Leggero' },
  { id: 'medio', gocce: '💧💧', testo: 'Medio' },
  { id: 'tanto', gocce: '💧💧💧', testo: 'Tanto' },
];

interface Props {
  data: ISODate;
  onChiudi: () => void;
  onScegliGiorno: () => void;
}

export default function FoglioRegistrazione({ data, onChiudi, onScegliGiorno }: Props) {
  const esistente = useStore((s) => s.stato.dayLogs[data]);
  const registra = useStore((s) => s.registra);
  const rimuovi = useStore((s) => s.rimuovi);

  const [flusso, setFlusso] = useState<Flusso>(esistente?.flusso ?? 'medio');
  const [nota, setNota] = useState(esistente?.nota ?? '');

  async function salva() {
    await registra(data, flusso, nota.trim() || undefined);
    onChiudi();
  }

  async function elimina() {
    await rimuovi(data);
    onChiudi();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-inchiostro/45" onClick={onChiudi} />

      <div className="relative rounded-t-3xl bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bordo" />

        <h2 className="text-center text-lg font-extrabold">Ciclo di questo giorno</h2>
        <p className="mb-4 text-center text-xs text-tenue">{formattaLunga(data)}</p>

        <div className="flex gap-2">
          {LIVELLI.map((l) => (
            <button
              key={l.id}
              onClick={() => setFlusso(l.id)}
              className={`flex-1 rounded-2xl border py-3 text-xs font-bold ${
                flusso === l.id
                  ? 'border-rosa bg-rosa-chiaro text-rosa-scuro'
                  : 'border-bordo text-inchiostro/70'
              }`}
            >
              <span className="mb-1 block text-base">{l.gocce}</span>
              {l.testo}
            </button>
          ))}
        </div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Aggiungi una nota…"
          rows={2}
          className="mt-3 w-full resize-none rounded-2xl border border-bordo p-3 text-sm outline-none placeholder:text-tenue/70 focus:border-rosa"
        />

        <button
          onClick={() => void salva()}
          className="mt-3 w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
        >
          Salva
        </button>

        <button onClick={onScegliGiorno} className="mt-3 w-full text-center text-sm text-tenue">
          È già iniziato? Scegli il giorno giusto ›
        </button>

        {esistente && (
          <button
            onClick={() => void elimina()}
            className="mt-3 w-full text-center text-sm font-semibold text-rosa-scuro"
          >
            Rimuovi questo giorno
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificare la compilazione**

Run: `npm run build`
Expected: nessun errore TypeScript

- [ ] **Step 3: Commit**

```bash
git add src/components/FoglioRegistrazione.tsx
git commit -m "feat(ui): foglio di registrazione del flusso"
```

---

## Task 11: Schermata Oggi

**Files:**
- Create: `src/screens/Oggi.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `previsione` da `src/core/cycle`; `cicloInCorso`, `giornoDelCiclo` da `src/core/periods`; `<FoglioRegistrazione />`; `useStore`
- Produces: `<Oggi />`

- [ ] **Step 1: Creare `src/screens/Oggi.tsx`**

La frase è la risposta scritta a parole. Tre casi distinti: ciclo in corso, ciclo in ritardo, attesa normale.

```tsx
import { useMemo, useState } from 'react';
import { addDays, formattaLunga, giornoSettimana, oggi } from '../core/dates';
import { previsione } from '../core/cycle';
import { cicloInCorso, giornoDelCiclo } from '../core/periods';
import { useStore } from '../store';
import FoglioRegistrazione from '../components/FoglioRegistrazione';
import Avvertenza from '../components/Avvertenza';

const INIZIALI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function Oggi() {
  const stato = useStore((s) => s.stato);
  const setTab = useStore((s) => s.setTab);
  const [foglio, setFoglio] = useState<string | null>(null);

  const g = oggi();
  const p = useMemo(
    () => previsione(stato.periods, stato.settings.cicloMedioDichiarato, g),
    [stato.periods, stato.settings.cicloMedioDichiarato, g],
  );
  const inCorso = cicloInCorso(stato, g);
  const giorno = giornoDelCiclo(stato, g);
  const registratoOggi = Boolean(stato.dayLogs[g]);

  const settimana = useMemo(() => {
    const lunedi = addDays(g, -giornoSettimana(g));
    return Array.from({ length: 7 }, (_, i) => addDays(lunedi, i));
  }, [g]);

  const fertile = (d: string) => !!p && d >= p.fertileInizio && d <= p.fertileFine;

  return (
    <>
      <p className="text-xs text-tenue">Ciao Bibi 💗</p>

      {inCorso ? (
        <>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Sei al <span className="text-rosa">giorno {giorno}</span>
            <br />del ciclo
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-inchiostro/65">
            Iniziato {formattaLunga(inCorso.inizio)}.
          </p>
        </>
      ) : p && p.giorniAlProssimo < 0 ? (
        <>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Il ciclo è in ritardo
            <br />di <span className="text-rosa">{-p.giorniAlProssimo} giorni</span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-inchiostro/65">
            Qualche giorno di scarto è normale e capita a tutte.
          </p>
        </>
      ) : p ? (
        <>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight">
            Il ciclo arriva
            <br />tra <span className="text-rosa">{p.giorniAlProssimo} giorni</span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-inchiostro/65">
            {p.irregolare ? 'Intorno a ' : ''}
            {formattaLunga(p.prossimoInizio)}.
            <br />
            {fertile(g) ? (
              <>Questi giorni sei nel <b className="text-verde-scuro">periodo fertile</b>.</>
            ) : (
              <>Periodo fertile dal {formattaLunga(p.fertileInizio)}.</>
            )}
          </p>
        </>
      ) : null}

      {p?.irregolare && (
        <div className="mt-4 rounded-2xl border border-bordo bg-white p-3 text-[11px] leading-snug text-inchiostro/70">
          I tuoi ultimi cicli sono stati piuttosto irregolari, quindi questa previsione — e
          soprattutto il periodo fertile — è poco affidabile.
        </div>
      )}

      {p?.durataVincolata && (
        <div className="mt-3 rounded-2xl border border-bordo bg-white p-3 text-[11px] leading-snug text-inchiostro/70">
          I tuoi cicli risultano più {p.durataMediana === 45 ? 'lunghi' : 'corti'} di quelli che
          l'app sa prevedere bene, quindi sta usando {p.durataMediana} giorni. Se ti sembra
          sbagliato, correggi la durata dalle impostazioni.
        </div>
      )}

      <div className="mt-6 flex gap-1.5">
        {settimana.map((d, i) => {
          const oggiQ = d === g;
          const f = fertile(d);
          return (
            <div key={d} className="flex-1 text-center">
              <div className="text-[9px] text-tenue">{INIZIALI[i]}</div>
              <div
                className={`mt-1 rounded-xl py-1.5 text-sm font-semibold ${
                  oggiQ ? 'bg-rosa text-white' : f ? 'bg-verde text-verde-scuro' : 'bg-rosa-chiaro/50 text-inchiostro/70'
                }`}
              >
                {Number(d.slice(8, 10))}
              </div>
            </div>
          );
        })}
      </div>

      {inCorso && !registratoOggi && (
        <p className="mt-5 rounded-2xl bg-rosa-chiaro px-4 py-3 text-[13px] font-semibold text-rosa-scuro">
          Non hai ancora segnato oggi.
        </p>
      )}

      <button
        onClick={() => setFoglio(g)}
        className="mt-5 w-full rounded-2xl bg-rosa py-4 text-base font-bold text-white"
      >
        🩸 {registratoOggi ? 'Modifica il ciclo di oggi' : 'Oggi mi è venuto'}
      </button>

      <button onClick={() => setTab('calendario')} className="mt-4 w-full text-center text-[13px] text-tenue">
        Vedi il calendario ›
      </button>

      <div className="mt-6 pb-4">
        <Avvertenza breve />
      </div>

      {foglio && (
        <FoglioRegistrazione
          data={foglio}
          onChiudi={() => setFoglio(null)}
          onScegliGiorno={() => {
            setFoglio(null);
            setTab('calendario');
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Collegare in `src/App.tsx`**

```tsx
import Oggi from './screens/Oggi';
// ...
{tab === 'oggi' && <Oggi />}
```

- [ ] **Step 3: Verificare nel browser**

Run: `npm run dev`

Completare l'onboarding scegliendo una data di circa due settimane fa e verificare che compaia "Il ciclo arriva tra N giorni" con N plausibile. Premere il bottone, salvare, e verificare che la frase diventi "Sei al giorno 1 del ciclo".

Verificare anche il caso del ritardo scegliendo, in un onboarding ripetuto, una data di 35 giorni fa.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Oggi.tsx src/App.tsx
git commit -m "feat(ui): schermata Oggi"
```

---

## Task 12: Calendario

**Files:**
- Create: `src/screens/Calendario.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `giorniDelMese`, `giornoSettimana`, `nomeMese`, `addDays`, `oggi` da `src/core/dates`; `previsione` da `src/core/cycle`; `<FoglioRegistrazione />`; `useStore`
- Produces: `<Calendario />`

- [ ] **Step 1: Creare `src/screens/Calendario.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { addDays, giorniDelMese, giornoSettimana, nomeMese, oggi } from '../core/dates';
import { previsione } from '../core/cycle';
import { useStore } from '../store';
import FoglioRegistrazione from '../components/FoglioRegistrazione';

export default function Calendario() {
  const stato = useStore((s) => s.stato);
  const g = oggi();
  const [anno, setAnno] = useState(Number(g.slice(0, 4)));
  const [mese, setMese] = useState(Number(g.slice(5, 7)));
  const [foglio, setFoglio] = useState<string | null>(null);

  const p = useMemo(
    () => previsione(stato.periods, stato.settings.cicloMedioDichiarato, g),
    [stato.periods, stato.settings.cicloMedioDichiarato, g],
  );

  /** Giorni del prossimo ciclo previsto, per la campitura tratteggiata. */
  const previsti = useMemo(() => {
    if (!p) return new Set<string>();
    return new Set(
      Array.from({ length: p.durataMestruazioni }, (_, i) => addDays(p.prossimoInizio, i)),
    );
  }, [p]);

  const giorni = giorniDelMese(anno, mese);
  const vuoti = giornoSettimana(giorni[0]);

  function spostaMese(delta: number) {
    const m = mese + delta;
    if (m < 1) { setMese(12); setAnno(anno - 1); }
    else if (m > 12) { setMese(1); setAnno(anno + 1); }
    else setMese(m);
  }

  function classi(d: string): string {
    const bordoOggi = d === g ? ' outline outline-2 outline-inchiostro' : '';
    if (stato.dayLogs[d]) return 'bg-rosa font-bold text-white' + bordoOggi;
    if (previsti.has(d)) return 'border border-dashed border-rosa bg-rosa-chiaro text-rosa-scuro' + bordoOggi;
    if (p && d >= p.fertileInizio && d <= p.fertileFine) return 'bg-verde text-verde-scuro' + bordoOggi;
    return 'text-inchiostro/75' + bordoOggi;
  }

  return (
    <>
      <div className="flex items-center justify-between text-base font-bold">
        <button onClick={() => spostaMese(-1)} className="px-4 py-2 text-rosa">‹</button>
        <span>{nomeMese(mese)} {anno}</span>
        <button onClick={() => spostaMese(1)} className="px-4 py-2 text-rosa">›</button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-tenue">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x, i) => <div key={i}>{x}</div>)}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: vuoti }, (_, i) => <div key={`v${i}`} />)}
        {giorni.map((d) => (
          <button
            key={d}
            onClick={() => setFoglio(d)}
            className={`aspect-square rounded-full text-[13px] ${classi(d)}`}
          >
            {Number(d.slice(8, 10))}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-inchiostro/70">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-rosa" />ciclo
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-verde" />fertile
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-rosa bg-rosa-chiaro" />previsto
        </span>
      </div>

      <p className="mt-4 pb-4 text-[13px] text-tenue">
        Tocca un giorno qualsiasi per segnarlo o correggerlo.
      </p>

      {foglio && (
        <FoglioRegistrazione
          data={foglio}
          onChiudi={() => setFoglio(null)}
          onScegliGiorno={() => setFoglio(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Collegare in `src/App.tsx`**

```tsx
import Calendario from './screens/Calendario';
// ...
{tab === 'calendario' && <Calendario />}
```

- [ ] **Step 3: Verificare nel browser**

Run: `npm run dev`

Verificare: i giorni registrati sono pieni di rosa, la finestra fertile è verde, il prossimo ciclo previsto è tratteggiato, oggi ha il contorno scuro. Toccare un giorno passato, salvare, e verificare che il colore cambi e che la schermata Oggi si aggiorni di conseguenza. Toccare di nuovo lo stesso giorno e usare "Rimuovi questo giorno": il colore deve tornare neutro.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Calendario.tsx src/App.tsx
git commit -m "feat(ui): vista calendario mensile"
```

---

## Task 13: Generazione del file `.ics`

**Files:**
- Create: `src/calendar/ics.ts`
- Test: `src/calendar/ics.test.ts`

**Interfaces:**
- Consumes: `Periodo`, `ISODate` da `src/types`; `addDays` da `src/core/dates`; `previsione`, `durataMediana`, `durataMestruazioni` da `src/core/cycle`
- Produces:
  - `eventiPrevisti(periods, dichiarato, oggi, quanti?): EventoPrevisto[]`
  - `generaIcs(eventi: EventoPrevisto[]): string`
  - `interface EventoPrevisto { uid; titolo; inizio; fineEsclusa; tipo: 'ciclo' | 'fertile' }`

- [ ] **Step 1: Scrivere i test in `src/calendar/ics.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { eventiPrevisti, generaIcs } from './ics';
import type { Periodo } from '../types';

const unCiclo: Periodo[] = [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }];

describe('eventiPrevisti', () => {
  it('è vuoto senza cicli registrati', () => {
    expect(eventiPrevisti([], 28, '2026-07-16')).toEqual([]);
  });

  it('genera sei cicli previsti e sei finestre fertili', () => {
    const e = eventiPrevisti(unCiclo, 28, '2026-07-16');
    expect(e.filter((x) => x.tipo === 'ciclo')).toHaveLength(6);
    expect(e.filter((x) => x.tipo === 'fertile')).toHaveLength(6);
  });

  it('colloca il primo ciclo previsto alla data attesa', () => {
    const e = eventiPrevisti(unCiclo, 28, '2026-07-16');
    expect(e[0]).toMatchObject({ tipo: 'ciclo', inizio: '2026-07-31' });
  });

  it('distanzia i cicli successivi della durata mediana', () => {
    const cicli = eventiPrevisti(unCiclo, 28, '2026-07-16').filter((x) => x.tipo === 'ciclo');
    expect(cicli[1].inizio).toBe('2026-08-28');
  });

  it('usa una fine esclusiva, come richiede il formato iCalendar', () => {
    const primo = eventiPrevisti(unCiclo, 28, '2026-07-16')[0];
    // 5 giorni di mestruazioni a partire dal 31 luglio: fine esclusa il 5 agosto
    expect(primo.fineEsclusa).toBe('2026-08-05');
  });

  it('assegna UID deterministici, così una nuova esportazione aggiorna invece di duplicare', () => {
    const a = eventiPrevisti(unCiclo, 28, '2026-07-16');
    const b = eventiPrevisti(unCiclo, 28, '2026-07-20');
    expect(a[0].uid).toBe(b[0].uid);
  });
});

describe('generaIcs', () => {
  const ics = () => generaIcs(eventiPrevisti(unCiclo, 28, '2026-07-16'));

  it('produce un calendario valido', () => {
    expect(ics()).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics().trimEnd()).toMatch(/END:VCALENDAR$/);
  });

  it('usa terminatori di riga CRLF come impone lo standard', () => {
    expect(ics()).toContain('\r\n');
    expect(ics()).not.toMatch(/[^\r]\n/);
  });

  it('scrive eventi di giornata intera', () => {
    expect(ics()).toContain('DTSTART;VALUE=DATE:20260731');
    expect(ics()).toContain('DTEND;VALUE=DATE:20260805');
  });

  it('include un avviso a due giorni di anticipo per il ciclo', () => {
    expect(ics()).toContain('TRIGGER:-P2D');
  });

  it('contiene un VEVENT per ogni evento', () => {
    const n = ics().match(/BEGIN:VEVENT/g)!.length;
    expect(n).toBe(12);
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./ics"`

- [ ] **Step 3: Implementare `src/calendar/ics.ts`**

```ts
import type { ISODate, Periodo } from '../types';
import { addDays } from '../core/dates';
import { durataMediana, durataMestruazioni, previsione } from '../core/cycle';

const CICLI_ESPORTATI = 6;
const GIORNI_FASE_LUTEALE = 14;
const FERTILE_PRIMA = 5;
const FERTILE_DOPO = 1;

export interface EventoPrevisto {
  uid: string;
  titolo: string;
  inizio: ISODate;
  /** Il giorno successivo all'ultimo incluso: iCalendar vuole DTEND esclusivo. */
  fineEsclusa: ISODate;
  tipo: 'ciclo' | 'fertile';
}

const compatta = (d: ISODate) => d.replace(/-/g, '');

/**
 * Prossimi cicli previsti e relative finestre fertili.
 * Gli UID sono derivati dalla data, così riesportare aggiorna gli eventi
 * esistenti nel calendario anziché duplicarli.
 */
export function eventiPrevisti(
  periods: Periodo[],
  dichiarato: number,
  oggi: ISODate,
  quanti = CICLI_ESPORTATI,
): EventoPrevisto[] {
  const p = previsione(periods, dichiarato, oggi);
  if (!p) return [];

  const durata = durataMediana(periods, dichiarato);
  const mestruazioni = durataMestruazioni(periods);
  const eventi: EventoPrevisto[] = [];

  for (let i = 0; i < quanti; i++) {
    const inizio = addDays(p.prossimoInizio, durata * i);
    eventi.push({
      uid: `ciclo-${compatta(inizio)}@bibiciclo`,
      titolo: 'Ciclo previsto',
      inizio,
      fineEsclusa: addDays(inizio, mestruazioni),
      tipo: 'ciclo',
    });

    const ovulazione = addDays(inizio, -GIORNI_FASE_LUTEALE);
    const fertileInizio = addDays(ovulazione, -FERTILE_PRIMA);
    eventi.push({
      uid: `fertile-${compatta(fertileInizio)}@bibiciclo`,
      titolo: 'Periodo fertile (stima)',
      inizio: fertileInizio,
      fineEsclusa: addDays(ovulazione, FERTILE_DOPO + 1),
      tipo: 'fertile',
    });
  }

  return eventi;
}

export function generaIcs(eventi: EventoPrevisto[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const righe: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BibiCiclo//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const e of eventi) {
    righe.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compatta(e.inizio)}`,
      `DTEND;VALUE=DATE:${compatta(e.fineEsclusa)}`,
      `SUMMARY:${e.titolo}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.tipo === 'ciclo') {
      righe.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Il ciclo dovrebbe arrivare fra due giorni',
        'TRIGGER:-P2D',
        'END:VALARM',
      );
    }
    righe.push('END:VEVENT');
  }

  righe.push('END:VCALENDAR');
  return righe.join('\r\n') + '\r\n';
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: tutti PASS

- [ ] **Step 5: Commit**

```bash
git add src/calendar/ics.ts src/calendar/ics.test.ts
git commit -m "feat: generazione degli eventi .ics per il Calendario iOS"
```

---

## Task 14: Backup

**Files:**
- Create: `src/storage/backup.ts`
- Test: `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: `Stato` da `src/types`; `migra` da `src/storage/db`
- Produces:
  - `esportaJson(stato: Stato): string`
  - `importaJson(testo: string, oggi: ISODate): Stato` — lancia `Error` con messaggio in italiano se il file non è valido
  - `nomeFileBackup(oggi: ISODate): string`

- [ ] **Step 1: Scrivere i test in `src/storage/backup.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { esportaJson, importaJson, nomeFileBackup } from './backup';
import type { Stato } from '../types';

const stato: Stato = {
  schemaVersion: 1,
  settings: { cicloMedioDichiarato: 29, dataInstallazione: '2026-07-01' },
  periods: [{ id: 'p1', inizio: '2026-07-03', fine: '2026-07-07' }],
  dayLogs: { '2026-07-03': { flusso: 'medio', nota: 'ciao' } },
};

describe('esporta e importa', () => {
  it('conserva lo stato attraverso il ciclo completo', () => {
    expect(importaJson(esportaJson(stato), '2026-08-01')).toEqual(stato);
  });

  it('rifiuta un file che non è JSON', () => {
    expect(() => importaJson('non sono json', '2026-08-01')).toThrow(/non sembra un backup/i);
  });

  it('rifiuta un JSON che non è un backup di BibiCiclo', () => {
    expect(() => importaJson('{"foo":1}', '2026-08-01')).toThrow(/non sembra un backup/i);
  });

  it('rifiuta un backup di una versione più recente', () => {
    const futuro = JSON.stringify({ ...stato, schemaVersion: 99 });
    expect(() => importaJson(futuro, '2026-08-01')).toThrow(/versione più recente/i);
  });
});

describe('nomeFileBackup', () => {
  it('include la data', () => {
    expect(nomeFileBackup('2026-08-01')).toBe('bibiciclo-backup-2026-08-01.json');
  });
});
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./backup"`

- [ ] **Step 3: Implementare `src/storage/backup.ts`**

```ts
import type { ISODate, Stato } from '../types';
import { migra } from './db';

const VERSIONE_SCHEMA = 1;

export function esportaJson(stato: Stato): string {
  return JSON.stringify(stato, null, 2);
}

export function nomeFileBackup(oggi: ISODate): string {
  return `bibiciclo-backup-${oggi}.json`;
}

/**
 * Legge un file di backup. I messaggi d'errore sono rivolti all'utente:
 * devono spiegare cosa fare, non cosa è andato storto tecnicamente.
 */
export function importaJson(testo: string, oggi: ISODate): Stato {
  let grezzo: unknown;
  try {
    grezzo = JSON.parse(testo);
  } catch {
    throw new Error('Questo file non sembra un backup di BibiCiclo.');
  }

  if (!grezzo || typeof grezzo !== 'object' || !('schemaVersion' in grezzo)) {
    throw new Error('Questo file non sembra un backup di BibiCiclo.');
  }

  const versione = (grezzo as { schemaVersion: unknown }).schemaVersion;
  if (typeof versione !== 'number') {
    throw new Error('Questo file non sembra un backup di BibiCiclo.');
  }
  if (versione > VERSIONE_SCHEMA) {
    throw new Error('Questo backup viene da una versione più recente dell\'app. Aggiorna BibiCiclo e riprova.');
  }

  return migra(grezzo, oggi);
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: tutti PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/backup.ts src/storage/backup.test.ts
git commit -m "feat: esportazione e importazione dei dati"
```

---

## Task 15: Impostazioni e rifinitura finale

**Files:**
- Create: `src/screens/Impostazioni.tsx`, `README.md`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `condividiFile` da `src/lib/share`; `eventiPrevisti`, `generaIcs` da `src/calendar/ics`; `esportaJson`, `importaJson`, `nomeFileBackup` da `src/storage/backup`; `useStore`
- Produces: `<Impostazioni />`; app completa

- [ ] **Step 1: Creare `src/screens/Impostazioni.tsx`**

```tsx
import { useRef, useState } from 'react';
import { oggi } from '../core/dates';
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
    const file = new File([generaIcs(eventi)], 'bibiciclo.ics', { type: 'text/calendar' });
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
      await sostituisciStato(importaJson(await file.text(), oggi()));
      setMessaggio('Dati ripristinati.');
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
              className="h-9 w-9 rounded-full border border-bordo text-xl text-rosa"
            >
              −
            </button>
            <span className="w-7 text-center text-lg font-bold">{stato.settings.cicloMedioDichiarato}</span>
            <button
              onClick={() => void aggiornaDurataMedia(Math.min(45, stato.settings.cicloMedioDichiarato + 1))}
              className="h-9 w-9 rounded-full border border-bordo text-xl text-rosa"
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
```

- [ ] **Step 2: Collegare in `src/App.tsx`**

```tsx
import Impostazioni from './screens/Impostazioni';
// ...
{tab === 'impostazioni' && <Impostazioni />}
```

- [ ] **Step 3: Eseguire tutti i test e la build**

Run: `npm test`
Expected: tutti PASS

Run: `npm run build`
Expected: build completata senza errori

- [ ] **Step 4: Scrivere il `README.md`**

```markdown
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
```

- [ ] **Step 5: Commit e pubblicazione**

```bash
git add -A
git commit -m "feat: schermata impostazioni, calendario iOS e backup"
git push
```

- [ ] **Step 6: VERIFICA FINALE SU IPHONE**

Sul telefono reale, con l'app installata sulla Home, verificare nell'ordine:

1. Onboarding completo con una data reale
2. La schermata Oggi mostra una previsione plausibile
3. "Oggi mi è venuto" → foglio → Salva → la frase diventa "Sei al giorno 1"
4. Calendario: i giorni segnati sono colorati; toccare un giorno passato lo segna
5. "Rimuovi questo giorno" riporta il giorno allo stato neutro
6. Impostazioni → "Aggiungi le date al Calendario" → gli eventi compaiono nel Calendario iOS con l'avviso a due giorni
7. Impostazioni → "Salva una copia dei dati" → il file viene salvato
8. Modalità aereo: l'app si apre e funziona
9. Chiudere e riaprire l'app: i dati sono ancora lì

Annotare in `docs/` qualunque scostamento e correggerlo prima di considerare finita l'implementazione.

- [ ] **Step 7: Consegna**

Installare l'app sul telefono della destinataria, inserire l'onboarding con dati reali, ed esportare subito le date nel Calendario.

---

## Autoverifica del piano

**Copertura della specifica:**

| Sezione della specifica | Task |
|---|---|
| §3 Architettura, stack, deploy | 1, 2 |
| §3 Modello di privacy (nessuna rete) | vincoli globali, verificati in 15 |
| §4 Modello dati | 4 (tipi), 7 (persistenza) |
| §4 Apertura/chiusura ciclo, rimozione | 6 |
| §5 Algoritmo di previsione | 5 |
| §6 Avvertenza sanitaria | 9 (`Avvertenza`), usata in 9, 11, 15 |
| §7.1 Primo avvio | 9 |
| §7.2 Oggi | 11 |
| §7.3 Foglio di registrazione | 10 |
| §7.4 Calendario | 12 |
| §7.5 Impostazioni | 15 |
| §8 Promemoria via Calendario iOS | 3 (verifica), 13 (generazione), 15 (UI) |
| §9 Backup | 14 (logica), 15 (UI) |
| §10 Verifica | test in 4, 5, 6, 7, 13, 14; verifiche manuali in 2, 3, 9, 11, 12, 15 |
| §11 Rischi | 3 (condivisione), 4 (fusi orari), 14 (perdita dati) |

**Coerenza dei nomi:** `ISODate`, `Flusso`, `Periodo`, `Stato` definiti in Task 4 e usati invariati; `previsione`/`Previsione` da Task 5 usati in 11, 12, 13; `registraGiorno`/`rimuoviGiorno` da Task 6 usati in 7; `condividiFile` da Task 3 usato in 15; `migra` da Task 7 usato in 14.

**Nessun segnaposto:** ogni passo contiene il codice effettivo. I segnaposto introdotti nella Task 8 (`<div>Oggi (Task 10)</div>`) sono temporanei per costruzione e vengono sostituiti esplicitamente nelle Task 11, 12 e 15.
