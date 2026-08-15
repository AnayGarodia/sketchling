// The whole scene lives in the URL hash, so a link is the entire share mechanism — no
// server, no paste service, nothing to expire. Scenes compress well (they are mostly
// repeated coordinates and property names), so the hash is deflate-raw + base64url where the
// browser supports Compression Streams, with a plain base64url fallback that every browser
// can read. Both prefixes are always decodable, so old links keep working either way.
const DEFLATED = "s";
const PLAIN = "src";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const body = new Response(bytes as BodyInit).body;
  if (!body) throw new Error("no request body stream");
  return new Uint8Array(await new Response(body.pipeThrough(transform)).arrayBuffer());
}

export async function encodeSource(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  if (typeof CompressionStream === "function") {
    try {
      return `#${DEFLATED}=${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
    } catch {
      // Fall through to the uncompressed form rather than failing to produce a link at all.
    }
  }
  return `#${PLAIN}=${toBase64Url(bytes)}`;
}

export async function decodeSource(hash: string): Promise<string | undefined> {
  const match = hash.replace(/^#/, "").match(/^(s|src)=(.+)$/);
  if (!match) return undefined;
  const [, kind, payload] = match;
  try {
    const bytes = fromBase64Url(payload);
    if (kind === PLAIN) return new TextDecoder().decode(bytes);
    if (typeof DecompressionStream !== "function") return undefined;
    return new TextDecoder().decode(await pipe(bytes, new DecompressionStream("deflate-raw")));
  } catch {
    return undefined;
  }
}
