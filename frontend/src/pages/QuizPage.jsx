import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
import { getQuizByCourse, submitQuiz } from "../services/quizApi.js";

function QuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);

  const [questions, setQuestions] = useState([]);
  const [answersById, setAnswersById] = useState({});
  const [loading, setLoading] = useState(true);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const quizList = await getQuizByCourse(courseId, token);
      setQuestions(quizList);
      const initialAnswers = {};
      for (const question of quizList) {
        initialAnswers[question.id] = "";
      }
      setAnswersById(initialAnswers);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  function setAnswer(quizId, value) {
    setAnswersById({
      ...answersById,
      [quizId]: value,
    });
  }

  function buildSubmitAnswers() {
    return questions.map((question) => ({
      quiz_id: question.id,
      answer: answersById[question.id] || "",
    }));
  }

  async function submitQuizAnswers(event) {
    event.preventDefault();

    for (const question of questions) {
      const answerValue = answersById[question.id];
      if (!answerValue || answerValue.trim() === "") {
        toast.error("Please answer all questions");
        return;
      }
    }

    try {
      const result = await submitQuiz(courseId, buildSubmitAnswers(), token);
      if (result.passed) {
        toast.success(`Quiz passed (${result.correct_answers}/${result.total_questions})`);
        navigate(`/certificate/${courseId}`);
        return;
      }

      toast.error(`Wrong answers (${result.correct_answers}/${result.total_questions})`);
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section className="page">
      <div className="section-header">
        <h2>Quiz</h2>
        <Link to={`/course/${courseId}`} className="btn btn-secondary">Back To Course</Link>
      </div>

      {loading && <SkeletonCard lines={4} />}

      {!loading && (
      <form className="card form quiz-box" onSubmit={submitQuizAnswers}>
        {questions.map((question) => (
          <article key={question.id} className="quiz-question-block">
            <p className="small-text">Question #{question.position} • {question.question_type}</p>
            <p className="quiz-question">{question.question}</p>

            {question.question_type === "text" && (
              <Input
                label="Your Answer"
                value={answersById[question.id] || ""}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                required
              />
            )}

            {question.question_type === "single_choice" && (
              <div className="input-group">
                <span className="input-label">Choose one option</span>
                <div className="option-list">
                  {(question.options || []).map((option) => (
                    <label key={option} className="category-option">
                      <input
                        type="radio"
                        name={`quiz-${question.id}`}
                        value={option}
                        checked={answersById[question.id] === option}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {question.question_type === "true_false" && (
              <div className="input-group">
                <span className="input-label">Choose true or false</span>
                <div className="option-list">
                  <label className="category-option">
                    <input
                      type="radio"
                      name={`quiz-${question.id}`}
                      value="True"
                      checked={answersById[question.id] === "True"}
                      onChange={(event) => setAnswer(question.id, event.target.value)}
                    />
                    <span>True</span>
                  </label>
                  <label className="category-option">
                    <input
                      type="radio"
                      name={`quiz-${question.id}`}
                      value="False"
                      checked={answersById[question.id] === "False"}
                      onChange={(event) => setAnswer(question.id, event.target.value)}
                    />
                    <span>False</span>
                  </label>
                </div>
              </div>
            )}
          </article>
        ))}

        {questions.length > 0 && <Button text="Submit Quiz" type="submit" />}
        {questions.length === 0 && <p className="small-text">No quiz questions available yet.</p>}
      </form>
      )}
    </section>
  );
}

export default QuizPage;
