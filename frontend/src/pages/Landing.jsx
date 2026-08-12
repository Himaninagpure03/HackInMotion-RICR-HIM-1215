import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

export default function Landing() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>

      <SignedOut>
        <h1>Financial Health Tracker</h1>
        <p>See where your money actually goes.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
          <Link to="/sign-in">Log in</Link>
          <Link to="/sign-up">Sign up</Link>
        </div>
      </SignedOut>
    </main>
  );
}
