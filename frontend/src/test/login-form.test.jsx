import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import authReducer from "../features/authSlice.js";
import courseReducer from "../features/courseSlice.js";
import LoginPage from "../pages/LoginPage.jsx";

const navigateMock = vi.fn();
const loginUserMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("../services/authApi.js", () => ({
  loginUser: (...args) => loginUserMock(...args),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: (...args) => toastSuccessMock(...args),
    error: (...args) => toastErrorMock(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("LoginPage", () => {
  beforeEach(() => {
    loginUserMock.mockReset();
    navigateMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    localStorage.clear();
  });

  it("submits credentials and navigates on success", async () => {
    loginUserMock.mockResolvedValue({
      user: { id: 1, email: "user@example.com", role: "user", is_banned: false },
      access_token: "token",
      refresh_token: "refresh",
    });

    const store = configureStore({
      reducer: { auth: authReducer, course: courseReducer },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>,
    );

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledWith({ email: "user@example.com", password: "secret123" });
      expect(navigateMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
