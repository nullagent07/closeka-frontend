// CJS require hook: replace `server-only` with a no-op for CLI scripts
// (run-jobs, cron-process). Real module throws when imported outside Next server runtime.
const Module = require("node:module");
const path = require("node:path");
const stubPath = path.join(__dirname, "server-only-stub.cjs");

const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return stubPath;
  return orig.call(this, request, ...rest);
};
