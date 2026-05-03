function Input({ label, value, onChange, type = "text", placeholder = "", name = "", required = false }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <input
        type={type}
        value={value}
        name={name}
        placeholder={placeholder}
        onChange={onChange}
        required={required}
      />
    </label>
  );
}

export default Input;
