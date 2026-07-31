import { spawn } from "node:child_process";
const pythonCommand = process.platform === "win32"
  ? "python"
  : "python3";
const recommender = spawn(
  pythonCommand,
  ["-m", "src.modules.recommendations.python_service.serve"],
  {
    stdio: "inherit",
    env: process.env,
  }
);
const api = spawn(
  process.execPath,
  ["src/server.js"],
  {
    stdio: "inherit",
    env: process.env,
  }
);
let stopping = false;
const stop = (failedProcess, exitCode) => {
  if (stopping) return;
  stopping = true;
  if (failedProcess !== recommender) {
    recommender.kill("SIGTERM");
  }
  if (failedProcess !== api) {
    api.kill("SIGTERM");
  }
  process.exit(exitCode ?? 1);
};
recommender.on("exit", (code) => stop(recommender, code));
api.on("exit", (code) => stop(api, code));
process.on("SIGTERM", () => stop(null, 0));
process.on("SIGINT", () => stop(null, 0));


