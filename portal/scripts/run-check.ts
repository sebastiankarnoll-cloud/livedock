// Runs the engine on one project folder in its own process (isolated from the worker, no database access).
// Output: one JSON line per step ({"step":"geheimnisse"}) and a last line {"result": ...}.
import { runCheck } from "../../engine/src/check.ts";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: run-check.ts <dir>");
  process.exit(2);
}
const result = runCheck(dir, { onStep: (step) => console.log(JSON.stringify({ step })) });
console.log(JSON.stringify({ result }));
