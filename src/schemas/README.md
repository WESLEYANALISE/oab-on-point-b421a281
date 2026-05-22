# Schemas Zod

Centralize aqui os schemas Zod reutilizados em mais de um lugar. Schemas
exclusivos de uma única `*.functions.ts` podem ficar no próprio arquivo.

Padrão:

```ts
// src/schemas/perfil.ts
import { z } from "zod";

export const PerfilUpdate = z.object({
  display_name: z.string().min(1).max(120),
  bio: z.string().max(500).optional(),
});

export type PerfilUpdate = z.infer<typeof PerfilUpdate>;
```
