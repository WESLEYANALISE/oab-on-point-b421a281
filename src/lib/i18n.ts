// Estrutura mínima de i18n. Hoje só PT-BR é ativo; a abstração existe pra
// adoção incremental — quando uma string nova passar por aqui ela fica
// preparada para tradução futura sem refactor de componente.
//
// Uso:
//   import { t, setLocale, getLocale } from "@/lib/i18n";
//   <h1>{t("home.welcome", "Bem-vindo")}</h1>

type Locale = "pt-BR" | "en" | "es";

const SUPPORTED: Locale[] = ["pt-BR", "en", "es"];
const DEFAULT: Locale = "pt-BR";

const catalogs: Record<Locale, Record<string, string>> = {
  "pt-BR": {},
  en: {},
  es: {},
};

let current: Locale = DEFAULT;

export function getLocale(): Locale {
  return current;
}

export function setLocale(loc: string) {
  const norm = SUPPORTED.find((l) => l.toLowerCase() === loc.toLowerCase());
  current = norm ?? DEFAULT;
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0]?.trim() ?? "";
    const match = SUPPORTED.find((l) => l.toLowerCase() === tag.toLowerCase());
    if (match) return match;
    const base = tag.split("-")[0]?.toLowerCase();
    const baseMatch = SUPPORTED.find((l) => l.toLowerCase().startsWith(base ?? ""));
    if (baseMatch) return baseMatch;
  }
  return DEFAULT;
}

export function t(key: string, fallback: string): string {
  return catalogs[current]?.[key] ?? fallback;
}

export function registerCatalog(loc: Locale, entries: Record<string, string>) {
  catalogs[loc] = { ...catalogs[loc], ...entries };
}
