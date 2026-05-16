import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/desktop")({
  component: () => <ComingSoon title="Desktop" subtitle="Acesse o OAB na Risca pelo computador." />,
});
