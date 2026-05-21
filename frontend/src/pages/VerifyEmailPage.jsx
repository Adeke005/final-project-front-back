import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Verifying email...");

  useEffect(() => {
    const token = searchParams.get("token");

    async function verifyEmail() {
      try {
        await axios.post("http://localhost:8000/auth/verify-email", {
          token,
        });

        setMessage("Email verified successfully");
      } catch (error) {
        setMessage(
          error.response?.data?.detail || "Verification failed"
        );
      }
    }

    if (token) {
      verifyEmail();
    } else {
      setMessage("Invalid verification link");
    }
  }, [searchParams]);

  return (
    <section className="page small-page">
      <article className="card auth-card">
        <h2>{message}</h2>
      </article>
    </section>
  );
}

export default VerifyEmailPage;