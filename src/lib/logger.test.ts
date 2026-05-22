import { describe, it, expect, vi } from "vitest";
import { log } from "./logger";

describe("logger", () => {
  it("emite info no console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info("teste", { foo: 1 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("child adiciona campos base", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.child({ req: "abc" }).info("evt", { x: 2 });
    const arg = spy.mock.calls[0]?.[0] as string;
    expect(arg).toContain("abc");
    expect(arg).toContain("evt");
    spy.mockRestore();
  });
});
