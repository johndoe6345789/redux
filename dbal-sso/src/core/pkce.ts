/** PKCE (RFC 7636) primitives. Hand-rolled rather than a dependency -- this
 * is ~15 lines of well-understood Web Crypto, ported verbatim from
 * pastebin's original implementation (the only prior consumer). Not worth
 * a new dependency in every app that imports this package for. */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export async function sha256Base64Url(input: string): Promise<string> {
  // crypto.subtle only exists in a secure context. Browsers treat https://,
  // http://localhost and http://127.0.0.1 as secure -- but NOT http://0.0.0.0,
  // which is exactly what a container bound to 0.0.0.0 invites you to type.
  // Without this guard the next line throws "Cannot read properties of
  // undefined (reading 'digest')", which points at this library rather than at
  // the address bar. crypto.getRandomValues above is not gated the same way, so
  // randomString() succeeds first and the failure lands mid-sign-in.
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    const origin = typeof window === 'undefined' ? 'this context' : window.location.origin
    throw new Error(
      `Sign-in needs a secure context for PKCE, but ${origin} is not one. ` +
      'Use https:// or http://localhost (http://127.0.0.1 also works); ' +
      'http://0.0.0.0 is not treated as secure by browsers.'
    )
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return base64UrlEncode(new Uint8Array(digest))
}
