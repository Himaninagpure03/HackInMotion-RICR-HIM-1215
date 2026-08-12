import { Routes, Route, Navigate } from "react-router-dom";
import { SignIn, SignUp, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";

export default function App() {
  return (
    <>
      <nav style={{ display: "flex", justifyContent: "flex-end", padding: "1rem" }}>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Clerk's hosted components handle the actual form + validation */}
        <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
        <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

        <Route
          path="/dashboard"
          element={
            <>
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </>
  );
}
