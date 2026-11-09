import type { ReactNode } from "react";

/** Frame used by every customer screen: logo, progress, who is on turn, headline, why. */
export function Screen(props: { step: number; who: "you" | "us"; title: string; lead: string; children: ReactNode; after?: string }) {
  return (
    <main className="col">
      <div className="row">
        <div className="logo">
          livedock<span>.</span>
        </div>
        <div>
          <div className="step">Schritt {props.step} von 5 · Prüfen</div>
          <div className="bar" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} className={n <= props.step ? "on" : ""} />
            ))}
          </div>
        </div>
      </div>
      <div className="stack">
        <div>
          <span className={`badge ${props.who}`}>{props.who === "you" ? "Du bist dran" : "Wir sind dran"}</span>
        </div>
        <h1>{props.title}</h1>
        <p className="lead">{props.lead}</p>
      </div>
      {props.children}
      {props.after && (
        <div className="after">
          <b>Was danach passiert</b>
          <span>{props.after}</span>
        </div>
      )}
    </main>
  );
}
