import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import {
  changeAccountPassword,
  getAccountMe,
  getAccountSessions,
  revokeAccountSession,
  updateAccountMe,
} from "../services/accountApi.js";

function AccountPage() {
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadAccountData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountData, sessionData] = await Promise.all([
        getAccountMe(token),
        getAccountSessions(token),
      ]);
      setEmail(accountData.user.email);
      setRole(accountData.user.role);
      setFullName(accountData.profile.full_name || "");
      setAvatarUrl(accountData.profile.avatar_url || "");
      setBio(accountData.profile.bio || "");
      setTimezone(accountData.profile.timezone || "");
      setSessions(sessionData);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  async function submitProfile(event) {
    event.preventDefault();
    try {
      await updateAccountMe(
        {
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
          timezone: timezone.trim() || null,
        },
        token,
      );
      toast.success("Profile updated");
      await loadAccountData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    try {
      await changeAccountPassword(
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        token,
      );
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleRevokeSession(sessionId) {
    try {
      await revokeAccountSession(sessionId, token);
      toast.success("Session revoked");
      await loadAccountData();
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) {
    return <section className="page">Loading account...</section>;
  }

  return (
    <section className="page">
      <section className="workspace-hero card">
        <h2>My Account</h2>
        <p className="small-text">Manage profile, password, and active sessions.</p>
      </section>

      <section className="grid-two">
        <form className="card form panel-card" onSubmit={submitProfile}>
          <h3>Profile</h3>
          <p className="small-text">Email: {email}</p>
          <p className="small-text">Role: {role}</p>
          <Input label="Full Name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input label="Avatar URL" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
          <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <label className="input-group">
            <span className="input-label">Bio</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} />
          </label>
          <Button text="Save Profile" type="submit" />
        </form>

        <form className="card form panel-card" onSubmit={submitPassword}>
          <h3>Change Password</h3>
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <Button text="Update Password" type="submit" />
        </form>
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Active Sessions</h3>
          <span className="small-text">{sessions.length} sessions</span>
        </div>
        <div className="manage-list">
          {sessions.map((session) => (
            <div key={session.id} className="manage-row">
              <div>
                <strong>Session #{session.id}</strong>
                <p className="small-text">
                  Created: {new Date(session.created_at).toLocaleString()} | Expires:{" "}
                  {new Date(session.expires_at).toLocaleString()}
                </p>
                <p className="small-text">
                  Agent: {session.user_agent || "Unknown"} | IP: {session.ip_address || "Unknown"}
                </p>
              </div>
              <Button text="Revoke" variant="danger" onClick={() => handleRevokeSession(session.id)} />
            </div>
          ))}
          {sessions.length === 0 && <p className="small-text">No active sessions.</p>}
        </div>
      </section>
    </section>
  );
}

export default AccountPage;
