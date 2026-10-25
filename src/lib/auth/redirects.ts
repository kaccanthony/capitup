const internalOrigin = "https://capitup.invalid";

export function safeInternalRedirect(
  candidate: string | null | undefined,
  fallback = "/",
) {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, internalOrigin);

    if (url.origin !== internalOrigin || url.username || url.password) {
      return fallback;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
