import { useEffect, useState } from "react";
import { useApi } from "../lib/api";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit card" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
];

const TYPE_LABELS = new Map(ACCOUNT_TYPES.map((t) => [t.value, t.label]));

const typeLabel = (type) => TYPE_LABELS.get(type) ?? type;

export default function Accounts() {
  const api = useApi();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "checking",
    institution: "",
    last_four_digits: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "checking",
    institution: "",
    last_four_digits: "",
  });

  async function loadData() {
    try {
      const list = await api("/accounts");
      setAccounts(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();

    const payload = {
      name: form.name.trim(),
      type: form.type,
      institution: form.institution.trim() || null,
      last_four_digits: form.last_four_digits.trim() || null,
    };

    try {
      await api("/accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setForm({ name: "", type: "checking", institution: "", last_four_digits: "" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(account) {
    setEditingId(account.id);
    setEditForm({
      name: account.name,
      type: account.type,
      institution: account.institution ?? "",
      last_four_digits: account.last_four_digits ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(e, id) {
    e.preventDefault();

    const payload = {
      name: editForm.name.trim(),
      type: editForm.type,
      institution: editForm.institution.trim() || null,
      last_four_digits: editForm.last_four_digits.trim() || null,
    };

    try {
      await api(`/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this account? Its transactions will be kept but unassigned.")) {
      return;
    }
    try {
      await api(`/accounts/${id}`, { method: "DELETE" });
      setError(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page">
      <header className="page-head">
        <h1>Accounts</h1>
        <p className="page-sub">Keep track of the bank accounts and cards behind your spending.</p>
      </header>

      {error && (
        <div className="alert">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <section className="card panel">
        <h2 className="panel-title">Add an account</h2>
        <form onSubmit={handleAdd} className="form-row">
          <input
            className="input grow"
            type="text"
            placeholder="Account name (e.g. Daily checking)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="text"
            placeholder="Institution (optional)"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          />
          <input
            className="input"
            type="text"
            inputMode="numeric"
            maxLength="4"
            pattern="[0-9]*"
            placeholder="Last 4 (optional)"
            value={form.last_four_digits}
            onChange={(e) =>
              setForm({ ...form, last_four_digits: e.target.value.replace(/\D/g, "") })
            }
            title="Last 4 digits of the account number"
          />
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </section>

      <section className="card panel">
        <div className="panel-title-row">
          <h2 className="panel-title" style={{ marginBottom: 0 }}>
            Your accounts
          </h2>
          {!loading && accounts.length > 0 && (
            <span className="count">{accounts.length}</span>
          )}
        </div>

        {loading && (
          <div className="skeleton-stack">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}

        {!loading && accounts.length === 0 && (
          <p className="state">No accounts yet. Add one above to get started.</p>
        )}

        {!loading && accounts.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Institution</th>
                  <th className="right">Last four</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const isEditing = a.id === editingId;
                  return (
                    <tr key={a.id}>
                      <td data-label="Name">
                        {isEditing ? (
                          <input
                            className="input"
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            required
                          />
                        ) : (
                          a.name
                        )}
                      </td>
                      <td data-label="Type">
                        {isEditing ? (
                          <select
                            className="input"
                            value={editForm.type}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          >
                            {ACCOUNT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={a.type === "credit_card" ? "badge" : "badge badge-muted"}>
                            {typeLabel(a.type)}
                          </span>
                        )}
                      </td>
                      <td data-label="Institution">
                        {isEditing ? (
                          <input
                            className="input"
                            type="text"
                            value={editForm.institution}
                            onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                          />
                        ) : (
                          a.institution ?? <span style={{ color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>
                      <td data-label="Last four" className="right">
                        {isEditing ? (
                          <input
                            className="input"
                            type="text"
                            inputMode="numeric"
                            maxLength="4"
                            pattern="[0-9]*"
                            value={editForm.last_four_digits}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                last_four_digits: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            title="Last 4 digits of the account number"
                          />
                        ) : a.last_four_digits ? (
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>
                            •••• {a.last_four_digits}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>
                      <td data-label="Actions" className="right">
                        {isEditing ? (
                          <span className="row-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={(e) => handleSaveEdit(e, a.id)}
                            >
                              Save
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="row-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(a)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(a.id)}
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
