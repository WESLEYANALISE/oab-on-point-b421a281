import { SimuladoQueueDriver } from "@/components/admin/SimuladoQueueDriver";
import { SimuladoQueueIndicator } from "@/components/admin/SimuladoQueueIndicator";
import { ResumoQueueDriver } from "@/components/admin/ResumoQueueDriver";
import { ResumoQueueIndicator } from "@/components/admin/ResumoQueueIndicator";
import { FlashcardsCuradosQueueDriver } from "@/components/admin/FlashcardsCuradosQueueDriver";
import { FlashcardsCuradosQueueIndicator } from "@/components/admin/FlashcardsCuradosQueueIndicator";

export function AdminQueueOverlays() {
  return (
    <>
      <SimuladoQueueDriver />
      <SimuladoQueueIndicator />
      <ResumoQueueDriver />
      <ResumoQueueIndicator />
      <FlashcardsCuradosQueueDriver />
      <FlashcardsCuradosQueueIndicator />
    </>
  );
}
