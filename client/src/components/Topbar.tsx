import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LOGIN } from "../routes";

const TITLES: Record<string, string> = {
  "/": "Portfolio Centre",
};

function topTitle(pathname: string): string {
  return TITLES[pathname] ?? "TDAC AGS Console";
}

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();

  async function handleLogout() {
    await logoutUser();
    navigate(LOGIN, { replace: true });
  }

  return (
    <header className="topbar">
      <h2 className="topbar-title">
        <b>TDAC</b> / {topTitle(location.pathname)}
      </h2>

      <div className="topbar-right">
        <input
          className="search topbar-search"
          placeholder="Search projects, locations, samples..."
          aria-label="Search"
        />

        {user && (
          <span className="topbar-user">
            {user.username}
          </span>
        )}

        <button type="button" className="btn">
          Help
        </button>

        <button
          type="button"
          className="btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}