import { requestApi } from "./apiClient.js";

export function startCourseProgress(courseId, token) {
  return requestApi(`/progress/course/${courseId}/start`, {
    method: "POST",
    token,
  });
}

export function getCourseProgress(courseId, token) {
  return requestApi(`/progress/course/${courseId}`, { token });
}
