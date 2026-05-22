// Logger estruturado leve (Worker-friendly, sem deps).
// Uso: `log.info("sync.start", { atoId, source })`. Em prod sai como JSON
// numa linha, fácil de filtrar nos logs do Cloudflare Worker.

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const isDev =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

function emit(level: Level, msg: string, fields?: Fields) {
  const entry = {
    level,
    msg,
    time: new Date().toISOString(),
    ...(fields ?? {}),
  };
  const line = isDev ? `[${level}] ${msg} ${JSON.stringify(fields ?? {})}` : JSON.stringify(entry);
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  debug: (msg: string, fields?: Fields) => emit("debug", msg, fields),
  info: (msg: string, fields?: Fields) => emit("info", msg, fields),
  warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
  error: (msg: string, fields?: Fields) => emit("error", msg, fields),
  child: (base: Fields) => ({
    debug: (m: string, f?: Fields) => emit("debug", m, { ...base, ...(f ?? {}) }),
    info: (m: string, f?: Fields) => emit("info", m, { ...base, ...(f ?? {}) }),
    warn: (m: string, f?: Fields) => emit("warn", m, { ...base, ...(f ?? {}) }),
    error: (m: string, f?: Fields) => emit("error", m, { ...base, ...(f ?? {}) }),
  }),
};
