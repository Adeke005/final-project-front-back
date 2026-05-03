import { requestApi } from "./apiClient.js";

export function getUsers(token) {
  return requestApi("/users", { token });
}

export function setUserBanStatus(userId, isBanned, token) {
  return requestApi(`/users/${userId}/ban`, {
    method: "PATCH",
    body: { is_banned: isBanned },
    token,
  });
}
