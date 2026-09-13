import {
  getAccessToken,
  refreshAccessToken,
  clearTokens,
} from "./token";

const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Holds the currently running refresh operation.
 *
 * If multiple requests receive a 401 at the same time,
 * they will all wait for this same refresh operation
 * instead of starting separate refresh requests.
 */
let refreshPromise: Promise<string> | null = null;

export async function apiClient(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  let accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${accessToken}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Request succeeded or failed for a reason other than authentication.
  if (response.status !== 401) {
    return response;
  }

  /*
   * The access token has expired.
   *
   * If another request is already refreshing the token,
   * wait for that same refresh operation.
   */
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    accessToken = await refreshPromise;
  } catch (error) {
    clearTokens();
    throw error;
  }

  /*
   * Retry the original request using the new access token.
   */
  const retryHeaders = new Headers(options.headers);

  retryHeaders.set("Authorization", `Bearer ${accessToken}`);

  if (options.body && !retryHeaders.has("Content-Type")) {
    retryHeaders.set("Content-Type", "application/json");
  }

  response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: retryHeaders,
  });

  return response;
}