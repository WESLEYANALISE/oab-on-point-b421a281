const MINUSCULAS = new Set([
  "a","o","as","os","um","uma","uns","umas",
  "de","do","da","dos","das","e","ou","em","no","na","nos","nas",
  "para","por","com","sem","sob","sobre","ao","aos","à","às",
  "que","se","é","são","foi","era","the","of","and","to","in","on","for","at","by",
]);

export function normalizarTitulo(t: string): string {
  if (!t) return t;
  const limpo = t.trim().replace(/\s+/g, " ");
  return limpo
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, i) => {
      if (i > 0 && MINUSCULAS.has(palavra)) return palavra;
      return palavra.replace(
        /^([^\p{L}\p{N}]*)(\p{L})/u,
        (_m, pre, ch) => pre + ch.toLocaleUpperCase("pt-BR")
      );
    })
    .join(" ");
}
