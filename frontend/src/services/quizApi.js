import { requestApi } from "./apiClient.js";

export function getQuizByCourse(courseId, token) {
  return requestApi(`/quiz/course/${courseId}`, { token });
}

export function createQuizQuestion(courseId, payload, token) {
  return requestApi(`/quiz/course/${courseId}`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function updateQuizQuestion(quizId, payload, token) {
  return requestApi(`/quiz/${quizId}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteQuizQuestion(quizId, token) {
  return requestApi(`/quiz/${quizId}`, {
    method: "DELETE",
    token,
  });
}

export function submitQuiz(courseId, answers, token) {
  return requestApi(`/quiz/course/${courseId}/submit`, {
    method: "POST",
    body: { answers },
    token,
  });
}
