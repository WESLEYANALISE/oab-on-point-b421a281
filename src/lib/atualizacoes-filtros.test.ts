import { describe, it, expect } from "vitest";
import { PRESETS, LEIS_IMPORTANTES, matchPreset, matchLeisAcompanhadas } from "./atualizacoes-filtros";

describe("atualizacoes-filtros", () => {
  it("exporta presets e leis importantes", () => {
    expect(PRESETS.length).toBeGreaterThan(0);
    expect(LEIS_IMPORTANTES.length).toBeGreaterThan(0);
  });

  it("matchPreset com 'todos' aceita qualquer ato", () => {
    const ato = { ementa: "qualquer coisa", tipo: "LEI" } as never;
    expect(matchPreset(ato, "todos")).toBe(true);
  });

  it("matchLeisAcompanhadas é true quando lista vazia", () => {
    const ato = { ementa: "x", tipo: "LEI" } as never;
    expect(matchLeisAcompanhadas(ato, [])).toBe(true);
  });
});
