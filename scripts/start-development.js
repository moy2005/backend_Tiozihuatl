import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const pythonCommand = process.platform === "win32" ? "python" : "python3";
// Se ejecuta nodemon con el propio Node: en Windows, spawn ya no permite lanzar .cmd sin shell (EINVAL).
const nodemonScript = fileURLToPath(new URL("../node_modules/nodemon/bin/nodemon.js", import.meta.url));

const recommendationService = spawn(
  pythonCommand,
  ["-m", "src.modules.recommendations.python_service.serve"],
  { stdio: "inherit", env: process.env }
);

const api = spawn(
  process.execPath,
  [nodemonScript, "src/server.js"],
  { stdio: "inherit", env: process.env }
);

let stopping = false;
const stop = (failedProcess, exitCode) => {
  if (stopping) return;
  stopping = true;
  if (failedProcess !== recommendationService) recommendationService.kill("SIGTERM");
  if (failedProcess !== api) api.kill("SIGTERM");
  process.exit(exitCode ?? 1);
};

recommendationService.on("exit", (code) => stop(recommendationService, code));
api.on("exit", (code) => stop(api, code));
process.on("SIGTERM", () => stop(null, 0));
process.on("SIGINT", () => stop(null, 0));
