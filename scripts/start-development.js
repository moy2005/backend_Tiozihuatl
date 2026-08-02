import { spawn } from "node:child_process";

const pythonCommand = process.platform === "win32" ? "python" : "python3";
const nodemonCommand = process.platform === "win32" ? "nodemon.cmd" : "nodemon";

const clusteringService = spawn(
  pythonCommand,
  ["-m", "src.modules.recommendations.python_service.serve"],
  { stdio: "inherit", env: process.env }
);

const api = spawn(
  nodemonCommand,
  ["src/server.js"],
  { stdio: "inherit", env: process.env }
);

let stopping = false;
const stop = (failedProcess, exitCode) => {
  if (stopping) return;
  stopping = true;
  if (failedProcess !== clusteringService) clusteringService.kill("SIGTERM");
  if (failedProcess !== api) api.kill("SIGTERM");
  process.exit(exitCode ?? 1);
};

clusteringService.on("exit", (code) => stop(clusteringService, code));
api.on("exit", (code) => stop(api, code));
process.on("SIGTERM", () => stop(null, 0));
process.on("SIGINT", () => stop(null, 0));
