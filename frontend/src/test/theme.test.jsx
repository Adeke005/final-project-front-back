import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, useTheme } from "../theme/ThemeProvider.jsx";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("toggles and persists theme mode", async () => {
    localStorage.clear();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    expect(localStorage.getItem("ui_theme_mode")).toBe("dark");
  });
});
