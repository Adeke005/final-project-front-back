export function parseInteger(value) {
  const parsedValue = Number.parseInt(value || "0", 10);
  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return 0;
  }
  return parsedValue;
}

export function createProgressMap(progressItems) {
  const progressMap = new Map();
  for (const progressItem of progressItems) {
    progressMap.set(progressItem.course_id, progressItem);
  }
  return progressMap;
}

export function getCourseDifficulty(course) {
  const lessonCount = course.lessons?.length || 0;
  if (lessonCount <= 2) {
    return "beginner";
  }
  if (lessonCount <= 5) {
    return "intermediate";
  }
  return "advanced";
}

export function matchesStatusFilter(progressItem, statusFilter) {
  if (statusFilter === "all") {
    return true;
  }
  if (statusFilter === "not_started") {
    return progressItem === undefined;
  }
  if (statusFilter === "started") {
    return progressItem !== undefined && progressItem.completed === false;
  }
  if (statusFilter === "completed") {
    return progressItem !== undefined && progressItem.completed === true;
  }
  return true;
}

export function sortCourses(courseList, sortBy) {
  const sortedCourses = [...courseList];
  if (sortBy === "title_asc") {
    sortedCourses.sort((firstCourse, secondCourse) => firstCourse.title.localeCompare(secondCourse.title));
    return sortedCourses;
  }
  if (sortBy === "title_desc") {
    sortedCourses.sort((firstCourse, secondCourse) => secondCourse.title.localeCompare(firstCourse.title));
    return sortedCourses;
  }
  if (sortBy === "id_asc") {
    sortedCourses.sort((firstCourse, secondCourse) => firstCourse.id - secondCourse.id);
    return sortedCourses;
  }
  sortedCourses.sort((firstCourse, secondCourse) => secondCourse.id - firstCourse.id);
  return sortedCourses;
}

export function filterCoursesByState(courses, filters) {
  const filteredCourses = courses.filter((course) => {
    const progressItem = filters.progressByCourseId.get(course.id);
    const matchesStatus = matchesStatusFilter(progressItem, filters.statusFilter);
    if (!matchesStatus) {
      return false;
    }

    if (filters.difficultyFilter === "all") {
      return true;
    }

    return getCourseDifficulty(course) === filters.difficultyFilter;
  });

  return sortCourses(filteredCourses, filters.sortBy);
}
