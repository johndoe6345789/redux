/**
 * Turns a caught sign-in error into copy that's safe to show a user.
 *
 * Every error this package throws on purpose (oidcClient.ts, pkce.ts) is a
 * plain `new Error(...)` with a message already written to be read by an end
 * user -- e.g. pkce.ts's secure-context message, or "Sign-in session expired
 * or invalid -- please try again". Those pass through unchanged: they're
 * already specific about what happened and, where possible, what to do.
 *
 * Anything else reaching a sign-in catch block is NOT one of ours: a
 * TypeError from a fetch that never reached the network, a SyntaxError from
 * `res.json()` choking on an HTML error page, or a raw engine exception like
 * the "Cannot read properties of undefined (reading 'digest')" bug this
 * function replaces (see redux/dbal-sso commit c1c8d9a and MetaBuilder
 * CLAUDE.md's gotcha table). Those name an internal, not something the user
 * can act on -- but "something went wrong, try again" for all of them alike
 * would leave a user with a dead VPN unable to tell that apart from a DBAL
 * outage, so the common cases still get their own copy. The one case that
 * really is opaque (an engine exception nobody anticipated) still says so
 * explicitly rather than pretending to know the cause.
 *
 * Note network failures are matched by message, not just `instanceof
 * TypeError` -- a fetch that never reaches the network (offline, DNS,
 * CORS, mixed content) throws TypeError with a browser-specific message
 * ("Failed to fetch", "NetworkError when attempting to fetch resource",
 * "Load failed"), but so does any ordinary "reading property of undefined"
 * code bug (see the digest bug this function replaces). Matching the
 * constructor alone would mislabel the next such bug as a connectivity
 * problem instead of surfacing it as the unrecognised failure it is.
 */
export function friendlySignInError(error: unknown): string {
  if (error instanceof Error && error.constructor === Error) {
    return error.message
  }

  console.error('Unexpected sign-in error:', error)

  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return "Can't reach the sign-in server. Check your network connection (including VPN/Tailscale) and try again."
  }
  if (error instanceof SyntaxError) {
    return 'The sign-in server sent back an unexpected response. Please try again in a moment.'
  }
  return 'An unexpected error stopped sign-in from completing. Please try again; if it keeps happening, contact support.'
}
