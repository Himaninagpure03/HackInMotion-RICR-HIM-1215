import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useApi } from "../lib/api";

export default function Landing() {
  const api = useApi();
  const [dest, setDest] = useState(null);

  useEffect(() => {
    api("/transactions")
      .then((txns) => setDest(txns.length === 0 ? "/transactions" : "/dashboard"))
      .catch(() => setDest("/dashboard"));
  }, []);

  return (
    <main className="hero">
      <SignedIn>
        {dest ? <Navigate to={dest} replace /> : null}
      </SignedIn>

      <SignedOut>
        <div className="hero-content">
          <span className="hero-eyebrow">Financial health tracker</span>
          <h1>See where your money actually goes.</h1>
          <p>
            A minimal, private way to track income and expenses and understand
            your spending at a glance.
          </p>
          <div className="hero-actions">
            <Link to="/sign-up" className="btn btn-primary">
              Get started
            </Link>
            <Link to="/sign-in" className="btn btn-ghost">
              Log in
            </Link>
          </div>
        </div>
      </SignedOut>
    </main>
  );
}
