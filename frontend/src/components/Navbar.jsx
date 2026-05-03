import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import Button from "./Button.jsx";
import { clearAuth } from "../features/authSlice.js";
import { logoutUser as logoutUserApi } from "../services/authApi.js";

function Navbar() {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const refreshToken = useSelector((state) => state.auth.refreshToken);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function logoutUser() {
    try {
      if (refreshToken) {
        await logoutUserApi(refreshToken, token);
      }
    } catch (error) {
      // Keep client-side logout even if backend logout request fails.
    } finally {
      dispatch(clearAuth());
      toast.info("Logged out");
      navigate("/login");
    }
  }

  if (!user) {
    return (
      <header className="navbar top-navbar guest-navbar">
        <div className="navbar-brand">
          <h2>StudentCoursera</h2>
          <span>Course - Lesson - Assignment - Quiz - Certificate</span>
        </div>
        <nav className="row">
          <NavLink to="/login" className={({ isActive }) => getNavClass(isActive)}>
            Login
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => getNavClass(isActive)}>
            Register
          </NavLink>
        </nav>
      </header>
    );
  }

  if (user.role === "user") {
    return (
      <header className="navbar top-navbar user-navbar">
        <div className="navbar-brand">
          <h2>StudentCoursera</h2>
          <span>{user.email}</span>
        </div>
        <nav className="row">
          <NavLink to="/dashboard" className={({ isActive }) => getNavClass(isActive)}>
            Dashboard
          </NavLink>
          <span className="role-badge">{user.role}</span>
          <Button text="Logout" variant="secondary" onClick={logoutUser} />
        </nav>
      </header>
    );
  }

  return (
    <aside className={`sidebar-nav ${user.role === "admin" ? "sidebar-admin" : "sidebar-instructor"}`}>
      <div className="sidebar-brand">
        <h2>StudentCoursera</h2>
        <p>{user.email}</p>
      </div>
      <nav className="sidebar-links">
        <NavLink to="/dashboard" className={({ isActive }) => getSidebarLinkClass(isActive)}>
          Dashboard
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <span className="role-badge">{user.role}</span>
        <Button text="Logout" variant="secondary" onClick={logoutUser} />
      </div>
    </aside>
  );
}

function getNavClass(isActive) {
  if (isActive) {
    return "nav-item nav-item-active";
  }
  return "nav-item";
}

function getSidebarLinkClass(isActive) {
  if (isActive) {
    return "sidebar-link sidebar-link-active";
  }
  return "sidebar-link";
}

export default Navbar;
