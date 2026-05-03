import Button from "./Button.jsx";
import Modal from "./Modal.jsx";

function DeleteModal({ open, itemName, onConfirm, onCancel }) {
  return (
    <Modal open={open} title="Are you sure?">
      <p className="small-text">You are deleting:</p>
      <h4>{itemName}</h4>
      <div className="row">
        <Button text="Confirm" variant="danger" onClick={onConfirm} />
        <Button text="Cancel" variant="secondary" onClick={onCancel} />
      </div>
    </Modal>
  );
}

export default DeleteModal;
