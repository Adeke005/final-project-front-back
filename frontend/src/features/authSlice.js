import { createSlice } from "@reduxjs/toolkit";

function readAuthState() {
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refresh_token");
  const userText = localStorage.getItem("user");

  if (!token || !refreshToken || !userText) {
    return { token: null, refreshToken: null, user: null };
  }

  try {
    return { token, refreshToken, user: JSON.parse(userText) };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

const savedAuth = readAuthState();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedAuth.user,
    token: savedAuth.token,
    refreshToken: savedAuth.refreshToken,
  },
  reducers: {
    setAuth(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || state.refreshToken;
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("token", action.payload.token);
      if (action.payload.refreshToken) {
        localStorage.setItem("refresh_token", action.payload.refreshToken);
      }
    },
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
