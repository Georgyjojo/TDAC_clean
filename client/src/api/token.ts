const API_BASE_URL = "http://127.0.0.1:8000";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setTokens(
  accessToken: string,
  refreshToken: string
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/refresh?refresh_token=${encodeURIComponent(
      refreshToken
    )}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.detail || "Unable to refresh access token"
    );
  }

  const data = await response.json();

  setAccessToken(data.access_token);

  return data.access_token;
}