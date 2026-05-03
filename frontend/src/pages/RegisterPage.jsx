import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { registerUser } from "../services/authApi.js";

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  async function submitRegister(event) {
    event.preventDefault();

    try {
      await registerUser({ email, password, role });
      toast.success("Register successful");
      navigate("/login");
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section className="page small-page auth-page">
      <article className="card auth-card">
        <h2>Create Account</h2>
        <p className="small-text">Choose your role and start platform usage.</p>
        <form onSubmit={submitRegister} className="form">
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <label className="input-group">
            <span className="input-label">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="user">User</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <Button text="Register" type="submit" />
        </form>
        <p className="small-text">
          Have account? <Link to="/login">Login</Link>
        </p>
      </article>
    </section>
  );
}

export default RegisterPage;
