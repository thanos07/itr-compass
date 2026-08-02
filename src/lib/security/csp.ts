export type CspOptions = {
  nonce: string;
  isProduction: boolean;
  parserOrigin?: string;
};

function compact(policy: string): string {
  return policy.replace(/\s{2,}/g, " ").trim();
}

/**
 * Build a per-request Content Security Policy.
 *
 * Inline scripts are allowed only when Next.js or the application attaches the
 * matching cryptographic nonce. `unsafe-inline` is deliberately excluded from
 * script-src so injected inline scripts and event handlers cannot execute.
 */
export function buildContentSecurityPolicy({
  nonce,
  isProduction,
  parserOrigin = "",
}: CspOptions): string {
  const connectSources = ["'self'", parserOrigin].filter(Boolean).join(" ");
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'wasm-unsafe-eval'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
  ].join(" ");

  return compact(
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Tailwind/React may still emit inline style attributes. Script execution
      // is independently protected by the nonce policy below.
      "style-src 'self' 'unsafe-inline'",
      `script-src ${scriptSources}`,
      "script-src-attr 'none'",
      `connect-src ${connectSources}`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  );
}
