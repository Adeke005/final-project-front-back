import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { confirmPasswordReset } from "../services/authApi.js";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const token = searchParams.get("token");

  async function submitNewPassword(event) {
    event.preventDefault();

    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset({ token, new_password: newPassword });
      toast.success("Password reset successful. Please login with your new password.");
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="page small-page auth-page">
        <article className="card auth-card">
          <h2>Invalid Link</h2>
          <p className="small-text">The password reset link is invalid or expired.</p>
          <p className="small-text">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="page small-page auth-page">
      <article className="card auth-card">
        <h2>Enter New Password</h2>
        <p className="small-text">Provide a secure new password for your account.</p>
        <form onSubmit={submitNewPassword} className="form">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            placeholder="Min 6 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            placeholder="Repeat your password"
          />
          <Button text={isLoading ? "Updating..." : "Update Password"} type="submit" disabled={isLoading} />
        </form>
        <p className="small-text">
          Back to <Link to="/login">Login</Link>
        </p>
      </article>
    </section>
  );
}

export default ResetPasswordPage;
