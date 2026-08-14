import { useState } from "react";
import { Routes, Route, Navigate, Link, NavLink } from "react-router-dom";
import { useAuth, SignIn, SignUp, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Landing from "./pages/Landing";

function Protected({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/sign-in" replace />
      </SignedOut>
    </>
  );
}

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/accounts", label: "Accounts" },
];

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h13M4 12h13M4 18h13" />
      <path d="M17 3l4 3-4 3M17 15l4 3-4 3" />
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h3" />
    </svg>
  ),
};

function AppNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="mobile-bar">
        <Link to="/" className="brand" onClick={closeMenu}>
          Fin<span className="brand-accent">Health</span>
        </Link>

        <div className="nav-right">
          <SignedIn>
            <div className={`nav-links${menuOpen ? " open" : ""}`}>
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              className="nav-burger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l10 10M14 4L4 14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2.5 5h13M2.5 9h13M2.5 13h13" />
                </svg>
              )}
            </button>
          </SignedIn>

          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <aside className="sidebar">
        <Link to="/" className="brand" onClick={closeMenu}>
          Fin<span className="brand-accent">Health</span>
        </Link>

        <nav className="sidebar-nav">
          <SignedIn>
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
              >
                {ICONS[label.toLowerCase()]}
                {label}
              </NavLink>
            ))}
          </SignedIn>
        </nav>

        <div className="sidebar-footer">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const { isSignedIn } = useAuth();

  return (
    <>
      <AppNav />

      <div className={`app-body${isSignedIn ? " with-nav" : ""}`}>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Clerk's hosted components handle the actual form + validation */}
          <Route
            path="/sign-in/*"
            element={
              <div className="auth-page">
                <SignIn routing="path" path="/sign-in" />
              </div>
            }
          />
          <Route
            path="/sign-up/*"
            element={
              <div className="auth-page">
                <SignUp routing="path" path="/sign-up" />
              </div>
            }
          />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/transactions"
            element={
              <Protected>
                <Transactions />
              </Protected>
            }
          />
          <Route
            path="/accounts"
            element={
              <Protected>
                <Accounts />
              </Protected>
            }
          />
        </Routes>
      </div>
    </>
  );
}
