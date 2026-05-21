import { requestApi } from "../services/apiClient.js";

describe("apiClient refresh flow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("refreshes token and retries request on 401", async () => {
    localStorage.setItem("token", "old_token");
    localStorage.setItem("refresh_token", "refresh_token");

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "expired" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "new_token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, title: "Course" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await requestApi("/courses/1");
    expect(response).toEqual({ id: 1, title: "Course" });
    expect(localStorage.getItem("token")).toBe("new_token");
  });
});
