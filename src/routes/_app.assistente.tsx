import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/assistente")({
  head: () => ({ meta: [{ title: "Assistente IA — OAB na Risca" }, { name: "description", content: "Chat com professora jurídica IA para tirar dúvidas." }] }),
  component: () => <ComingSoon title="Assistente IA" subtitle="Sua professora jurídica IA — explica conceitos em linguagem simples, treina dissertativas e cita artigos e súmulas." />,
});
