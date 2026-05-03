import { requestApi } from "./apiClient.js";

export function registerUser(payload) {
  return requestApi("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function loginUser(payload) {
  return requestApi("/auth/login", {
    method: "POST",
    body: payload,
    skipAuthRefresh: true,
  });
}

export function getCurrentUser(token) {
  return requestApi("/auth/me", { token });
}

export function refreshAccessToken(refreshToken) {
  return requestApi("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    skipAuthRefresh: true,
  });
}

export function logoutUser(refreshToken, token) {
  return requestApi("/auth/logout", {
    method: "POST",
    body: { refresh_token: refreshToken },
    token,
    skipAuthRefresh: true,
  });
}
