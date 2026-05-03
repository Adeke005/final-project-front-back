export function isAdmin(user) {
  if (!user) {
    return false;
  }
  return user.role === "admin";
}

export function isInstructor(user) {
  if (!user) {
    return false;
  }
  return user.role === "instructor";
}

export function canManageCourseItem(user, course) {
  if (!isInstructor(user)) {
    return false;
  }
  return course.owner_id === user.id;
}

export function getCategoryIdsFromNames(selectedCategoryNames, categories) {
  return categories
    .filter((category) => selectedCategoryNames.includes(category.name))
    .map((category) => category.id);
}

export function getDashboardTitle(user) {
  if (isAdmin(user)) {
    return "Admin Control Center";
  }
  if (isInstructor(user)) {
    return "Instructor Workspace";
  }
  return "Student Learning Dashboard";
}

export function getCourseCategoryNames(course) {
  const categories = course.categories || [];
  return categories.map((item) => item.name);
}

export function getRoleDescription(role) {
  if (role === "admin") {
    return "Manage categories and users. Admin can ban/unban users.";
  }
  if (role === "instructor") {
    return "Create and manage your own courses, lessons, and quizzes.";
  }
  return "Open courses, learn lessons, pass quiz, and earn certificates.";
}
