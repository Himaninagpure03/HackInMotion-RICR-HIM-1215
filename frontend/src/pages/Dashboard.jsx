import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../lib/api";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: "linear-gradient(160deg, #f8fafc 0%, #eef2f7 100%)",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    background: "#ffffff",
    borderRadius: 20,
    boxShadow: "0 20px 50px -20px rgba(15, 23, 42, 0.25)",
    padding: "2.25rem 2.5rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.75rem",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "1.25rem",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    margin: "0.15rem 0 0",
    fontSize: "0.9rem",
    color: "#64748b",
  },
  sectionLabel: {
    margin: "0 0 0.75rem",
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94a3b8",
  },
  details: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.9rem 1.1rem",
    background: "#ffffff",
  },
  rowAlt: {
    background: "#f8fafc",
  },
  rowBorder: {
    borderBottom: "1px solid #e2e8f0",
  },
  key: {
    fontSize: "0.85rem",
    color: "#64748b",
  },
  value: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#0f172a",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  skeleton: {
    height: 44,
    borderRadius: 12,
    background: "linear-gradient(90deg, #eef2f7 25%, #e2e8f0 50%, #eef2f7 75%)",
    backgroundSize: "200% 100%",
    animation: "dashboard-shimmer 1.4s infinite",
  },
  error: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-start",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: 12,
    padding: "0.9rem 1.1rem",
    fontSize: "0.9rem",
  },
};

export default function Dashboard() {
  const { user } = useUser();
  const api = useApi();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/me")
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, []);

  const initials = (user?.firstName?.[0] ?? "?") + (user?.lastName?.[0] ?? "");
  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main style={styles.page}>
      <style>{`@keyframes dashboard-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <section style={styles.card}>
        <header style={styles.header}>
          <div style={styles.avatar}>{initials}</div>
          <div>
            <h1 style={styles.title}>Welcome back, {user?.firstName ?? "there"}</h1>
            <p style={styles.subtitle}>Here’s your account overview</p>
          </div>
        </header>

        {error && (
          <div style={styles.error}>
            <span>⚠</span>
            <span>Couldn’t load your profile: {error}</span>
          </div>
        )}

        {!error && !profile && (
          <div style={styles.loading}>
            <div style={styles.skeleton} />
            <div style={styles.skeleton} />
          </div>
        )}

        {profile && (
          <>
            <p style={styles.sectionLabel}>Profile</p>
            <div style={styles.details}>
              <div style={{ ...styles.row, ...styles.rowBorder }}>
                <span style={styles.key}>Email</span>
                <span style={styles.value}>{profile.email ?? "—"}</span>
              </div>
              <div style={{ ...styles.row, ...styles.rowBorder, ...styles.rowAlt }}>
                <span style={styles.key}>Display name</span>
                <span style={styles.value}>{profile.display_name ?? "—"}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.key}>Member since</span>
                <span style={styles.value}>{memberSince}</span>
              </div>
            </div>
          </>
        )}

        {/* Transactions, budgets, and the health score dashboard slot in below */}
      </section>
    </main>
  );
}
