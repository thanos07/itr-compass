export type JsonBodyReadResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      reason: "too-large" | "invalid-json";
    };

/**
 * Read a JSON request body while enforcing the limit against
 * the bytes actually received.
 *
 * Content-Length is used only as an early rejection shortcut;
 * the stream itself is always counted so a missing or incorrect
 * header cannot bypass the limit.
 */
export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<JsonBodyReadResult> {
  const declaredLength = Number.parseInt(
    request.headers.get("content-length") ?? "",
    10,
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes
  ) {
    return {
      ok: false,
      reason: "too-large",
    };
  }

  const body = request.body;

  if (!body) {
    return {
      ok: false,
      reason: "invalid-json",
    };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);

        return {
          ok: false,
          reason: "too-large",
        };
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged =
    new Uint8Array(totalBytes);

  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      value: JSON.parse(
        new TextDecoder().decode(merged),
      ),
    };
  } catch {
    return {
      ok: false,
      reason: "invalid-json",
    };
  }
}
