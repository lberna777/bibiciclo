# CLAUDE.md — bibiciclo

## Famiglia

Repo **autonoma** (gruppo di chat **nessuno (chat senza gruppo)** su claude.ai). Progetto vero nato prima di Developing, dai tentativi del sistema che l'ha preceduto. Si lavora qui; Developing la cita come prova di competenza nel portfolio.
Mappa completa delle repo: `CLAUDE.md` di `lberna777/cockpit`, sezione «Famiglia delle repository».

## Modelli: chi pensa e chi esegue (advisor pattern)

Deciso da Lorenzo il 2026-10-20. Copia identica nei `CLAUDE.md` di cockpit, Developing,
plugin-creator, carguy, bibiciclo e barca-halloween; l'originale è in cockpit: se lo cambi,
ricopialo nelle altre. I due subagenti stanno in `.claude/agents/`, identici in tutte e sei le repo.

| Livello | Chi | Che cosa fa |
| --- | --- | --- |
| **Advisor** | La sessione stessa, su **Opus** (`"model": "opus"` in `.claude/settings.json`) | Organizza, pianifica, decide, parla con Lorenzo, scrive gli incarichi, **giudica ogni consegna**, fa commit e push |
| **Sviluppatore** | Subagente `sviluppatore`, su **Sonnet** | Codice su un piano già deciso: implementa, scrive e fa girare i test, corregge finché passano |
| **Esecutore** | Subagente `esecutore`, su **Haiku** | Lavori ripetitivi e veloci: estrazioni, inventari, conversioni, modifiche meccaniche su molti file, controlli in serie |

- **Si delega** ciò che è definito e verificabile: chi lo riceve non deve scegliere niente.
  **Resta all'advisor** ciò che chiede giudizio: architettura e piani, testi che contano, scelte
  di stile, privacy e dati personali, ogni decisione e ogni domanda per Lorenzo.
- **Studio** (cockpit, `Vault/UniCode`): lezioni, lab, spiegazioni, verifiche e giudizi su come va
  Lorenzo restano all'advisor. All'esecutore vanno conversioni in PDF, indici, collegamenti tra le
  note, controlli su molti file.
- **Incarico** (`Agent` con `subagent_type: "sviluppatore"` o `"esecutore"`): obiettivo in una
  frase, file di partenza, uscita attesa (percorsi e formato), criterio di completamento (per il
  codice: quali test devono passare), cosa non fare. Incarichi indipendenti in parallelo.
- **Controllo**: l'advisor rilegge ogni consegna prima del commit (per intero il codice e i testi,
  a campione i lavori in serie). I subagenti non fanno commit né push. Se una consegna non passa,
  la corregge l'advisor o la rimanda con un incarico più preciso.
- **Non si delega** un lavoro che l'advisor finisce prima di quanto serva a scrivere l'incarico.
