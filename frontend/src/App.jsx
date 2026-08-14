import { useState } from "react";
import { Routes, Route, Navigate, Link, NavLink } from "react-router-dom";
import { SignIn, SignUp, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
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

function AppNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="app-nav">
      <Link to="/" className="brand" onClick={closeMenu}>
        Fin<span className="brand-accent">Health</span>
      </Link>

      <div className="nav-right">
        <SignedIn>
          <div className={`nav-links${menuOpen ? " open" : ""}`}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              onClick={closeMenu}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              onClick={closeMenu}
            >
              Transactions
            </NavLink>
            <NavLink
              to="/accounts"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              onClick={closeMenu}
            >
              Accounts
            </NavLink>
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

          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <AppNav />

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
    </>
  );
}
