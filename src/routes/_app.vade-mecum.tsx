import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/vade-mecum")({
  component: () => <ComingSoon title="Vade Mecum" subtitle="Legislação completa, sempre à mão." />,
});
