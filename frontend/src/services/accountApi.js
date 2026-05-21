import { requestApi } from "./apiClient.js";

export function getAccountMe(token) {
  return requestApi("/account/me", { token });
}

export function updateAccountMe(payload, token) {
  return requestApi("/account/me", {
    method: "PUT",
    body: payload,
    token,
  });
}

export function changeAccountPassword(payload, token) {
  return requestApi("/account/password", {
    method: "PUT",
    body: payload,
    token,
  });
}

export function getAccountSessions(token) {
  return requestApi("/account/sessions", { token });
}

export function revokeAccountSession(sessionId, token) {
  return requestApi(`/account/sessions/${sessionId}`, {
    method: "DELETE",
    token,
  });
}
