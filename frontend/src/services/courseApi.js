import { requestApi } from "./apiClient.js";

export function getCourses(token) {
  return requestApi("/courses", { token });
}

export function getCoursesPaginated(token, limit = 10, offset = 0) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return requestApi(`/courses?${query.toString()}`, { token });
}

export function getCoursesFiltered(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.search) {
    query.set("search", filters.search);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    query.set("category_id", String(filters.categoryId));
  }
  if (filters.sortBy) {
    query.set("sort_by", filters.sortBy);
  }
  return requestApi(`/courses${query.toString() ? `?${query.toString()}` : ""}`, { token });
}

export function getCourseById(courseId, token) {
  return requestApi(`/courses/${courseId}`, { token });
}

export function createCourse(payload, token) {
  return requestApi("/courses", {
    method: "POST",
    body: payload,
    token,
  });
}

export function updateCourse(courseId, payload, token) {
  return requestApi(`/courses/${courseId}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteCourse(courseId, token) {
  return requestApi(`/courses/${courseId}`, {
    method: "DELETE",
    token,
  });
}

export function getCourseRatingSummary(courseId, token) {
  return requestApi(`/courses/${courseId}/rating`, { token });
}

export function setCourseRating(courseId, rating, token) {
  return requestApi(`/courses/${courseId}/rating`, {
    method: "POST",
    body: { rating },
    token,
  });
}

export function getLessonsByCourse(courseId, token) {
  return requestApi(`/lessons/course/${courseId}`, { token });
}

export function getLessonsByCoursePaginated(courseId, token, limit = 10, offset = 0) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return requestApi(`/lessons/course/${courseId}?${query.toString()}`, { token });
}

export function createLesson(courseId, payload, token) {
  return requestApi(`/lessons/course/${courseId}`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function updateLesson(lessonId, payload, token) {
  return requestApi(`/lessons/${lessonId}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteLesson(lessonId, token) {
  return requestApi(`/lessons/${lessonId}`, {
    method: "DELETE",
    token,
  });
}

export function getAssignmentsByCourse(courseId, token) {
  return requestApi(`/assignments/course/${courseId}`, { token });
}

export function createAssignment(courseId, payload, token) {
  return requestApi(`/assignments/course/${courseId}`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function updateAssignment(assignmentId, payload, token) {
  return requestApi(`/assignments/${assignmentId}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteAssignment(assignmentId, token) {
  return requestApi(`/assignments/${assignmentId}`, {
    method: "DELETE",
    token,
  });
}

export function getCategories(token) {
  return requestApi("/categories", { token });
}

export function createCategory(payload, token) {
  return requestApi("/categories", {
    method: "POST",
    body: payload,
    token,
  });
}

export function updateCategory(categoryId, payload, token) {
  return requestApi(`/categories/${categoryId}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteCategory(categoryId, token) {
  return requestApi(`/categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}
