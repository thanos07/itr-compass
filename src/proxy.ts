import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/security/csp";

function parserOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_PARSER_URL;
  if (!configured) return "";

  try {
    return new URL(configured).origin;
  } catch {
    return "";
  }
}

/**
 * Generates a fresh 128-bit CSP nonce for every document request.
 *
 * The CSP is copied to the request so Next.js can discover the nonce and apply
 * it to framework-generated scripts. The same policy is sent on the response
 * for browser enforcement.
 */
export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const policy = buildContentSecurityPolicy({
    nonce,
    isProduction: process.env.NODE_ENV === "production",
    parserOrigin: parserOrigin(),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const reportOnly = process.env.CSP_REPORT_ONLY === "true";
  response.headers.set(
    reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    policy,
  );

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
