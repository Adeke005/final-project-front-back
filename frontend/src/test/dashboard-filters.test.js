import { createProgressMap, filterCoursesByState, parseInteger } from "../pages/dashboardFilters.js";

describe("dashboardFilters", () => {
  const courses = [
    { id: 1, title: "Alpha", lessons: [{ id: 1 }] },
    { id: 2, title: "Beta", lessons: [{ id: 2 }, { id: 3 }, { id: 4 }] },
    { id: 3, title: "Gamma", lessons: [{ id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }] },
  ];

  const progress = createProgressMap([
    { course_id: 1, completed: false },
    { course_id: 3, completed: true },
  ]);

  it("parses offset safely", () => {
    expect(parseInteger("20")).toBe(20);
    expect(parseInteger("-4")).toBe(0);
    expect(parseInteger("abc")).toBe(0);
  });

  it("filters by status and difficulty", () => {
    const filtered = filterCoursesByState(courses, {
      statusFilter: "completed",
      difficultyFilter: "advanced",
      sortBy: "id_desc",
      progressByCourseId: progress,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(3);
  });
});
