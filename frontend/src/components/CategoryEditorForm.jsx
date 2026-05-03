import Button from "./Button.jsx";
import Input from "./Input.jsx";

function CategoryEditorForm({
  categories,
  createName,
  setCreateName,
  onCreateCategory,
  onOpenEditCategory,
  onAskDeleteCategory,
}) {
  return (
    <section className="card form panel-card">
      <h3>Category Modules</h3>
      <p className="small-text">Create, edit, and delete categories.</p>

      <form className="form compact-form" onSubmit={onCreateCategory}>
        <Input
          label="Create Category"
          value={createName}
          onChange={(event) => setCreateName(event.target.value)}
          required
        />
        <Button text="Add Category" type="submit" />
      </form>

      <div className="form compact-form">
        <span className="input-label">Manage Categories</span>
        <div className="manage-list">
          {categories.map((category) => (
            <div key={category.id} className="manage-row">
              <span>{category.name}</span>
              <div className="row">
                <Button text="Edit" variant="secondary" onClick={() => onOpenEditCategory(category)} />
                <Button text="Delete" variant="danger" onClick={() => onAskDeleteCategory(category)} />
              </div>
            </div>
          ))}
          {categories.length === 0 && <span className="small-text">No categories yet.</span>}
        </div>
      </div>
    </section>
  );
}

export default CategoryEditorForm;
