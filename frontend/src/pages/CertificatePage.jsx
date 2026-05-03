import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import { getCertificateByCourse } from "../services/certificateApi.js";
import { getCourseById } from "../services/courseApi.js";

function CertificatePage() {
  const { courseId } = useParams();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);

  const [courseTitle, setCourseTitle] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [certificateId, setCertificateId] = useState("");

  useEffect(() => {
    loadCertificatePage();
  }, [courseId]);

  async function loadCertificatePage() {
    try {
      const [certificate, course] = await Promise.all([
        getCertificateByCourse(courseId, token),
        getCourseById(courseId, token),
      ]);
      setCourseTitle(course.title);
      setIssuedAt(new Date(certificate.issued_at).toLocaleString());
      setCertificateId(certificate.id);
    } catch (error) {
      toast.error(error.message);
    }
  }

  let userName = "Student";
  if (user) {
    userName = user.email;
  }

  function printCertificate() {
    window.print();
  }

  return (
    <section className="page">
      <div className="section-header">
        <h2>Certificate</h2>
        <div className="row">
          <Link to="/dashboard" className="btn btn-secondary">
            Back To Dashboard
          </Link>
          <Button text="Print" variant="secondary" onClick={printCertificate} />
        </div>
      </div>

      <article className="certificate-box">
        <div className="certificate-border">
          <p className="certificate-label">StudentCoursera</p>
          <h3>Certificate Of Completion</h3>
          <p>This confirms that</p>
          <h2>{userName}</h2>
          <p>successfully completed the course</p>
          <h3>{courseTitle}</h3>
          <div className="certificate-meta">
            <span>Issued: {issuedAt}</span>
            <span>Certificate ID: {certificateId}</span>
          </div>
        </div>
      </article>
    </section>
  );
}

export default CertificatePage;
