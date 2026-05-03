function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          {onClose && (
            <button type="button" className="modal-close" onClick={onClose}>
              X
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
