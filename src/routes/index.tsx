import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DormGame = lazy(() => import("@/components/DormGame"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dorm Vibes — Walk a 2D Dorm Floor" },
      {
        name: "description",
        content:
          "Wander a cozy top-down dorm floor and discover each room's Top 5 songs, bulletin board, and companion — all through proximity, no clicking.",
      },
      { property: "og:title", content: "Dorm Vibes — Walk a 2D Dorm Floor" },
      {
        property: "og:description",
        content: "A MySpace-inspired social floor you walk around instead of scroll.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background p-3 sm:p-5">
      <h1 className="sr-only">Dorm Vibes — a walkable 2D dorm floor</h1>
      <div className="h-[calc(100vh-1.5rem)] w-full sm:h-[calc(100vh-2.5rem)]">
        <ClientOnly
          fallback={
            <div className="flex h-full w-full items-center justify-center rounded-3xl border border-border bg-secondary text-sm text-muted-foreground">
              Unlocking the floor…
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center rounded-3xl border border-border bg-secondary text-sm text-muted-foreground">
                Unlocking the floor…
              </div>
            }
          >
            <DormGame />
          </Suspense>
        </ClientOnly>
      </div>
    </main>
  );
}
