import { createFileRoute, useParams, redirect } from "@tanstack/react-router";
import { EstatutoArtigosPage } from "./_app.vade-mecum.estatutos.$slug";

export const Route = createFileRoute("/_app/vade-mecum/cf/$parte")({
  beforeLoad: ({ params }) => {
    if (params.parte !== "principal" && params.parte !== "adct") {
      throw redirect({ to: "/vade-mecum/cf" });
    }
  },
  head: ({ params }) => ({
    meta: [
      {
        title:
          params.parte === "adct"
            ? "ADCT — Constituição Federal — Vade Mecum"
            : "Constituição Federal — Vade Mecum",
      },
    ],
  }),
  component: CfParteComponent,
});

function CfParteComponent() {
  const { parte } = useParams({ from: "/_app/vade-mecum/cf/$parte" });
  return (
    <EstatutoArtigosPage
      slugOverride="cf"
      parteCF={parte === "adct" ? "adct" : "principal"}
      tituloOverride={
        parte === "adct"
          ? "ADCT — Ato das Disposições Constitucionais Transitórias"
          : "Constituição Federal"
      }
    />
  );
}
