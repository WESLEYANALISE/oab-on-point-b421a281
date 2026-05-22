// Setup global de testes (Vitest). Mantenha mínimo.
import { vi } from "vitest";

// Stub leve para variáveis de ambiente comuns nos testes.
vi.stubEnv("NODE_ENV", "test");
