import Button from "./Button.jsx";

function UserManagementPanel({ users, currentUser, onToggleBan }) {
  return (
    <section className="card form panel-card">
      <h3>User Management</h3>
      <p className="small-text">Admin can ban or unban users. Delete is disabled.</p>
      <div className="manage-list">
        {users.map((user) => (
          <div key={user.id} className="manage-row">
            <div>
              <strong>{user.email}</strong>
              <p className="small-text">
                ID: {user.id} | Role: {user.role} | Status: {user.is_banned ? "Banned" : "Active"}
              </p>
            </div>
            {canChangeBan(currentUser, user) && (
              <Button
                text={user.is_banned ? "Unban" : "Ban"}
                variant={user.is_banned ? "secondary" : "danger"}
                onClick={() => onToggleBan(user)}
              />
            )}
            {!canChangeBan(currentUser, user) && <span className="small-text">Protected</span>}
          </div>
        ))}
        {users.length === 0 && <p className="small-text">No users found.</p>}
      </div>
    </section>
  );
}

function canChangeBan(currentUser, targetUser) {
  if (!currentUser) {
    return false;
  }
  if (targetUser.id === currentUser.id) {
    return false;
  }
  if (targetUser.role === "admin") {
    return false;
  }
  return true;
}

export default UserManagementPanel;
