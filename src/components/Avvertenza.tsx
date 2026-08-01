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
