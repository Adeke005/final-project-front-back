import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { requestPasswordReset } from "../services/authApi.js";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submitResetRequest(event) {
    event.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordReset({ email });
      toast.success("If your email exists, a reset link was sent!");
      setEmail("");
    } catch (error) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="page small-page auth-page">
      <article className="card auth-card">
        <h2>Reset Password</h2>
        <p className="small-text">Enter your email and we'll send you a password reset link.</p>
        <form onSubmit={submitResetRequest} className="form">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="name@example.com"
          />
          <Button text={isLoading ? "Sending..." : "Send Reset Link"} type="submit" disabled={isLoading} />
        </form>
        <p className="small-text">
          Remember your password? <Link to="/login">Login</Link>
        </p>
      </article>
    </section>
  );
}

export default ForgotPasswordPage;
