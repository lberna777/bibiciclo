import { useEffect } from 'react';
import { useStore } from './store';
import TabBar from './components/TabBar';
import Onboarding from './screens/Onboarding';
import Oggi from './screens/Oggi';
import Calendario from './screens/Calendario';
import Impostazioni from './screens/Impostazioni';

export default function App() {
  const pronto = useStore((s) => s.pronto);
  const errore = useStore((s) => s.errore);
  const tab = useStore((s) => s.tab);
  const carica = useStore((s) => s.carica);
  const periods = useStore((s) => s.stato.periods);

  useEffect(() => {
    void carica();
  }, [carica]);

  // Lettura fallita: non si entra nell'app con uno stato vuoto, perché la prima
  // scrittura sovrascriverebbe dati che sono solo temporaneamente illeggibili.
  if (!pronto && errore) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-lg font-bold">{errore}</p>
        <p className="text-sm text-inchiostro/70">
          Prova a chiudere e riaprire l'app. Non disinstallarla: i tuoi dati sono ancora sul
          telefono.
        </p>
      </div>
    );
  }

  if (!pronto) return <div className="p-6 text-tenue">Un attimo…</div>;

  if (periods.length === 0) return <Onboarding />;

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {/* Scrittura fallita: la modifica è viva in memoria ma non è su disco. */}
        {errore && (
          <p className="mb-4 rounded-2xl bg-rosa-chiaro px-4 py-3 text-[13px] font-semibold text-rosa-scuro">
            {errore}
          </p>
        )}
        {tab === 'oggi' && <Oggi />}
        {tab === 'calendario' && <Calendario />}
        {tab === 'impostazioni' && <Impostazioni />}
      </main>
      <TabBar />
    </div>
  );
}
