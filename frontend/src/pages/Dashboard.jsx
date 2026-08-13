import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function initialsOf(user) {
  return (user?.firstName?.[0] ?? "?") + (user?.lastName?.[0] ?? "");
}

export default function Dashboard() {
  const { user } = useUser();
  const api = useApi();

  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categoryNames, setCategoryNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [me, txns, cats] = await Promise.all([
          api("/me"),
          api("/transactions"),
          api("/categories"),
        ]);
        setProfile(me);
        setTransactions(txns);
        const map = {};
        cats.forEach((c) => (map[c.id] = c.name));
        setCategoryNames(map);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const income = transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const balance = income - expenses;

  const byCategory = {};
  transactions.forEach((t) => {
    if (Number(t.amount) >= 0) return;
    const name = categoryNames[t.category_id] ?? "Uncategorized";
    byCategory[name] = (byCategory[name] ?? 0) + Math.abs(Number(t.amount));
  });
  const topCategories = Object.entries(byCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxCategory = topCategories[0]?.total ?? 0;

  const recent = transactions.slice(0, 6);
  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <main className="page">
      <header className="dash-head">
        <div className="avatar">{initialsOf(user)}</div>
        <div style={{ minWidth: 0 }}>
          <p className="dash-greet">{greeting()}</p>
          <h1>{user?.firstName ?? "there"}</h1>
          <p className="dash-meta">
            {profile?.email}
            {profile && memberSince ? ` · Member since ${memberSince}` : ""}
          </p>
        </div>
      </header>

      {error && (
        <div className="alert">
          <span>⚠</span>
          <span>Couldn’t load your dashboard: {error}</span>
        </div>
      )}

      {loading && (
        <div className="skeleton-stack">
          <div className="skeleton skeleton-stats" />
          <div className="skeleton skeleton-block" />
        </div>
      )}

      {!loading && (
        <>
          <section className="stats-grid">
            <div className="card stat-card">
              <p className="stat-label">Balance</p>
              <p className={`stat-value ${balance < 0 ? "stat-neg" : ""}`}>
                {formatCurrency(balance, 0)}
              </p>
              <p className="stat-sub">
                {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="card stat-card">
              <p className="stat-label">Income</p>
              <p className="stat-value stat-pos">{formatCurrency(income, 0)}</p>
              <p className="stat-sub">Money in</p>
            </div>
            <div className="card stat-card">
              <p className="stat-label">Spent</p>
              <p className="stat-value">{formatCurrency(expenses, 0)}</p>
              <p className="stat-sub">Money out</p>
            </div>
          </section>

          <section className="dash-grid">
            <div className="card panel">
              <h2 className="panel-title">Spending by category</h2>
              {topCategories.length === 0 ? (
                <p className="state">No expenses yet.</p>
              ) : (
                <div className="cat-list">
                  {topCategories.map((c) => (
                    <div key={c.name}>
                      <div className="cat-row">
                        <span className="cat-name">{c.name}</span>
                        <span className="cat-amount">{formatCurrency(c.total)}</span>
                      </div>
                      <div className="cat-track">
                        <div
                          className="cat-fill"
                          style={{ width: `${(c.total / maxCategory) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card panel">
              <h2 className="panel-title">Recent activity</h2>
              {recent.length === 0 ? (
                <p className="state">No transactions yet. Add one in Transactions.</p>
              ) : (
                <ul className="txn-list">
                  {recent.map((t) => {
                    const amount = Number(t.amount);
                    return (
                      <li key={t.id} className="txn-row">
                        <div className="txn-main">
                          <p className="txn-desc">{t.description}</p>
                          <p className="txn-date">{formatDate(t.txn_date)}</p>
                        </div>
                        <span
                          className={`txn-amount ${amount < 0 ? "amount-neg" : "amount-pos"}`}
                        >
                          {formatCurrency(amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
