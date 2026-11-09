"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Progress({ labels }: { labels: [string, string][] }) {
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch("/api/status", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (stop) return;
          setSteps(j.steps ?? []);
          if (j.status === "done" || j.status === "failed") return router.refresh();
        }
      } catch {
        /* network blip: try again */
      }
      if (!stop) setTimeout(tick, 1500);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [router]);

  const current = labels.findIndex(([id]) => !steps.includes(id));
  return (
    <div className="term" role="status" aria-live="polite">
      <div>livedock check</div>
      <ul>
        {labels.map(([id, label], i) => {
          const done = steps.includes(id);
          const now = i === current;
          return (
            <li key={id} style={{ color: done ? "var(--soft)" : now ? "var(--fg)" : "var(--dim)" }}>
              <span style={{ color: done ? "var(--accent)" : now ? "var(--cyan)" : "var(--dim)" }}>{done ? "✓" : now ? "●" : "·"}</span> {label}
              {now ? " … wird geprüft" : ""}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
