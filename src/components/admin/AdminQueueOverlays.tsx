import { SimuladoQueueDriver } from "@/components/admin/SimuladoQueueDriver";
import { SimuladoQueueIndicator } from "@/components/admin/SimuladoQueueIndicator";
import { ResumoQueueDriver } from "@/components/admin/ResumoQueueDriver";
import { ResumoQueueIndicator } from "@/components/admin/ResumoQueueIndicator";

export function AdminQueueOverlays() {
  return (
    <>
      <SimuladoQueueDriver />
      <SimuladoQueueIndicator />
      <ResumoQueueDriver />
      <ResumoQueueIndicator />
    </>
  );
}
