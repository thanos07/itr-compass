import { createHash } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptedWorkspaces } from "@/db/schema";
import { getDb } from "@/lib/db";
import { readJsonBodyWithLimit } from "@/lib/security/request-body";

export const runtime = "nodejs";

const token = z.string().min(24).max(128);
const encryptedPayload = {
  ciphertext: z.string().min(16),
  iv: z.string().min(8).max(128),
  salt: z.string().min(8).max(128),
  schemaVersion: z.number().int().min(2).max(10).default(2),
};

const createSchema = z.object({
  action: z.literal("create"),
  writeToken: token,
  deleteToken: token,
  ...encryptedPayload,
});
const updateSchema = z.object({
  action: z.literal("update"),
  id: z.string().min(8).max(40),
  writeToken: token,
  ...encryptedPayload,
});
const loadSchema = z.object({ action: z.literal("load"), id: z.string().min(8).max(40) });
const deleteSchema = z.object({ action: z.literal("delete"), id: z.string().min(8).max(40), deleteToken: token });

const DEFAULT_CLOUD_REQUESTS_PER_MINUTE = 12;
const MAX_CLOUD_REQUESTS_PER_MINUTE = 60;

const DEFAULT_MAX_CLOUD_PAYLOAD_BYTES =
  1_500_000;

const MAX_CONFIGURED_CLOUD_PAYLOAD_BYTES =
  5_000_000;

const CLOUD_BODY_ENVELOPE_BYTES =
  16_384;

const buckets = new Map<
  string,
  {
    count: number;
    resetAt: number;
  }
>();

function resolveConfiguredInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(
      Math.floor(parsed),
      minimum,
    ),
    maximum,
  );
}

function getCloudRateLimit(): number {
  return resolveConfiguredInteger(
    process.env.CLOUD_REQUESTS_PER_MINUTE,
    DEFAULT_CLOUD_REQUESTS_PER_MINUTE,
    2,
    MAX_CLOUD_REQUESTS_PER_MINUTE,
  );
}

function getMaxCloudPayloadBytes(): number {
  return resolveConfiguredInteger(
    process.env.MAX_CLOUD_PAYLOAD_BYTES,
    DEFAULT_MAX_CLOUD_PAYLOAD_BYTES,
    1,
    MAX_CONFIGURED_CLOUD_PAYLOAD_BYTES,
  );
}

function getClientIp(
  request: Request,
): string {
  /*
   * Prefer Vercel's platform-specific forwarded IP.
   * This also keeps cloud rate limiting aligned with
   * the AI and agent request-boundary logic.
   */
  const vercelForwarded =
    request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0]
      ?.trim();

  if (vercelForwarded) {
    return vercelForwarded;
  }

  const realIp =
    request.headers
      .get("x-real-ip")
      ?.trim();

  if (realIp) {
    return realIp;
  }

  const forwardedEntries =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  return (
    forwardedEntries?.at(-1) ??
    "unknown"
  );
}

function allowRequest(
  request: Request,
): boolean {
  const key = getClientIp(request);
  const now = Date.now();
  const limit = getCloudRateLimit();

  /*
   * Periodically remove expired entries instead of
   * retaining stale buckets for the process lifetime.
   */
  if (buckets.size > 5_000) {
    for (
      const [bucketKey, bucket]
      of buckets
    ) {
      if (bucket.resetAt <= now) {
        buckets.delete(bucketKey);
      }
    }
  }

  const current =
    buckets.get(key);

  if (
    !current ||
    current.resetAt <= now
  ) {
    buckets.set(key, {
      count: 1,
      resetAt: now + 60_000,
    });

    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

function createId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 24);
}

function hashToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function configuredBodyLimit() {
  return (
    getMaxCloudPayloadBytes() +
    CLOUD_BODY_ENVELOPE_BYTES
  );
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  if (!allowRequest(request)) return jsonResponse({ error: "Cloud request limit reached. Wait one minute and try again." }, { status: 429 });
  const bodyResult =
    await readJsonBodyWithLimit(
      request,
      configuredBodyLimit(),
    );

  if (
    !bodyResult.ok &&
    bodyResult.reason === "too-large"
  ) {
    return jsonResponse(
      {
        error:
          "Cloud request is too large.",
      },
      {
        status: 413,
      },
    );
  }

  /*
   * Preserve the route's existing malformed/empty JSON behavior:
   * invalid JSON continues downstream as null and is ultimately
   * handled as an invalid/unknown action when cloud storage exists.
   */
  const body =
    bodyResult.ok
      ? bodyResult.value
      : null;

  const db = getDb();
  if (!db) return jsonResponse({ error: "Cloud save is not configured." }, { status: 503 });

  await db.delete(encryptedWorkspaces).where(lt(encryptedWorkspaces.expiresAt, new Date())).catch(() => undefined);
  const action =
    body &&
    typeof body === "object" &&
    "action" in body
      ? (body as { action?: unknown }).action
      : undefined;
  const maxBytes =
    getMaxCloudPayloadBytes();

  if (action === "create") {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ error: "Invalid encrypted payload." }, { status: 400 });
    if (Buffer.byteLength(parsed.data.ciphertext, "utf8") > maxBytes) return jsonResponse({ error: "Encrypted workspace is too large for cloud save." }, { status: 413 });
    const id = createId();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await db.insert(encryptedWorkspaces).values({
      id,
      ciphertext: parsed.data.ciphertext,
      iv: parsed.data.iv,
      salt: parsed.data.salt,
      writeTokenHash: hashToken(parsed.data.writeToken),
      deleteTokenHash: hashToken(parsed.data.deleteToken),
      schemaVersion: parsed.data.schemaVersion,
      expiresAt,
      updatedAt: new Date(),
    });
    return jsonResponse({ id, expiresAt: expiresAt.toISOString() }, { status: 201 });
  }

  if (action === "update") {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ error: "Invalid encrypted update." }, { status: 400 });
    if (Buffer.byteLength(parsed.data.ciphertext, "utf8") > maxBytes) return jsonResponse({ error: "Encrypted workspace is too large for cloud save." }, { status: 413 });
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const rows = await db.update(encryptedWorkspaces).set({
      ciphertext: parsed.data.ciphertext,
      iv: parsed.data.iv,
      salt: parsed.data.salt,
      schemaVersion: parsed.data.schemaVersion,
      expiresAt,
      updatedAt: new Date(),
    }).where(and(
      eq(encryptedWorkspaces.id, parsed.data.id),
      eq(encryptedWorkspaces.writeTokenHash, hashToken(parsed.data.writeToken)),
      gt(encryptedWorkspaces.expiresAt, new Date()),
    )).returning({ id: encryptedWorkspaces.id });
    if (!rows[0]) return jsonResponse({ error: "Workspace not found, expired or owner update token is invalid." }, { status: 403 });
    return jsonResponse({ id: parsed.data.id, expiresAt: expiresAt.toISOString() });
  }

  if (action === "load") {
    const parsed = loadSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ error: "Invalid workspace id." }, { status: 400 });
    const rows = await db.select({
      ciphertext: encryptedWorkspaces.ciphertext,
      iv: encryptedWorkspaces.iv,
      salt: encryptedWorkspaces.salt,
      schemaVersion: encryptedWorkspaces.schemaVersion,
      expiresAt: encryptedWorkspaces.expiresAt,
    }).from(encryptedWorkspaces).where(and(
      eq(encryptedWorkspaces.id, parsed.data.id),
      gt(encryptedWorkspaces.expiresAt, new Date()),
    )).limit(1);
    if (!rows[0]) return jsonResponse({ error: "Workspace not found or expired." }, { status: 404 });
    return jsonResponse(rows[0]);
  }

  if (action === "delete") {
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return jsonResponse({ error: "Invalid deletion request." }, { status: 400 });
    const rows = await db.delete(encryptedWorkspaces).where(and(
      eq(encryptedWorkspaces.id, parsed.data.id),
      eq(encryptedWorkspaces.deleteTokenHash, hashToken(parsed.data.deleteToken)),
    )).returning({ id: encryptedWorkspaces.id });
    if (!rows[0]) return jsonResponse({ error: "Workspace not found or deletion token is invalid." }, { status: 403 });
    return jsonResponse({ deleted: true });
  }

  return jsonResponse({ error: "Unknown action." }, { status: 400 });
}
