import Button from "./Button.jsx";

function CourseCard({ course, canEditCourse, onOpenCourse, onEditCourse, onDeleteCourse }) {
  let categoryText = "No categories";
  if (course.categories && course.categories.length > 0) {
    categoryText = course.categories.map((category) => category.name).join(", ");
  }

  let ownerText = `Instructor #${course.owner_id}`;
  if (course.owner_email) {
    ownerText = `${course.owner_email} (#${course.owner_id})`;
  }

  return (
    <article className="card course-card course-card-surface">
      <div className="course-card-top">
        <div>
          <h3>{course.title}</h3>
          <span className="course-owner">{ownerText}</span>
        </div>
        <span className="course-chip">Course</span>
      </div>
      <p className="course-description">{course.description}</p>
      <p className="small-text course-categories">Categories: {categoryText}</p>
      <div className="row">
        <Button text="Open Course" onClick={() => onOpenCourse(course)} />
        {canEditCourse && <Button text="Edit" variant="secondary" onClick={() => onEditCourse(course)} />}
        {canEditCourse && <Button text="Delete" variant="danger" onClick={() => onDeleteCourse(course)} />}
      </div>
    </article>
  );
}

export default CourseCard;
