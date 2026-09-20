export class UpstreamError extends Error {
  constructor(public provider: string, public code: string) {
    super(`${provider}: ${code}`);
    this.name = "UpstreamError";
  }
}

export async function fetchJson<T>(
  url: string,
  provider: string,
  init: RequestInit = {},
  timeoutMs = 9000
): Promise<T> {
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new UpstreamError(provider, `HTTP_${response.status}`);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    // Never log request URLs: upstream URLs can contain private API credentials.
    throw new UpstreamError(provider, error instanceof Error && /timeout|abort/i.test(error.name) ? "TIMEOUT" : "REQUEST_FAILED");
  }
}
