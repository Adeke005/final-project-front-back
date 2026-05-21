import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import CategoryEditorForm from "../components/CategoryEditorForm.jsx";
import Button from "../components/Button.jsx";
import CourseCard from "../components/CourseCard.jsx";
import CourseEditorForm from "../components/CourseEditorForm.jsx";
import DeleteModal from "../components/DeleteModal.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
import UserManagementPanel from "../components/UserManagementPanel.jsx";
import { setCourses, setSelectedCourse } from "../features/courseSlice.js";
import { getMyCertificates } from "../services/certificateApi.js";
import {
  createCategory,
  createCourse,
  deleteCategory,
  deleteCourse,
  getCategories,
  getCoursesFiltered,
  updateCategory,
  updateCourse,
} from "../services/courseApi.js";
import { getMyProgress } from "../services/progressApi.js";
import { getUsers, setUserBanStatus } from "../services/userApi.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { getCompletionPercent } from "../utils/courseProgress.js";
import {
  canManageCourseItem,
  getCategoryIdsFromNames,
  getCourseCategoryNames,
  getDashboardTitle,
  getRoleDescription,
  isAdmin,
  isInstructor,
} from "./dashboardUtils.js";
import { createProgressMap, filterCoursesByState, parseInteger } from "./dashboardFilters.js";

