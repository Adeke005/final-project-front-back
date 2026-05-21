const STORAGE_KEY = "lesson_progress_by_user";

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function getStorageRoot() {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return {};
  }
  const parsedValue = safeParse(rawValue);
  if (typeof parsedValue !== "object" || parsedValue === null) {
    return {};
  }
  return parsedValue;
}

function saveStorageRoot(rootValue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rootValue));
}

function getUserKey(userId) {
  if (!userId) {
    return "anonymous";
  }
  return String(userId);
}

export function getLessonProgressByCourse(userId) {
  const rootValue = getStorageRoot();
  const userKey = getUserKey(userId);
  const userProgress = rootValue[userKey];
  if (typeof userProgress !== "object" || userProgress === null) {
    return {};
  }
  return userProgress;
}

export function getCompletedLessonIds(userId, courseId) {
  const byCourse = getLessonProgressByCourse(userId);
  const entry = byCourse[String(courseId)];
  if (!Array.isArray(entry)) {
    return [];
  }
  return entry;
}

export function isLessonCompleted(userId, courseId, lessonId) {
  const completedIds = getCompletedLessonIds(userId, courseId);
  return completedIds.includes(lessonId);
}

export function toggleLessonCompletion(userId, courseId, lessonId) {
  const rootValue = getStorageRoot();
  const userKey = getUserKey(userId);
  if (!rootValue[userKey] || typeof rootValue[userKey] !== "object") {
    rootValue[userKey] = {};
  }

  const courseKey = String(courseId);
  const currentIds = Array.isArray(rootValue[userKey][courseKey]) ? rootValue[userKey][courseKey] : [];
  const isCompleted = currentIds.includes(lessonId);

  if (isCompleted) {
    rootValue[userKey][courseKey] = currentIds.filter((id) => id !== lessonId);
  } else {
    rootValue[userKey][courseKey] = [...currentIds, lessonId];
  }

  saveStorageRoot(rootValue);
  return !isCompleted;
}

export function getCompletionPercent(course, progressItem, userId) {
  if (progressItem?.completed) {
    return 100;
  }

  const totalLessons = course.lessons?.length || 0;
  if (totalLessons === 0) {
    return progressItem ? 15 : 0;
  }

  const completedLessons = getCompletedLessonIds(userId, course.id).length;
  const completionPercent = Math.round((completedLessons / totalLessons) * 100);
  if (completionPercent === 0 && progressItem) {
    return 10;
  }
  return completionPercent;
}
