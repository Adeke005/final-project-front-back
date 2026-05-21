import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import authReducer from "../features/authSlice.js";
import ProtectedRoute from "../components/ProtectedRoute.jsx";

function renderWithAuth(authState) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={(
              <ProtectedRoute>
                <div>Private page</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects to login when token is missing", () => {
    renderWithAuth({ user: null, token: null, refreshToken: null });
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders children when token exists", () => {
    renderWithAuth({ user: { id: 1, role: "user" }, token: "abc", refreshToken: "ref" });
    expect(screen.getByText("Private page")).toBeInTheDocument();
  });
});
