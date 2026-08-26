import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMediaQuery } from "../lib/useMediaQuery";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useApi } from "../lib/api";

const CATEGORY_COLORS = [
  "#2D6A4F", "#C85A32", "#B45309", "#78716C", "#1B4332",
  "#A64825", "#8B6914", "#5D7A6B", "#9A6049", "#A8A29E",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CARD_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.9rem",
};

const AXIS_TICK = { fill: "var(--text-muted)", fontSize: 11 };
const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: "0.85rem",
};

const CARD_TITLE = { fontSize: "0.92rem", marginTop: 0, marginBottom: "0.75rem" };

const money = (v) => `\u20b9${Number(v).toLocaleString()}`;

const INCOME_GRADIENT = ["#4CAF7D", "#2D6A4F"];
const EXPENSE_GRADIENT = ["#E07A52", "#C85A32"];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function ScoreRing({ score }) {
  const size = 76;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(score, 100));
  const color = pct >= 70 ? "#2D6A4F" : pct >= 40 ? "#B45309" : "#C85A32";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c - (pct / 100) * c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--text)"
        fontSize="22"
        fontWeight="700"
      >
        {score}
      </text>
    </svg>
  );
}

function HealthScoreCard({ health }) {
  const pct = Math.max(0, Math.min(health.score, 100));
  const label =
    pct >= 70 ? "Healthy" : pct >= 40 ? "Needs attention" : "At risk";

  return (
    <div style={CARD_STYLE}>
      <h2 style={CARD_TITLE}>Financial health</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <ScoreRing score={health.score} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{label}</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            out of 100
          </div>
        </div>
      </div>

      {health.recommendations.length > 0 && (
        <ul
          style={{
            margin: "0.75rem 0 0",
            padding: "0.75rem 0 0",
            borderTop: "1px solid var(--border)",
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          {health.recommendations.map((rec, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: "0.5rem",
                color: "var(--text-muted)",
                fontSize: "0.82rem",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  marginTop: "0.4rem",
                  flexShrink: 0,
                  opacity: 0.8,
                }}
              />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  return (
    <div style={CARD_STYLE} className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

function StatsRow({ health }) {
  const income = Number(health.total_income);
  const expenses = Number(health.total_expenses);
  const saved = income - expenses;
  return (
    <div className="stats-grid stats-grid-4">
      <StatCard label="Total income" value={money(income)} sub="All time" tone={income > 0 ? "var(--positive)" : undefined} />
      <StatCard label="Total expenses" value={money(expenses)} sub="All time" tone={expenses > 0 ? "var(--danger)" : undefined} />
      <StatCard
        label="Saved"
        value={money(Math.max(saved, 0))}
        sub="Income minus expenses"
        tone={saved >= 0 ? "var(--positive)" : "var(--danger)"}
      />
      <StatCard
        label="Savings rate"
        value={`${health.savings_rate}%`}
        sub={saved >= 0 ? "of income kept" : "spending more than earned"}
        tone={health.savings_rate >= 20 ? "var(--positive)" : health.savings_rate >= 0 ? undefined : "var(--danger)"}
      />
    </div>
  );
}

function formatShortDate(value) {
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d) ? value : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RecentTransactions({ transactions, categoryNames }) {
  if (transactions.length === 0) {
    return (
      <div style={{ padding: "1.25rem 1rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
          No transactions yet.
        </p>
        <p style={{ color: "var(--text-faint)", margin: 0, fontSize: "0.82rem" }}>
          Head to the{" "}
          <Link to="/transactions" style={{ color: "var(--accent)" }}>
            Transactions
          </Link>{" "}
          page to add income and expenses.
        </p>
      </div>
    );
  }

  return (
    <ul className="txn-list">
      {transactions.slice(0, 7).map((t) => {
        const negative = Number(t.amount) < 0;
        return (
          <li key={t.id} className="txn-row">
            <div className="txn-main">
              <p className="txn-desc">{t.description}</p>
              <p className="txn-date">
                {formatShortDate(t.txn_date)}
                {"\u00b7"} {categoryNames.get(t.category_id) ?? "Uncategorized"}
              </p>
            </div>
            <span
              className="txn-amount"
              style={{ color: negative ? "var(--danger)" : "var(--positive)" }}
            >
              {negative ? "\u2212" : "+"}
              {money(Math.abs(t.amount))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SavingsNote({ income, expenses, savingsRate }) {
  const totalIncome = Number(income);
  const totalExpenses = Number(expenses);
  const saved = totalIncome - totalExpenses;

  let style;
  let icon;
  let text;

  if (totalIncome <= 0) {
    style = { background: "var(--surface-2)", border: "1px solid var(--border)" };
    icon = "\u2013";
    text = "No income recorded yet \u2014 add income and expenses on the Transactions page to see how much you're saving.";
  } else if (savingsRate < 10) {
    style = { background: "var(--danger-dim)", border: "1px solid rgba(200,90,50,0.3)" };
    icon = "\u26a0\ufe0f";
    text =
      savingsRate < 0
        ? `Warning \u2014 you spent ${money(Math.abs(saved))} more than you earned this period (${savingsRate}% savings).`
        : `Low savings \u2014 you're keeping only ${savingsRate}% of your income (${money(saved)}). Aim for at least 20%.`;
  } else if (savingsRate >= 20) {
    style = { background: "var(--positive-dim)", border: "1px solid rgba(45,106,79,0.25)" };
    icon = "\ud83d\udc4c";
    text = `Excellent \u2014 you saved ${savingsRate}% of your income this period (${money(saved)}).`;
  } else {
    style = { background: "var(--positive-dim)", border: "1px solid rgba(45,106,79,0.25)" };
    icon = "\ud83d\udc4d";
    text = `Good \u2014 you saved ${savingsRate}% of your income this period (${money(saved)}).`;
  }

  return (
    <div
      style={{
        ...style,
        borderRadius: 10,
        padding: "0.65rem 0.9rem",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        fontSize: "0.88rem",
      }}
    >
      <span style={{ fontSize: "1.1rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: "var(--text)" }}>{text}</span>
    </div>
  );
}

function SavingsBreakdownChart({ income, expenses, savingsRate }) {
  const totalIncome = Number(income);
  const totalExpenses = Number(expenses);
  const saved = totalIncome - totalExpenses;
  const expensesPct = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  if (totalIncome <= 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
        Add some income to see your savings breakdown.
      </p>
    );
  }

  const data = [
    { name: "Expenses", value: Math.max(totalExpenses, 0) },
    { name: "Savings", value: Math.max(saved, 0) },
  ];

  const rows = [
    { label: "Income", value: totalIncome, pct: 100, color: "#2D6A4F" },
    { label: "Expenses", value: Math.max(totalExpenses, 0), pct: expensesPct, color: "#C85A32" },
    { label: "Saved", value: Math.max(saved, 0), pct: savingsRate, color: "#4CAF7D" },
  ];

  return (
    <>
      <div style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={185}>
          <PieChart>
            <defs>
              <linearGradient id="gradPieSavings" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4CAF7D" />
                <stop offset="100%" stopColor="#2D6A4F" />
              </linearGradient>
              <linearGradient id="gradPieExpenses" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E07A52" />
                <stop offset="100%" stopColor="#C85A32" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={68}
              paddingAngle={2}
              cornerRadius={6}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.name === "Savings" ? "url(#gradPieSavings)" : "url(#gradPieExpenses)"}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: savingsRate >= 0 ? "var(--positive)" : "var(--danger)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {savingsRate}%
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            saved
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          marginTop: "0.35rem",
        }}
      >
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.82rem",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: row.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {money(row.value)}
            </span>
            <span
              style={{
                color: "var(--text-faint)",
                width: 40,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function CategoryBreakdownChart({ data }) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (data.length === 0) {
    return (
      <div style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
          No spending by category yet.
        </p>
        <p style={{ color: "var(--text-faint)", margin: 0, fontSize: "0.82rem" }}>
          Add expenses on the{" "}
          <Link to="/transactions" style={{ color: "var(--accent)" }}>
            Transactions
          </Link>{" "}
          page {"\u2014"} they are auto-categorized by description.
        </p>
      </div>
    );
  }

  const totalSpent = data.reduce((sum, c) => sum + Number(c.total), 0);

  return (
    <div className="cat-breakdown">
      <ResponsiveContainer width="100%" height={isMobile ? 190 : 220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 50 : 56}
            outerRadius={isMobile ? 72 : 82}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`${money(v)} (${totalSpent ? ((Number(v) / totalSpent) * 100).toFixed(0) : 0}%)`, "Spent"]}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ color: "var(--text)" }}
            labelStyle={{ color: "var(--text-muted)", fontWeight: 600 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="chart-legend" style={{ marginTop: "0.5rem" }}>
        {data.map((entry, i) => {
          const pct = totalSpent ? ((Number(entry.total) / totalSpent) * 100).toFixed(0) : 0;
          return (
            <li key={i}>
              <span
                className="legend-dot"
                style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
              <span className="legend-name">{entry.category}</span>
              <span className="legend-pct">{pct}%</span>
              <span className="legend-value">{money(entry.total)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MonthlyTrendChart({ data }) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  if (data.length === 0)
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
        Add transactions to see your monthly income vs expenses.
      </p>
    );

  const chartData = data.map((d) => ({
    ...d,
    label: MONTHS[Number(String(d.month).split("-")[1]) - 1] ?? d.month,
  }));

  return (
    <>
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INCOME_GRADIENT[0]} stopOpacity={1} />
              <stop offset="100%" stopColor={INCOME_GRADIENT[1]} stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EXPENSE_GRADIENT[0]} stopOpacity={1} />
              <stop offset="100%" stopColor={EXPENSE_GRADIENT[1]} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            dy={5}
            interval="preserveStartEnd"
            minTickGap={10}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `\u20b9${v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v}`}
            width={isMobile ? 34 : 44}
          />
          <Bar
            dataKey="income"
            name="Income"
            fill="url(#gradIncome)"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="url(#gradExpenses)"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginTop: "0.5rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: "linear-gradient(135deg, #4CAF7D, #2D6A4F)" }} />
            Income
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: "linear-gradient(135deg, #E07A52, #C85A32)" }} />
            Expenses
          </span>
      </div>
    </>
  );
}

function BudgetStatus({ budget }) {
  const diff = Number(budget.target_amount) - Number(budget.actual_amount);

  if (budget.kind === "spending_limit") {
    if (budget.status === "over")
      return <span style={{ color: "var(--danger)", fontWeight: 600 }}>Over by {money(Math.abs(diff))}</span>;
    return <span style={{ color: "var(--text-faint)" }}>{money(Math.max(diff, 0))} left</span>;
  }

  if (budget.status === "reached")
    return <span style={{ color: "var(--positive)", fontWeight: 600 }}>Goal reached</span>;
  return <span style={{ color: "var(--text-faint)" }}>{money(Math.max(diff, 0))} to go</span>;
}

function BudgetsList({ budgets, categoryNames }) {
  if (budgets.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0.25rem 0 0.75rem" }}>
        No budgets set yet. Create a spending limit or savings goal below.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {budgets.map((b) => {
        const pct = Math.min(b.progress_pct, 100);
        const barColor =
          b.kind === "spending_limit"
            ? b.status === "over"
              ? "#C85A32"
              : "#2D6A4F"
            : b.status === "reached"
              ? "#2D6A4F"
              : "#B45309";
        const label =
          (b.kind === "spending_limit" ? "Spending limit" : "Savings goal") +
          (b.category_id ? ` \u00b7 ${categoryNames.get(b.category_id) ?? "Category"}` : " \u00b7 Overall");
        return (
          <div
            key={b.id}
            style={{
              background: "var(--surface-2)",
              borderRadius: 10,
              padding: "0.6rem 0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{label}</span>
              <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {money(b.actual_amount)} / {money(b.target_amount)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ background: "var(--surface)", borderRadius: 5, height: 7, overflow: "hidden", flex: 1 }}>
                <div style={{ width: `${pct}%`, background: barColor, height: "100%" }} />
              </div>
              <BudgetStatus budget={b} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BudgetForm({ categories, onSubmit, onCancel }) {
  const [kind, setKind] = useState("spending_limit");
  const [categoryId, setCategoryId] = useState("");
  const [target, setTarget] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = Number(target);
    if (!amount || amount <= 0 || !month) return;
    const [y, m] = month.split("-").map(Number);
    const mm = String(m).padStart(2, "0");
    const endDay = new Date(y, m, 0).getDate();
    onSubmit({
      kind,
      category_id: categoryId === "" ? null : Number(categoryId),
      target_amount: amount,
      period_start: `${y}-${mm}-01`,
      period_end: `${y}-${mm}-${String(endDay).padStart(2, "0")}`,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "0.75rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} style={{ minWidth: 130, flex: "1 1 120px" }}>
        <option value="spending_limit">Spending limit</option>
        <option value="savings_goal">Savings goal</option>
      </select>
      <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ flex: "1 1 120px" }}>
        <option value="">Overall</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        className="input"
        type="number"
        min="1"
        step="0.01"
        placeholder="Amount"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        style={{ flex: "1 1 100px", minWidth: 90 }}
        required
      />
      <input
        className="input"
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        style={{ flex: "0 0 auto" }}
        required
      />
      <button type="submit" className="btn btn-primary btn-sm">
        Create
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

function BudgetsSection({ budgets, categories, categoryNames, onCreated }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h2 style={CARD_TITLE}>
          Budgets
        </h2>
        {!open && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
            + New budget
          </button>
        )}
      </div>

      {open && (
        <BudgetForm categories={categories} onCancel={() => setOpen(false)} onSubmit={onCreated} />
      )}

      <div style={{ marginTop: open ? "0.75rem" : 0 }}>
        <BudgetsList budgets={budgets} categoryNames={categoryNames} />
      </div>
    </div>
  );
}

function BillStatusBadge({ bill }) {
  const { reminder_status, days_left } = bill;
  if (reminder_status === "OVERDUE") {
    return <span className="badge badge-danger">Overdue by {-days_left}d</span>;
  }
  if (reminder_status === "DUE_SOON") {
    return (
      <span className="badge badge-warning">
        {days_left === 0 ? "Due today" : `Due in ${days_left}d`}
      </span>
    );
  }
  return <span className="badge badge-muted">Due in {days_left}d</span>;
}

function BillsCard({ bills, onMarkPaid }) {
  const total = bills.reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div style={CARD_STYLE}>
      <div className="bill-head">
        <h2 style={CARD_TITLE}>Upcoming bills</h2>
        {bills.length > 0 && (
          <span className="bill-total">
            {bills.length} due · {money(total)}
          </span>
        )}
      </div>

      {bills.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0.25rem 0" }}>
          Nothing due in the next 30 days.
        </p>
      ) : (
        <ul className="bill-list">
          {bills.map((b) => (
            <li key={b.id} className="bill-row">
              <div className="bill-main">
                <p className="bill-name">{b.name}</p>
                <p className="bill-due">
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatShortDate(b.due_date)}
                  </span>
                  <BillStatusBadge bill={b} />
                </p>
              </div>
              <span className="bill-amount">{money(b.amount)}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onMarkPaid(b.id)}
              >
                Mark paid
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const api = useApi();

  const [dashboard, setDashboard] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/analytics/dashboard"), api("/budgets"), api("/categories"), api("/transactions"), api("/bills/upcoming")])
      .then(([dash, budgetList, catList, txnList, billList]) => {
        setDashboard(dash);
        setBudgets(budgetList);
        setCategories(catList);
        setTransactions(txnList);
        setBills(billList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]));

  async function handleBudgetCreated(payload) {
    try {
      await api("/budgets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const budgetList = await api("/budgets");
      setBudgets(budgetList);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBillPaid(billId) {
    try {
      await api(`/bills/${billId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PAID" }),
      });
      const billList = await api("/bills/upcoming");
      setBills(billList);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="dash-page">
      <div className="dash-titlebar">
        <h1>Welcome back, {user?.firstName ?? "there"}</h1>
        <span className="dash-date">{todayLabel}</span>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: "0.88rem" }}>{error}</p>}
      {loading && <p style={{ color: "var(--text-muted)" }}>Loading your dashboard{"\u2026"}</p>}

      {dashboard && (
        <div className="dash-stack">
          <StatsRow health={dashboard.health} />

          <SavingsNote
            income={dashboard.health.total_income}
            expenses={dashboard.health.total_expenses}
            savingsRate={dashboard.health.savings_rate}
          />

          <BillsCard bills={bills} onMarkPaid={handleBillPaid} />

          <BudgetsSection
            budgets={budgets}
            categories={categories}
            categoryNames={categoryNames}
            onCreated={handleBudgetCreated}
          />

          <div className="dash-auto-grid">
            <HealthScoreCard health={dashboard.health} />
            <div style={CARD_STYLE}>
              <h2 style={CARD_TITLE}>Savings breakdown</h2>
              <SavingsBreakdownChart
                income={dashboard.health.total_income}
                expenses={dashboard.health.total_expenses}
                savingsRate={dashboard.health.savings_rate}
              />
            </div>
          </div>

          <div className="dash-auto-grid">
            <div style={CARD_STYLE}>
              <h2 style={CARD_TITLE}>Spending by category</h2>
              <CategoryBreakdownChart data={dashboard.category_breakdown} />
            </div>
            <div style={CARD_STYLE}>
              <h2 style={CARD_TITLE}>Income vs expenses by month</h2>
              <MonthlyTrendChart data={dashboard.monthly_trend} />
            </div>
          </div>

          <div style={CARD_STYLE}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={CARD_TITLE}>Recent transactions</h2>
              {transactions.length > 0 && (
                <Link to="/transactions" style={{ fontSize: "0.82rem", color: "var(--accent)" }}>
                  View all
                </Link>
              )}
            </div>
            <RecentTransactions transactions={transactions} categoryNames={categoryNames} />
          </div>
        </div>
      )}
    </main>
  );
}
