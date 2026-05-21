import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import DeleteModal from "../components/DeleteModal.jsx";
import Input from "../components/Input.jsx";
import Modal from "../components/Modal.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
import { getCourseProgress, startCourseProgress } from "../services/progressApi.js";
import {
  getCompletedLessonIds,
  getCompletionPercent,
  isLessonCompleted,
  toggleLessonCompletion,
} from "../utils/courseProgress.js";
import {
  createAssignment,
  createLesson,
  deleteAssignment,
  deleteLesson,
  getCourseRatingSummary,
  getAssignmentsByCourse,
  getCourseById,
  getLessonsByCoursePaginated,
  setCourseRating,
  updateAssignment,
  updateLesson,
} from "../services/courseApi.js";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  getQuizByCourse,
  updateQuizQuestion,
} from "../services/quizApi.js";

function CoursePage() {
  const { id } = useParams();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [learningStarted, setLearningStarted] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({
    average_rating: null,
    total_ratings: 0,
    user_rating: null,
  });
  const [_lessonProgressVersion, setLessonProgressVersion] = useState(0);

  const [createLessonTitle, setCreateLessonTitle] = useState("");
  const [createLessonContent, setCreateLessonContent] = useState("");
  const [createAssignmentTitle, setCreateAssignmentTitle] = useState("");
  const [createAssignmentDescription, setCreateAssignmentDescription] = useState("");

  const [createQuizType, setCreateQuizType] = useState("text");
  const [createQuizQuestionText, setCreateQuizQuestionText] = useState("");
  const [createQuizAnswer, setCreateQuizAnswer] = useState("");
  const [createQuizOptionsText, setCreateQuizOptionsText] = useState("");

  const [lessonToEdit, setLessonToEdit] = useState(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonContent, setEditLessonContent] = useState("");

  const [assignmentToEdit, setAssignmentToEdit] = useState(null);
  const [editAssignmentTitle, setEditAssignmentTitle] = useState("");
  const [editAssignmentDescription, setEditAssignmentDescription] = useState("");

  const [quizQuestionToEdit, setQuizQuestionToEdit] = useState(null);
  const [editQuizType, setEditQuizType] = useState("text");
  const [editQuizQuestionText, setEditQuizQuestionText] = useState("");
  const [editQuizAnswer, setEditQuizAnswer] = useState("");
  const [editQuizOptionsText, setEditQuizOptionsText] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lessonOffset, setLessonOffset] = useState(0);
  const [hasMoreLessons, setHasMoreLessons] = useState(false);
  const lessonLimit = 10;

  const loadCoursePageData = useCallback(async () => {
    try {
      const [currentCourse, lessonList, assignmentList] = await Promise.all([
        getCourseById(id, token),
        getLessonsByCoursePaginated(id, token, lessonLimit, lessonOffset),
        getAssignmentsByCourse(id, token),
      ]);
      setCourse(currentCourse);
      setLessons(lessonList);
      setHasMoreLessons(lessonList.length === lessonLimit);
      setAssignments(assignmentList);

      try {
        const quizList = await getQuizByCourse(id, token);
        setQuizQuestions(quizList);
      } catch {
        setQuizQuestions([]);
      }

      try {
        const progressData = await getCourseProgress(id, token);
        setProgress(progressData);
        setLearningStarted(true);
      } catch {
        setProgress(null);
        setLearningStarted(false);
      }

      try {
        const summary = await getCourseRatingSummary(id, token);
        setRatingSummary(summary);
      } catch {
        setRatingSummary({
          average_rating: null,
          total_ratings: 0,
          user_rating: null,
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [id, lessonLimit, lessonOffset, token]);

  useEffect(() => {
    loadCoursePageData();
  }, [loadCoursePageData]);

  useEffect(() => {
    setLessonOffset(0);
  }, [id]);

  function canManageCourse() {
    if (!course || !user) {
      return false;
    }
    return user.role === "instructor" && course.owner_id === user.id;
  }

  function getOptionsFromText(text) {
    return text
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  function getOptionTextFromOptions(options) {
    if (!options || options.length === 0) {
      return "";
    }
    return options.join(", ");
  }

  async function handleStartLearning() {
    try {
      const progressData = await startCourseProgress(id, token);
      setProgress(progressData);
      setLearningStarted(true);
      toast.success("Learning started");
    } catch (error) {
      toast.error(error.message);
    }
  }

  const completedLessonIds = getCompletedLessonIds(user?.id, id);
  const completionPercent = getCompletionPercent(
    { id, lessons },
    progress,
    user?.id,
  );
  const nextLessonToContinue = lessons.find((lesson) => !completedLessonIds.includes(lesson.id));

  async function handleToggleLessonCompletion(lessonId) {
    const isNowCompleted = toggleLessonCompletion(user?.id, id, lessonId);
    setLessonProgressVersion((currentValue) => currentValue + 1);

    if (isNowCompleted && !learningStarted) {
      try {
        const progressData = await startCourseProgress(id, token);
        setProgress(progressData);
        setLearningStarted(true);
      } catch {
        // Keep local completion even if progress API is unavailable.
      }
    }
  }

  async function handleRateCourse(nextRating) {
    const previousSummary = ratingSummary;
    const hasExistingVote = previousSummary.user_rating !== null;
    const totalRatings = previousSummary.total_ratings;
    const averageRating = previousSummary.average_rating || 0;

    let optimisticTotal = totalRatings;
    let optimisticAverage = averageRating;

    if (hasExistingVote) {
      const updatedSum = averageRating * totalRatings - previousSummary.user_rating + nextRating;
      optimisticAverage = totalRatings === 0 ? nextRating : Number((updatedSum / totalRatings).toFixed(2));
    } else {
      const updatedSum = averageRating * totalRatings + nextRating;
      optimisticTotal = totalRatings + 1;
      optimisticAverage = Number((updatedSum / optimisticTotal).toFixed(2));
    }

    setRatingSummary({
      average_rating: optimisticAverage,
      total_ratings: optimisticTotal,
      user_rating: nextRating,
    });

    try {
      const serverSummary = await setCourseRating(id, nextRating, token);
      setRatingSummary(serverSummary);
      toast.success("Rating saved");
    } catch (error) {
      setRatingSummary(previousSummary);
      toast.error(error.message);
    }
  }

  async function submitCreateLesson(event) {
    event.preventDefault();
    try {
      await createLesson(id, { title: createLessonTitle, content: createLessonContent }, token);
      toast.success("Lesson added");
      setCreateLessonTitle("");
      setCreateLessonContent("");
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function submitCreateAssignment(event) {
    event.preventDefault();
    try {
      await createAssignment(
        id,
        { title: createAssignmentTitle, description: createAssignmentDescription },
        token,
      );
      toast.success("Assignment added");
      setCreateAssignmentTitle("");
      setCreateAssignmentDescription("");
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function submitCreateQuizQuestion(event) {
    event.preventDefault();
    const payload = {
      question_type: createQuizType,
      question: createQuizQuestionText,
      correct_answer: createQuizAnswer,
      options: getOptionsFromText(createQuizOptionsText),
      position: quizQuestions.length + 1,
    };

    try {
      await createQuizQuestion(id, payload, token);
      toast.success("Quiz question added");
      setCreateQuizType("text");
      setCreateQuizQuestionText("");
      setCreateQuizAnswer("");
      setCreateQuizOptionsText("");
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openEditLessonModal(lesson) {
    setLessonToEdit(lesson);
    setEditLessonTitle(lesson.title);
    setEditLessonContent(lesson.content);
  }

  function closeEditLessonModal() {
    setLessonToEdit(null);
    setEditLessonTitle("");
    setEditLessonContent("");
  }

  async function submitEditLesson(event) {
    event.preventDefault();
    if (!lessonToEdit) {
      return;
    }
    try {
      await updateLesson(lessonToEdit.id, { title: editLessonTitle, content: editLessonContent }, token);
      toast.success("Lesson updated");
      closeEditLessonModal();
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openEditAssignmentModal(assignment) {
    setAssignmentToEdit(assignment);
    setEditAssignmentTitle(assignment.title);
    setEditAssignmentDescription(assignment.description);
  }

  function closeEditAssignmentModal() {
    setAssignmentToEdit(null);
    setEditAssignmentTitle("");
    setEditAssignmentDescription("");
  }

  async function submitEditAssignment(event) {
    event.preventDefault();
    if (!assignmentToEdit) {
      return;
    }
    try {
      await updateAssignment(
        assignmentToEdit.id,
        { title: editAssignmentTitle, description: editAssignmentDescription },
        token,
      );
      toast.success("Assignment updated");
      closeEditAssignmentModal();
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openEditQuizQuestionModal(question) {
    setQuizQuestionToEdit(question);
    setEditQuizType(question.question_type);
    setEditQuizQuestionText(question.question);
    setEditQuizAnswer("");
    setEditQuizOptionsText(getOptionTextFromOptions(question.options));
  }

  function closeEditQuizQuestionModal() {
    setQuizQuestionToEdit(null);
    setEditQuizType("text");
    setEditQuizQuestionText("");
    setEditQuizAnswer("");
    setEditQuizOptionsText("");
  }

  async function submitEditQuizQuestion(event) {
    event.preventDefault();
    if (!quizQuestionToEdit) {
      return;
    }
    const payload = {
      question_type: editQuizType,
      question: editQuizQuestionText,
      correct_answer: editQuizAnswer,
      options: getOptionsFromText(editQuizOptionsText),
      position: quizQuestionToEdit.position,
    };

    try {
      await updateQuizQuestion(quizQuestionToEdit.id, payload, token);
      toast.success("Quiz question updated");
      closeEditQuizQuestionModal();
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function askDeleteLesson(lesson) {
    setDeleteTarget({ type: "lesson", id: lesson.id, name: lesson.title });
  }

  function askDeleteAssignment(assignment) {
    setDeleteTarget({ type: "assignment", id: assignment.id, name: assignment.title });
  }

  function askDeleteQuizQuestion(question) {
    setDeleteTarget({ type: "quiz_question", id: question.id, name: question.question });
  }

  async function confirmDeleteTarget() {
    if (!deleteTarget) {
      return;
    }
    try {
      if (deleteTarget.type === "lesson") {
        await deleteLesson(deleteTarget.id, token);
        toast.success("Lesson deleted");
      }
      if (deleteTarget.type === "assignment") {
        await deleteAssignment(deleteTarget.id, token);
        toast.success("Assignment deleted");
      }
      if (deleteTarget.type === "quiz_question") {
        await deleteQuizQuestion(deleteTarget.id, token);
        toast.success("Quiz question deleted");
      }
      setDeleteTarget(null);
      loadCoursePageData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function goToPreviousLessonsPage() {
    if (lessonOffset === 0) {
      return;
    }
    setLessonOffset(Math.max(0, lessonOffset - lessonLimit));
  }

  function goToNextLessonsPage() {
    if (!hasMoreLessons) {
      return;
    }
    setLessonOffset(lessonOffset + lessonLimit);
  }

  if (!course) {
    return (
      <section className="page">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </section>
    );
  }

  const canManage = canManageCourse();

  return (
    <section className="page">
      <div className="section-header">
        <h2>{course.title}</h2>
        <Link to="/dashboard" className="btn btn-secondary">Back To Dashboard</Link>
      </div>

      <article className="card">
        <p className="small-text">{course.description}</p>
        <p className="small-text">Instructor: {course.owner_email || `#${course.owner_id}`}</p>
        <div className="course-path">
          <span>1. Lessons</span>
          <span>2. Assignments</span>
          <span>3. Quiz</span>
          <span>4. Certificate</span>
        </div>
        <div className="course-progress">
          <div className="course-progress-top">
            <span className="small-text">Completion</span>
            <strong>{completionPercent}%</strong>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${completionPercent}%` }} />
          </div>
          {nextLessonToContinue && (
            <p className="small-text">Continue with lesson: {nextLessonToContinue.title}</p>
          )}
        </div>
        {progress && progress.completed && <p className="status-completed">Course completed</p>}
        <div className="course-rating-box">
          <div className="section-header">
            <h3>Course Rating</h3>
            <span className="small-text">
              Average: {ratingSummary.average_rating ?? "-"} ({ratingSummary.total_ratings} votes)
            </span>
          </div>
          <div className="row">
            {[1, 2, 3, 4, 5].map((starValue) => (
              <button
                key={starValue}
                type="button"
                className={`rating-star ${ratingSummary.user_rating >= starValue ? "rating-star-active" : ""}`}
                onClick={() => handleRateCourse(starValue)}
              >
                {starValue}
              </button>
            ))}
            {ratingSummary.user_rating && <span className="small-text">Your rating: {ratingSummary.user_rating}</span>}
          </div>
        </div>
      </article>

      {!learningStarted && (
        <section className="card">
          <h3>Start Learning</h3>
          <p className="small-text">Open lessons and assignments, then pass quiz.</p>
          <Button text="Start Learning" onClick={handleStartLearning} />
        </section>
      )}

      {learningStarted && (
        <>
          <section className="card">
            <div className="section-header">
              <h3>Lessons</h3>
            </div>
            <div className="row">
              <Button text="Previous" variant="secondary" onClick={goToPreviousLessonsPage} disabled={lessonOffset === 0} />
              <Button text="Next" variant="secondary" onClick={goToNextLessonsPage} disabled={!hasMoreLessons} />
            </div>
            {lessons.length === 0 && <p className="small-text">No lessons yet.</p>}
            {lessons.map((lesson) => (
              <article className="lesson-card" key={lesson.id}>
                <h4>{lesson.title}</h4>
                <p>{lesson.content}</p>
                <div className="row">
                  <Button
                    text={isLessonCompleted(user?.id, id, lesson.id) ? "Completed" : "Mark Complete"}
                    variant={isLessonCompleted(user?.id, id, lesson.id) ? "secondary" : "primary"}
                    onClick={() => handleToggleLessonCompletion(lesson.id)}
                  />
                </div>
                {canManage && (
                  <div className="row">
                    <Button text="Edit" variant="secondary" onClick={() => openEditLessonModal(lesson)} />
                    <Button text="Delete" variant="danger" onClick={() => askDeleteLesson(lesson)} />
                  </div>
                )}
              </article>
            ))}
          </section>

          <section className="card">
            <div className="section-header">
              <h3>Assignments</h3>
            </div>
            {assignments.length === 0 && <p className="small-text">No assignments yet.</p>}
            {assignments.map((assignment) => (
              <article className="lesson-card" key={assignment.id}>
                <h4>{assignment.title}</h4>
                <p>{assignment.description}</p>
                {canManage && (
                  <div className="row">
                    <Button text="Edit" variant="secondary" onClick={() => openEditAssignmentModal(assignment)} />
                    <Button text="Delete" variant="danger" onClick={() => askDeleteAssignment(assignment)} />
                  </div>
                )}
              </article>
            ))}
          </section>

          <section className="card">
            <div className="section-header">
              <h3>Quiz</h3>
              {quizQuestions.length > 0 && <span className="small-text">{quizQuestions.length} questions</span>}
            </div>
            {quizQuestions.length === 0 && <p className="small-text">Quiz is not ready yet.</p>}
            {quizQuestions.map((question) => (
              <article className="quiz-question-card" key={question.id}>
                <p className="small-text">Question #{question.position} • {question.question_type}</p>
                <p className="quiz-question">{question.question}</p>
                {question.options && question.options.length > 0 && (
                  <p className="small-text">Options: {question.options.join(", ")}</p>
                )}
                {canManage && (
                  <div className="row">
                    <Button text="Edit" variant="secondary" onClick={() => openEditQuizQuestionModal(question)} />
                    <Button text="Delete" variant="danger" onClick={() => askDeleteQuizQuestion(question)} />
                  </div>
                )}
              </article>
            ))}
            {quizQuestions.length > 0 && (
              <Link className="btn btn-primary" to={`/quiz/${id}`}>Take Quiz</Link>
            )}
          </section>
        </>
      )}

      {canManage && (
        <section className="grid-three">
          <form className="card form panel-card" onSubmit={submitCreateLesson}>
            <h3>Create Lesson</h3>
            <Input label="Lesson Title" value={createLessonTitle} onChange={(event) => setCreateLessonTitle(event.target.value)} required />
            <label className="input-group">
              <span className="input-label">Lesson Content</span>
              <textarea value={createLessonContent} onChange={(event) => setCreateLessonContent(event.target.value)} required />
            </label>
            <Button text="Save Lesson" type="submit" />
          </form>

          <form className="card form panel-card" onSubmit={submitCreateAssignment}>
            <h3>Create Assignment</h3>
            <Input label="Assignment Title" value={createAssignmentTitle} onChange={(event) => setCreateAssignmentTitle(event.target.value)} required />
            <label className="input-group">
              <span className="input-label">Assignment Description</span>
              <textarea value={createAssignmentDescription} onChange={(event) => setCreateAssignmentDescription(event.target.value)} required />
            </label>
            <Button text="Save Assignment" type="submit" />
          </form>

          <form className="card form panel-card" onSubmit={submitCreateQuizQuestion}>
            <h3>Create Quiz Question</h3>
            <label className="input-group">
              <span className="input-label">Quiz Type</span>
              <select value={createQuizType} onChange={(event) => setCreateQuizType(event.target.value)}>
                <option value="text">Write Correct Answer</option>
                <option value="single_choice">Single Choice Test</option>
                <option value="true_false">True / False</option>
              </select>
            </label>
            <Input label="Question" value={createQuizQuestionText} onChange={(event) => setCreateQuizQuestionText(event.target.value)} required />
            {createQuizType === "single_choice" && (
              <label className="input-group">
                <span className="input-label">Options (comma or new line)</span>
                <textarea value={createQuizOptionsText} onChange={(event) => setCreateQuizOptionsText(event.target.value)} required />
              </label>
            )}
            {createQuizType === "true_false" && (
              <label className="input-group">
                <span className="input-label">Correct Answer</span>
                <select value={createQuizAnswer} onChange={(event) => setCreateQuizAnswer(event.target.value)} required>
                  <option value="">Select answer</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              </label>
            )}
            {createQuizType !== "true_false" && (
              <Input label="Correct Answer" value={createQuizAnswer} onChange={(event) => setCreateQuizAnswer(event.target.value)} required />
            )}
            <Button text="Save Quiz Question" type="submit" />
          </form>
        </section>
      )}

      <Modal open={Boolean(lessonToEdit)} title="Edit Lesson" onClose={closeEditLessonModal}>
        <form className="form" onSubmit={submitEditLesson}>
          <Input label="Lesson Title" value={editLessonTitle} onChange={(event) => setEditLessonTitle(event.target.value)} required />
          <label className="input-group">
            <span className="input-label">Lesson Content</span>
            <textarea value={editLessonContent} onChange={(event) => setEditLessonContent(event.target.value)} required />
          </label>
          <div className="row">
            <Button text="Update Lesson" type="submit" />
            <Button text="Cancel" variant="secondary" onClick={closeEditLessonModal} />
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(assignmentToEdit)} title="Edit Assignment" onClose={closeEditAssignmentModal}>
        <form className="form" onSubmit={submitEditAssignment}>
          <Input label="Assignment Title" value={editAssignmentTitle} onChange={(event) => setEditAssignmentTitle(event.target.value)} required />
          <label className="input-group">
            <span className="input-label">Assignment Description</span>
            <textarea value={editAssignmentDescription} onChange={(event) => setEditAssignmentDescription(event.target.value)} required />
          </label>
          <div className="row">
            <Button text="Update Assignment" type="submit" />
            <Button text="Cancel" variant="secondary" onClick={closeEditAssignmentModal} />
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(quizQuestionToEdit)} title="Edit Quiz Question" onClose={closeEditQuizQuestionModal}>
        <form className="form" onSubmit={submitEditQuizQuestion}>
          <label className="input-group">
            <span className="input-label">Quiz Type</span>
            <select value={editQuizType} onChange={(event) => setEditQuizType(event.target.value)}>
              <option value="text">Write Correct Answer</option>
              <option value="single_choice">Single Choice Test</option>
              <option value="true_false">True / False</option>
            </select>
          </label>
          <Input label="Question" value={editQuizQuestionText} onChange={(event) => setEditQuizQuestionText(event.target.value)} required />
          {editQuizType === "single_choice" && (
            <label className="input-group">
              <span className="input-label">Options (comma or new line)</span>
              <textarea value={editQuizOptionsText} onChange={(event) => setEditQuizOptionsText(event.target.value)} required />
            </label>
          )}
          {editQuizType === "true_false" && (
            <label className="input-group">
              <span className="input-label">Correct Answer</span>
              <select value={editQuizAnswer} onChange={(event) => setEditQuizAnswer(event.target.value)} required>
                <option value="">Select answer</option>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            </label>
          )}
          {editQuizType !== "true_false" && (
            <Input label="Correct Answer" value={editQuizAnswer} onChange={(event) => setEditQuizAnswer(event.target.value)} required />
          )}
          <div className="row">
            <Button text="Update Question" type="submit" />
            <Button text="Cancel" variant="secondary" onClick={closeEditQuizQuestionModal} />
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

export default CoursePage;
