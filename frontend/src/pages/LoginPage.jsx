import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { setAuth } from "../features/authSlice.js";
import { loginUser } from "../services/authApi.js";

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submitLogin(event) {
    event.preventDefault();

    try {
      const data = await loginUser({ email, password });
      dispatch(setAuth({ user: data.user, token: data.access_token, refreshToken: data.refresh_token }));
      toast.success("Login successful");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <section className="page small-page auth-page">
      <article className="card auth-card">
        <h2>Welcome Back</h2>
        <p className="small-text">Sign in to continue learning.</p>
        <form onSubmit={submitLogin} className="form">
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button text="Login" type="submit" />
        </form>
        <p className="small-text">
          No account? <Link to="/register">Register</Link>
        </p>
      </article>
    </section>
  );
}

export default LoginPage;
