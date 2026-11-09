"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Uploader() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function send() {
    const f = input.current?.files?.[0];
    if (!f) {
      setState("error");
      setMsg("Bitte wähle zuerst eine ZIP-Datei aus.");
      return;
    }
    setState("busy");
    setMsg("Wir laden Dein Projekt hoch …");
    try {
      const r = await fetch("/api/projekt", {
        method: "PUT",
        headers: { "x-livedock": "1", "x-filename": encodeURIComponent(f.name), "content-type": "application/zip" },
        body: f,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.fehler ?? "Das hat leider nicht geklappt.");
      router.refresh();
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Das hat leider nicht geklappt.");
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <label htmlFor="zip">ZIP-Datei Deines Projekts</label>
      <input id="zip" ref={input} type="file" accept=".zip,application/zip" style={{ color: "var(--soft)" }} />
      <button className="btn" type="button" onClick={send} disabled={state === "busy"}>
        {state === "busy" ? "Wird hochgeladen …" : "Hochladen und weiter"}
      </button>
      <p className="note">Bitte ohne node_modules. Eine .env-Datei im Projekt zeigen wir Dir im Ergebnis, damit Du sie erneuern kannst.</p>
      <div role="status" aria-live="polite" className={state === "error" ? "err" : "note"} hidden={!msg}>
        {msg}
      </div>
    </div>
  );
}
