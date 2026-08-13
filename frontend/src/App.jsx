import { Routes, Route, Navigate, Link, NavLink } from "react-router-dom";
import { SignIn, SignUp, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
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
  return (
    <nav className="app-nav">
      <Link to="/" className="brand">
        Fin<span className="brand-accent">Health</span>
      </Link>

      <div className="nav-right">
        <SignedIn>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Transactions
          </NavLink>
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
      </Routes>
    </>
  );
}
