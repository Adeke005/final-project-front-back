import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";

import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import CertificatePage from "./pages/CertificatePage.jsx";

function getThemeClass(user) {
  if (!user) {
    return "theme-user";
  }

  if (user.role === "admin") {
    return "theme-admin";
  }

  if (user.role === "instructor") {
    return "theme-instructor";
  }

  return "theme-user";
}

function App() {
  const user = useSelector((state) => state.auth.user);
  const themeClass = getThemeClass(user);
  const sidebarLayout = user && (user.role === "admin" || user.role === "instructor");

  return (
    <div className={`app ${themeClass} ${sidebarLayout ? "app-sidebar-layout" : "app-top-layout"}`}>
      <Navbar />
      <main className={`page-wrapper ${sidebarLayout ? "page-wrapper-sidebar" : ""}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course/:id"
            element={
              <ProtectedRoute>
                <CoursePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:courseId"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificate/:courseId"
            element={
              <ProtectedRoute>
                <CertificatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
