import assert from "node:assert/strict";
import { buildContentSecurityPolicy } from "./csp";

const nonce = "0123456789abcdef0123456789abcdef";

const productionPolicy = buildContentSecurityPolicy({
  nonce,
  isProduction: true,
  parserOrigin: "https://parser.example.com",
});

assert.match(productionPolicy, new RegExp(`script-src [^;]*'nonce-${nonce}'`));
assert.match(productionPolicy, /script-src-attr 'none'/);
assert.match(productionPolicy, /connect-src 'self' https:\/\/parser\.example\.com/);
assert.match(productionPolicy, /upgrade-insecure-requests/);

const productionScriptDirective = productionPolicy
  .split("; ")
  .find((directive) => directive.startsWith("script-src "));

assert.ok(productionScriptDirective, "script-src directive should exist");
assert.ok(
  !productionScriptDirective.includes("'unsafe-inline'"),
  "production script-src must not allow unsafe-inline",
);
assert.ok(
  !productionScriptDirective.includes("'unsafe-eval'"),
  "production script-src must not allow unsafe-eval",
);

const developmentPolicy = buildContentSecurityPolicy({ nonce, isProduction: false });
const developmentScriptDirective = developmentPolicy
  .split("; ")
  .find((directive) => directive.startsWith("script-src "));

assert.ok(developmentScriptDirective?.includes("'unsafe-eval'"));
assert.ok(!developmentScriptDirective?.includes("'unsafe-inline'"));
assert.ok(!developmentPolicy.includes("upgrade-insecure-requests"));

console.log("CSP tests passed.");
