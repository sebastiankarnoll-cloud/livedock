import { Screen } from "../parts.tsx";

// Placeholder: the real privacy notice is written before the first real customer.
export default function Datenschutz() {
  return (
    <Screen step={1} who="us" title="Datenschutzerklärung" lead="Platzhalter. Der vollständige Text kommt vor dem Start mit echten Kunden.">
      <a href="/anmelden">Zurück zur Anmeldung</a>
    </Screen>
  );
}
