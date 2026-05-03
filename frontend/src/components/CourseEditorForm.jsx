import Button from "./Button.jsx";
import Input from "./Input.jsx";

function CourseEditorForm({
  editingCourseId,
  courseTitle,
  courseDescription,
  categories,
  selectedCategoryNames,
  setCourseTitle,
  setCourseDescription,
  onToggleCategoryName,
  onSubmit,
  onClear,
}) {
  let heading = "Create Course";
  let submitText = "Create Course";

  if (editingCourseId) {
    heading = "Edit Course";
    submitText = "Update Course";
  }

  function isCategoryChecked(categoryName) {
    return selectedCategoryNames.includes(categoryName);
  }

  return (
    <form className="card form panel-card" onSubmit={onSubmit}>
      <h3>{heading}</h3>
      <Input
        label="Title"
        value={courseTitle}
        onChange={(event) => setCourseTitle(event.target.value)}
        required
      />
      <label className="input-group">
        <span>Description</span>
        <textarea
          value={courseDescription}
          onChange={(event) => setCourseDescription(event.target.value)}
          required
        />
      </label>
      <div className="input-group">
        <span className="input-label">Categories</span>
        <div className="category-options">
          {categories.length === 0 && <span className="small-text">Create categories first.</span>}
          {categories.map((category) => (
            <label key={category.id} className="category-option">
              <input
                type="checkbox"
                checked={isCategoryChecked(category.name)}
                onChange={() => onToggleCategoryName(category.name)}
              />
              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="row">
        <Button text={submitText} type="submit" />
        <Button text="Clear" variant="secondary" onClick={onClear} />
      </div>
    </form>
  );
}

export default CourseEditorForm;
