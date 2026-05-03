function Button({ text, onClick, type = "button", variant = "primary", className = "", disabled = false }) {
  let variantClass = "btn-primary";
  if (variant === "danger") {
    variantClass = "btn-danger";
  }
  if (variant === "secondary") {
    variantClass = "btn-secondary";
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn ${variantClass} ${className}`}
      disabled={disabled}
    >
      {text}
    </button>
  );
}

export default Button;
