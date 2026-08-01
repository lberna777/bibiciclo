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
