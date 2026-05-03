const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
let refreshPromise = null;

export async function requestApi(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token") || options.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !options.skipAuthRefresh && canRefresh(path)) {
    try {
      const newToken = await refreshAccessTokenInternal();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
      } else {
        delete headers.Authorization;
      }
      response = await fetch(`${API_URL}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw error;
    }
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.detail ? data.detail : "Request failed";
    throw new Error(message);
  }

  return data;
}

function canRefresh(path) {
  return path !== "/auth/login" && path !== "/auth/register" && path !== "/auth/refresh";
}

async function refreshAccessTokenInternal() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    clearStoredAuth();
    throw new Error("Session expired. Please login again.");
  }

  refreshPromise = (async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok || !data || !data.access_token) {
      clearStoredAuth();
      const message = data && data.detail ? data.detail : "Session expired. Please login again.";
      throw new Error(message);
    }

    localStorage.setItem("token", data.access_token);
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}
