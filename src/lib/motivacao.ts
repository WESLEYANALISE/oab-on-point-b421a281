// Frases motivacionais para a 1ª Fase. Seleção determinística pelo dia do ano.

const FRASES = [
  "Hoje é mais um passo rumo à toga.",
  "Constância vence intensidade — siga firme.",
  "Cada questão respondida é um neurônio mais afiado.",
  "Você não precisa estudar tudo, só o que cai.",
  "Disciplina é liberdade no dia da prova.",
  "Pequenas vitórias diárias constroem aprovações.",
  "Quem revisa, lembra. Quem lembra, acerta.",
  "Edital na mão é meio caminho andado.",
  "Ética é 8 questões fáceis — não perca nenhuma.",
  "A FGV recompensa quem decora a letra da lei.",
  "Foco no básico bem feito — o resto é bônus.",
  "Estude para passar, não para saber tudo.",
  "Hoje cansa, amanhã aprova.",
  "Você está mais perto do que ontem.",
  "Não compete com ninguém, só com a versão anterior de você.",
  "Cada minuto investido é um voto em quem você quer ser.",
  "Confie no processo. Confie no plano.",
  "A aprovação é certa para quem não desiste.",
  "Treine sob pressão — a prova será mais leve.",
  "Erros são professores disfarçados.",
  "Domine 60% do edital e a aprovação é provável.",
  "Quem entende é candidato. Quem treina é aprovado.",
  "Hoje pode ser o melhor dia de estudo da sua semana.",
  "Café, foco e Vade Mecum.",
  "Você não precisa estar pronto, precisa começar.",
  "Bons estudantes leem. Aprovados resolvem questões.",
  "Quem revisa de noite, acerta de manhã.",
  "Trinta dias de constância mudam tudo.",
  "O exame é só uma terça-feira. Você está pronto.",
  "Sua toga já está sendo costurada.",
];

export function fraseDoDia(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return FRASES[dayOfYear % FRASES.length];
}
