import { requestApi } from "./apiClient.js";

export function getCertificateByCourse(courseId, token) {
  return requestApi(`/certificate/course/${courseId}`, { token });
}

export function getMyCertificates(token) {
  return requestApi("/certificate/my", { token });
}