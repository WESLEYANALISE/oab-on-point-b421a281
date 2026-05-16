# Ajustes no HomeTopCard

Arquivo único: `src/components/home/HomeTopCard.tsx`

## Mudanças

1. **Rótulo do exame**
   - Trocar `Próximo exame · Dom, 5 jul 2026` por apenas `PRÓXIMO EXAME` (mantém o estilo uppercase/tracking atual).

2. **Data por extenso abaixo do contador**
   - Adicionar nova linha abaixo de `dias · hrs · min`:
     `Domingo, 05 de julho de 2026`
   - Estilo discreto: `text-[11px] text-primary-foreground/60 mt-1.5`, capitalizado.

3. **Reposicionar badge "46º OAB"**
   - Remover da linha da saudação (ao lado do nome).
   - Mover para o canto superior direito do card como selo absoluto:
     `absolute top-2.5 right-2.5`, mesma pill dourada com `Sparkles`.
   - Fica como indicador de status do exame em foco, sem competir com o nome.
   - O `ChevronRight` da linha do perfil continua no fim para indicar que é clicável.

4. **"Ver calendário" como botão real**
   - Transformar o link de texto em pill button:
     - Fundo `bg-gold/15` com `border border-gold/40`
     - `rounded-full px-3 py-1.5`
     - Texto `text-gold font-semibold text-[11px]`
     - Hover: `hover:bg-gold/25`
   - Mantém ícone `Calendar` + label `Ver calendário` + `ChevronRight`.

## Layout final (mobile)

```text
┌─────────────────────────────────────────┐
│ [W]  BOA NOITE                  [46º OAB]│
│      Wesley                          ›  │
│─────────────────────────────────────────│
│ PRÓXIMO EXAME          [📅 Ver calendário]│
│ 49 dias · 11 hrs · 51 min               │
│ Domingo, 05 de julho de 2026            │
└─────────────────────────────────────────┘
```

## Detalhes técnicos

- Adicionar constante `EXAM_LONG = "Domingo, 05 de julho de 2026"`.
- Manter `EXAM_DATE` e função `diff()` como estão.
- Badge no canto: usar `z-10` para ficar acima dos blurs decorativos.
- Sem mudanças em outros arquivos.