function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get("category") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [difficultyFilter, setDifficultyFilter] = useState(searchParams.get("difficulty") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "id_desc");

  const [categories, setCategories] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [myProgress, setMyProgress] = useState([]);
  const [myCertificates, setMyCertificates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createCourseTitle, setCreateCourseTitle] = useState("");
  const [createCourseDescription, setCreateCourseDescription] = useState("");
  const [createCategoryNames, setCreateCategoryNames] = useState([]);

  const [courseToEdit, setCourseToEdit] = useState(null);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseCategoryNames, setEditCourseCategoryNames] = useState([]);

  const [createCategoryName, setCreateCategoryName] = useState("");
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [courseOffset, setCourseOffset] = useState(parseInteger(searchParams.get("offset")));
  const courseLimit = 10;
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const isAdminRole = isAdmin(user);
  const isInstructorRole = isInstructor(user);
  const dashboardTitle = getDashboardTitle(user);
  const roleDescription = getRoleDescription(user ? user.role : "user");

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseList, categoryList, progressList] = await Promise.all([
        getCoursesFiltered(token, {
          search: debouncedSearch,
          categoryId: selectedCategoryId,
          sortBy,
        }),
        getCategories(token),
        getMyProgress(token).catch(() => []),
      ]);

      setAllCourses(courseList);
      setCategories(categoryList);
      setMyProgress(progressList);

      try {
        const certificateList = await getMyCertificates(token);
        setMyCertificates(certificateList);
      } catch {
        setMyCertificates([]);
      }

      if (isAdminRole) {
        const userList = await getUsers(token);
        setUsers(userList);
      } else {
        setUsers([]);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isAdminRole, selectedCategoryId, sortBy, token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const progressByCourseId = useMemo(() => createProgressMap(myProgress), [myProgress]);

  const filteredCourses = useMemo(() => {
    return filterCoursesByState(allCourses, {
      difficultyFilter,
      statusFilter,
      sortBy,
      progressByCourseId,
    });
  }, [allCourses, difficultyFilter, progressByCourseId, sortBy, statusFilter]);

  const paginatedCourses = useMemo(() => {
    return filteredCourses.slice(courseOffset, courseOffset + courseLimit);
  }, [courseLimit, courseOffset, filteredCourses]);

  const continueLearningCourses = useMemo(() => {
    return filteredCourses
      .map((course) => ({
        course,
        progressPercent: getCompletionPercent(course, progressByCourseId.get(course.id), user?.id),
      }))
      .filter((item) => item.progressPercent > 0 && item.progressPercent < 100)
      .sort((firstItem, secondItem) => secondItem.progressPercent - firstItem.progressPercent)
      .slice(0, 4);
  }, [filteredCourses, progressByCourseId, user?.id]);

  const hasMoreCourses = courseOffset + courseLimit < filteredCourses.length;

  useEffect(() => {
    if (courseOffset > 0 && courseOffset >= filteredCourses.length) {
      setCourseOffset(0);
    }
  }, [courseOffset, filteredCourses.length]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (debouncedSearch) {
      nextParams.set("q", debouncedSearch);
    }
    if (selectedCategoryId !== "all") {
      nextParams.set("category", selectedCategoryId);
    }
    if (statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    }
    if (difficultyFilter !== "all") {
      nextParams.set("difficulty", difficultyFilter);
    }
    if (sortBy !== "id_desc") {
      nextParams.set("sort", sortBy);
    }
    if (courseOffset > 0) {
      nextParams.set("offset", String(courseOffset));
    }
    setSearchParams(nextParams, { replace: true });
  }, [courseOffset, debouncedSearch, difficultyFilter, selectedCategoryId, setSearchParams, sortBy, statusFilter]);

  useEffect(() => {
    dispatch(setCourses(filteredCourses));
  }, [dispatch, filteredCourses]);

  const roleStats = useMemo(() => {
    const myCourseCount = filteredCourses.filter((course) => course.owner_id === user?.id).length;

    if (isAdminRole) {
      return [
        { label: "Users", value: users.length },
        { label: "Categories", value: categories.length },
        { label: "Courses", value: filteredCourses.length },
      ];
    }

    if (isInstructorRole) {
      return [
        { label: "My Courses", value: myCourseCount },
        { label: "All Courses", value: filteredCourses.length },
        { label: "Categories", value: categories.length },
      ];
    }

    return [];
  }, [isAdminRole, isInstructorRole, users.length, categories.length, filteredCourses, user?.id]);

  function clearCreateCourseForm() {
    setCreateCourseTitle("");
    setCreateCourseDescription("");
    setCreateCategoryNames([]);
  }

  function closeEditCourseModal() {
    setCourseToEdit(null);
    setEditCourseTitle("");
    setEditCourseDescription("");
    setEditCourseCategoryNames([]);
  }

  function closeEditCategoryModal() {
    setCategoryToEdit(null);
    setEditCategoryName("");
  }

  function toggleCategoryInList(categoryNameToToggle, selectedNames, setSelectedNames) {
    const isSelected = selectedNames.includes(categoryNameToToggle);
    if (isSelected) {
      setSelectedNames(selectedNames.filter((name) => name !== categoryNameToToggle));
      return;
    }

    setSelectedNames([...selectedNames, categoryNameToToggle]);
  }

  function toggleCreateCourseCategoryName(categoryNameToToggle) {
    toggleCategoryInList(categoryNameToToggle, createCategoryNames, setCreateCategoryNames);
  }

  function toggleEditCourseCategoryName(categoryNameToToggle) {
    toggleCategoryInList(categoryNameToToggle, editCourseCategoryNames, setEditCourseCategoryNames);
  }

  async function submitCreateCourse(event) {
    event.preventDefault();
    const categoryIds = getCategoryIdsFromNames(createCategoryNames, categories);
    const payload = {
      title: createCourseTitle,
      description: createCourseDescription,
      category_ids: categoryIds,
    };

    try {
      await createCourse(payload, token);
      toast.success("Course created");
      clearCreateCourseForm();
      loadDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openEditCourseModal(course) {
    setCourseToEdit(course);
    setEditCourseTitle(course.title);
    setEditCourseDescription(course.description);
    setEditCourseCategoryNames(getCourseCategoryNames(course));
  }

  async function submitEditCourse(event) {
    event.preventDefault();
    if (!courseToEdit) {
      return;
    }

    const categoryIds = getCategoryIdsFromNames(editCourseCategoryNames, categories);
    const payload = {
      title: editCourseTitle,
      description: editCourseDescription,
      category_ids: categoryIds,
    };

    try {
      await updateCourse(courseToEdit.id, payload, token);
      toast.success("Course updated");
      closeEditCourseModal();
      loadDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function submitCategoryCreate(event) {
    event.preventDefault();

    try {
      await createCategory({ name: createCategoryName }, token);
      toast.success("Category created");
      setCreateCategoryName("");
      loadDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openEditCategoryModal(category) {
    setCategoryToEdit(category);
    setEditCategoryName(category.name);
  }

  async function submitEditCategory(event) {
    event.preventDefault();
    if (!categoryToEdit) {
      return;
    }

    try {
      await updateCategory(categoryToEdit.id, { name: editCategoryName }, token);
      toast.success("Category updated");
      closeEditCategoryModal();
      loadDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function toggleUserBan(userItem) {
    const nextValue = !userItem.is_banned;

    try {
      await setUserBanStatus(userItem.id, nextValue, token);
      if (nextValue) {
        toast.success("User banned");
      } else {
        toast.success("User unbanned");
      }
      loadDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openCourse(course) {
    dispatch(setSelectedCourse(course));
    navigate(`/course/${course.id}`);
  }

  function askDeleteCourse(course) {
    setDeleteTarget({
      type: "course",
      id: course.id,
      name: course.title,
    });
  }

  function askDeleteCategory(category) {
    setDeleteTarget({
      type: "category",
      id: category.id,
      name: category.name,
    });
  }

  async function confirmDeleteTarget() {
    if (!deleteTarget) {
      return;
    }

    try {
      if (deleteTarget.type === "course") {
        await deleteCourse(deleteTarget.id, token);
        toast.success("Course deleted");
      }
      if (deleteTarget.type === "category") {
        await deleteCategory(deleteTarget.id, token);
        toast.success("Category deleted");
      }

      setDeleteTarget(null);
      loadDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function goToPreviousCoursesPage() {
    if (courseOffset === 0) {
      return;
    }
    setCourseOffset(Math.max(0, courseOffset - courseLimit));
  }

  function goToNextCoursesPage() {
    if (!hasMoreCourses) {
      return;
    }
    setCourseOffset(courseOffset + courseLimit);
  }

  function handleSearchInputChange(event) {
    setSearchInput(event.target.value);
    setCourseOffset(0);
  }

  function handleCategoryFilterChange(event) {
    setSelectedCategoryId(event.target.value);
    setCourseOffset(0);
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCourseOffset(0);
  }

  function handleDifficultyFilterChange(event) {
    setDifficultyFilter(event.target.value);
    setCourseOffset(0);
  }

  function handleSortChange(event) {
    setSortBy(event.target.value);
    setCourseOffset(0);
  }

  if (loading) {
    return (
      <section className="page">
        <SkeletonCard lines={4} />
        <div className="grid-two">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <SkeletonCard lines={6} />
      </section>
    );
  }

  return (
    <section className="page">
      <section className="workspace-hero card">
        <h2>{dashboardTitle}</h2>
        <p>{roleDescription}</p>
        {roleStats.length > 0 && (
          <div className="stats-row">
            {roleStats.map((item) => (
              <article key={item.label} className="stat-card">
                <span>{item.label}</span>
                <h3>{item.value}</h3>
              </article>
            ))}
          </div>
        )}
      </section>

      {isInstructorRole && (
        <section className="grid-two">
          <CourseEditorForm
            editingCourseId={null}
            courseTitle={createCourseTitle}
            courseDescription={createCourseDescription}
            categories={categories}
            selectedCategoryNames={createCategoryNames}
            setCourseTitle={setCreateCourseTitle}
            setCourseDescription={setCreateCourseDescription}
            onToggleCategoryName={toggleCreateCourseCategoryName}
            onSubmit={submitCreateCourse}
            onClear={clearCreateCourseForm}
          />
          <section className="card form panel-card">
            <h3>Instructor Notes</h3>
            <p className="small-text">Course owner is always the instructor who created the course.</p>
            <p className="small-text">Admin can manage categories and users, but not course ownership.</p>
          </section>
        </section>
      )}

      {isAdminRole && (
        <section className="grid-two">
          <CategoryEditorForm
            categories={categories}
            createName={createCategoryName}
            setCreateName={setCreateCategoryName}
            onCreateCategory={submitCategoryCreate}
            onOpenEditCategory={openEditCategoryModal}
            onAskDeleteCategory={askDeleteCategory}
          />
          <UserManagementPanel users={users} currentUser={user} onToggleBan={toggleUserBan} />
        </section>
      )}

      <section className="card form panel-card">
        <div className="section-header">
          <h3>Search And Filters</h3>
          <span className="small-text">Filters are saved in URL query params.</span>
        </div>
        <div className="grid-three">
          <Input
            label="Search Courses"
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder="Search by title or description..."
          />
          <label className="input-group">
            <span className="input-label">Category</span>
            <select value={selectedCategoryId} onChange={handleCategoryFilterChange}>
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="input-group">
            <span className="input-label">Status</span>
            <select value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="started">Started</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="input-group">
            <span className="input-label">Difficulty</span>
            <select value={difficultyFilter} onChange={handleDifficultyFilterChange}>
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="input-group">
            <span className="input-label">Sort</span>
            <select value={sortBy} onChange={handleSortChange}>
              <option value="id_desc">Newest</option>
              <option value="id_asc">Oldest</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
            </select>
          </label>
          <div className="input-group">
            <span className="input-label">Result Summary</span>
            <p className="small-text">
              {filteredCourses.length} results • Showing {paginatedCourses.length}
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Course Catalog</h3>
          {(isAdminRole || isInstructorRole) && (
            <span className="small-text">{filteredCourses.length} total courses</span>
          )}
        </div>
        <div className="row">
          <Button text="Previous" variant="secondary" onClick={goToPreviousCoursesPage} disabled={courseOffset === 0} />
          <Button text="Next" variant="secondary" onClick={goToNextCoursesPage} disabled={!hasMoreCourses} />
        </div>
        <div className="grid-three">
          {paginatedCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progressPercent={getCompletionPercent(course, progressByCourseId.get(course.id), user?.id)}
              canEditCourse={canManageCourseItem(user, course)}
              onOpenCourse={openCourse}
              onEditCourse={openEditCourseModal}
              onDeleteCourse={askDeleteCourse}
            />
          ))}
        </div>
        {paginatedCourses.length === 0 && <p className="small-text">No courses match your filters.</p>}
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Continue Learning</h3>
          <span className="small-text">{continueLearningCourses.length} in progress</span>
        </div>
        {continueLearningCourses.length === 0 && (
          <p className="small-text">Start a course and complete lessons to see your learning queue.</p>
        )}
        {continueLearningCourses.length > 0 && (
          <div className="manage-list">
            {continueLearningCourses.map((item) => (
              <button
                key={item.course.id}
                className="manage-row"
                onClick={() => openCourse(item.course)}
              >
                <strong>{item.course.title}</strong>
                <span className="small-text">{item.progressPercent}% complete</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {!isAdminRole && (
        <section className="card">
          <div className="section-header">
            <h3>My Certificates</h3>
            {(isInstructorRole || isAdminRole) && <span className="small-text">{myCertificates.length} earned</span>}
          </div>
          <div className="certificate-list">
            {myCertificates.map((certificate) => (
              <button
                key={certificate.id}
                className="certificate-list-item"
                onClick={() => navigate(`/certificate/${certificate.course_id}`)}
              >
                <span className="certificate-course-name">{getCourseName(allCourses, certificate.course_id)}</span>
                <span>{new Date(certificate.issued_at).toLocaleDateString()}</span>
              </button>
            ))}
            {myCertificates.length === 0 && <p className="small-text">No certificates yet.</p>}
          </div>
        </section>
      )}

      <Modal open={Boolean(courseToEdit)} title="Edit Course" onClose={closeEditCourseModal}>
        <CourseEditorForm
          editingCourseId={courseToEdit ? courseToEdit.id : null}
          courseTitle={editCourseTitle}
          courseDescription={editCourseDescription}
          categories={categories}
          selectedCategoryNames={editCourseCategoryNames}
          setCourseTitle={setEditCourseTitle}
          setCourseDescription={setEditCourseDescription}
          onToggleCategoryName={toggleEditCourseCategoryName}
          onSubmit={submitEditCourse}
          onClear={closeEditCourseModal}
        />
      </Modal>

      <Modal open={Boolean(categoryToEdit)} title="Edit Category" onClose={closeEditCategoryModal}>
        <form className="form" onSubmit={submitEditCategory}>
          <Input
            label="Category Name"
            value={editCategoryName}
            onChange={(event) => setEditCategoryName(event.target.value)}
            required
          />
          <div className="row">
            <Button text="Update Category" type="submit" />
            <Button text="Cancel" variant="secondary" onClick={closeEditCategoryModal} />
          </div>
        </form>
      </Modal>

      <DeleteModal
        open={Boolean(deleteTarget)}
        itemName={deleteTarget ? deleteTarget.name : ""}
        onConfirm={confirmDeleteTarget}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

function getCourseName(courses, courseId) {
  const foundCourse = courses.find((course) => course.id === courseId);
  if (foundCourse) {
    return foundCourse.title;
  }

  return `Course #${courseId}`;
}

export default DashboardPage;
