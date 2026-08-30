import type { RequestBodyPart, RequestBodySummary } from "./types";

/** True for the serializable stand-in {@link summarizeBody} produces — what a
 *  raw-body call's `ApiCall.requestBody` holds once it's off the wire. */
export function isBodySummary(value: unknown): value is RequestBodySummary {
  if (!value || typeof value !== "object" || !("kind" in value)) return false;
  const kind = (value as { kind: unknown }).kind;
  return kind === "multipart" || kind === "binary";
}

/** A `FormData` or raw `Blob`/`File` — sent through `fetch` (and the proxy)
 *  as-is, never `JSON.stringify`'d. */
export type RawBody = FormData | Blob;

export function isRawBody(body: unknown): body is RawBody {
  return (
    typeof FormData !== "undefined" &&
    (body instanceof FormData || body instanceof Blob)
  );
}

function describeFile(value: Blob): { name: string; size: number; type: string } {
  return {
    name: value instanceof File ? value.name : "blob",
    size: value.size,
    type: value.type || "application/octet-stream",
  };
}

/**
 * Turns a `FormData` / `Blob` request body into a JSON-serializable
 * {@link RequestBodySummary} for the call record. The live object is used only
 * for the actual `fetch` — storing it in Redux state would trip
 * `@reduxjs/toolkit`'s serializability check and can't survive the
 * `localforage` persistence layer.
 */
export function summarizeBody(body: RawBody): RequestBodySummary {
  if (body instanceof FormData) {
    const parts: RequestBodyPart[] = [];
    for (const [key, value] of body.entries()) {
      parts.push(
        value instanceof Blob
          ? { key, value: describeFile(value).name, file: describeFile(value) }
          : { key, value },
      );
    }
    return { kind: "multipart", parts };
  }
  const { name, size, type } = describeFile(body);
  return { kind: "binary", name, size, type };
}
