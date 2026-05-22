import { ReactNode } from "react";

/** Moldura de celular dark com glow dourado — reutilizada pelos showcases. */
export function MockMobileScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto rounded-[36px] p-2"
      style={{
        width: "280px",
        background: "linear-gradient(160deg, #1a1a1a, #0a0a0a)",
        border: "1px solid rgba(212,168,75,0.35)",
        boxShadow:
          "0 30px 80px -20px rgba(0,0,0,0.8), 0 0 60px -10px rgba(212,168,75,0.25)",
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 top-2 h-5 w-24 rounded-full z-10"
        style={{ background: "#000" }}
      />
      <div
        className="relative rounded-[28px] overflow-hidden h-[560px] bg-[#0a0a0a]"
        style={{ border: "1px solid rgba(255,255,255,0.05)" }}
      >
        {children}
      </div>
    </div>
  );
}
