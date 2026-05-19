/**
 * SVG glyphs únicos por matéria. Sem ícones de biblioteca — desenhos próprios
 * em linha, com acento dourado e tom específico de cada área.
 */
import { cn } from "@/lib/utils";

type Props = { materiaId: string; className?: string };

const COMMON = {
  width: 56,
  height: 56,
  viewBox: "0 0 56 56",
  fill: "none" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Cor de acento por matéria (compatível com a paleta gold/bordô do app). */
export const MATERIA_ACCENT: Record<string, string> = {
  etica: "#c9a14a",
  constitucional: "#d4af37",
  trabalho: "#e0823a",
  civil: "#b08d57",
  "processo-civil": "#9aa17a",
  penal: "#a23a2e",
  "processo-penal": "#7a3a3a",
  administrativo: "#9a7bbf",
  tributario: "#5a8f7a",
  empresarial: "#c98b3a",
  "processo-trabalho": "#bf6f3a",
  internacional: "#3a7a9a",
  humanos: "#c95a7a",
  ambiental: "#6fa86f",
  eca: "#d49a6a",
  filosofia: "#8a8a9a",
};

export function getMateriaAccent(id: string) {
  return MATERIA_ACCENT[id] ?? "#c9a14a";
}

export function MateriaGlyph({ materiaId, className }: Props) {
  const color = getMateriaAccent(materiaId);
  const stroke = { stroke: color, strokeWidth: 1.6 };
  const soft = { stroke: color, strokeWidth: 1.2, opacity: 0.55 };

  const svg = (() => {
    switch (materiaId) {
      case "constitucional":
        // Coluna grega com livro aberto
        return (
          <svg {...COMMON}>
            <path d="M14 44h28" {...stroke} />
            <path d="M16 40h24M16 16h24" {...stroke} />
            <path d="M19 16v24M28 16v24M37 16v24" {...stroke} />
            <path d="M14 14c4-3 24-3 28 0" {...stroke} />
            <path d="M20 12h16" {...soft} />
          </svg>
        );
      case "civil":
        // Casa + contrato
        return (
          <svg {...COMMON}>
            <path d="M10 28l18-14 18 14" {...stroke} />
            <path d="M14 26v18h28V26" {...stroke} />
            <path d="M24 44v-10h8v10" {...stroke} />
            <path d="M20 32h2M34 32h2" {...soft} />
          </svg>
        );
      case "penal":
        // Algemas estilizadas
        return (
          <svg {...COMMON}>
            <circle cx="20" cy="32" r="8" {...stroke} />
            <circle cx="36" cy="32" r="8" {...stroke} />
            <path d="M26 28l4 0M26 36l4 0" {...stroke} />
            <path d="M14 18l4 6M42 18l-4 6" {...soft} />
          </svg>
        );
      case "processo-penal":
        // Martelo do juiz
        return (
          <svg {...COMMON}>
            <path d="M14 38l16-16" {...stroke} />
            <path d="M22 14l12 12-6 6-12-12z" {...stroke} />
            <path d="M12 46h24" {...stroke} />
            <path d="M30 38l8-8" {...soft} />
          </svg>
        );
      case "processo-civil":
        // Fluxograma de petição
        return (
          <svg {...COMMON}>
            <rect x="10" y="10" width="14" height="10" rx="2" {...stroke} />
            <rect x="32" y="10" width="14" height="10" rx="2" {...stroke} />
            <rect x="21" y="36" width="14" height="10" rx="2" {...stroke} />
            <path d="M17 20v6h11v10M39 20v6H28v10" {...soft} />
          </svg>
        );
      case "trabalho":
        // Engrenagem + figura
        return (
          <svg {...COMMON}>
            <circle cx="28" cy="22" r="6" {...stroke} />
            <path d="M28 14v-4M28 30v4M20 22h-4M36 22h4M22 16l-3-3M34 16l3-3M22 28l-3 3M34 28l3 3" {...stroke} />
            <path d="M16 46c2-6 8-9 12-9s10 3 12 9" {...soft} />
          </svg>
        );
      case "processo-trabalho":
        // Engrenagem + balança simplificada
        return (
          <svg {...COMMON}>
            <path d="M28 10v32" {...stroke} />
            <path d="M14 18h28" {...stroke} />
            <path d="M14 18l-4 10h8z" {...stroke} />
            <path d="M42 18l-4 10h8z" {...stroke} />
            <path d="M22 44h12" {...soft} />
          </svg>
        );
      case "administrativo":
        // Edifício público com pilares
        return (
          <svg {...COMMON}>
            <path d="M10 22l18-10 18 10" {...stroke} />
            <path d="M14 22v18M22 22v18M30 22v18M38 22v18M42 22v18" {...stroke} />
            <path d="M10 44h36" {...stroke} />
            <path d="M10 22h36" {...soft} />
          </svg>
        );
      case "tributario":
        // Moedas empilhadas + seta
        return (
          <svg {...COMMON}>
            <ellipse cx="20" cy="18" rx="8" ry="3" {...stroke} />
            <path d="M12 18v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" {...stroke} />
            <path d="M12 24v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" {...stroke} />
            <path d="M36 40l8-8m0 0h-6m6 0v6" {...soft} />
          </svg>
        );
      case "empresarial":
        // Gráfico de barras + maleta
        return (
          <svg {...COMMON}>
            <path d="M10 44h36" {...stroke} />
            <rect x="14" y="30" width="6" height="14" {...stroke} />
            <rect x="25" y="22" width="6" height="22" {...stroke} />
            <rect x="36" y="14" width="6" height="30" {...stroke} />
            <path d="M14 22l8-6 6 4 14-10" {...soft} />
          </svg>
        );
      case "internacional":
        // Globo com meridianos
        return (
          <svg {...COMMON}>
            <circle cx="28" cy="28" r="16" {...stroke} />
            <path d="M12 28h32" {...stroke} />
            <path d="M28 12c6 6 6 26 0 32M28 12c-6 6-6 26 0 32" {...stroke} />
            <path d="M16 20c8 4 16 4 24 0M16 36c8-4 16-4 24 0" {...soft} />
          </svg>
        );
      case "humanos":
        // Mãos protegendo figura
        return (
          <svg {...COMMON}>
            <circle cx="28" cy="20" r="5" {...stroke} />
            <path d="M18 44c0-7 4-12 10-12s10 5 10 12" {...stroke} />
            <path d="M10 30c4-2 6 0 8 4M46 30c-4-2-6 0-8 4" {...soft} />
          </svg>
        );
      case "ambiental":
        // Folha + raiz
        return (
          <svg {...COMMON}>
            <path d="M28 10c-10 4-14 14-10 24 10-2 16-10 16-22" {...stroke} />
            <path d="M28 14v32" {...soft} />
            <path d="M22 46c2-2 4-2 6 0M28 42c2-2 4-2 6 0" {...soft} />
          </svg>
        );
      case "etica":
        // Selo OAB / fita
        return (
          <svg {...COMMON}>
            <circle cx="28" cy="22" r="10" {...stroke} />
            <path d="M28 32l-6 14 6-4 6 4-6-14" {...stroke} />
            <path d="M24 22l3 3 6-6" {...stroke} />
          </svg>
        );
      case "eca":
        // Pipa / criança estilizada
        return (
          <svg {...COMMON}>
            <path d="M28 10l12 12-12 12-12-12z" {...stroke} />
            <path d="M28 10v24M16 22h24" {...soft} />
            <path d="M28 34c-2 4-4 6-6 12M28 34c2 4 4 6 6 12" {...stroke} />
          </svg>
        );
      case "filosofia":
        // Pena de escrever
        return (
          <svg {...COMMON}>
            <path d="M14 44l8-8" {...stroke} />
            <path d="M22 36c6-2 14-10 20-24-12 0-22 8-26 18 0 0 4 2 6 6z" {...stroke} />
            <path d="M22 36l8-8" {...soft} />
          </svg>
        );
      default:
        // Livro aberto genérico
        return (
          <svg {...COMMON}>
            <path d="M10 16c8-2 14-2 18 2 4-4 10-4 18-2v26c-8-2-14-2-18 2-4-4-10-4-18-2z" {...stroke} />
            <path d="M28 18v26" {...soft} />
          </svg>
        );
    }
  })();

  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}26, transparent 70%)`,
        }}
        aria-hidden
      />
      <div className="relative">{svg}</div>
    </div>
  );
}
