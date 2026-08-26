import { useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";

export default function Transactions() {
  const api = useApi();

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ amount: "", txn_date: "", description: "", account_id: "" });
  const [csvFile, setCsvFile] = useState(null);
  const [csvAccountId, setCsvAccountId] = useState("");
  const [importResult, setImportResult] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", txn_date: "", description: "", account_id: "" });
  const [deleting, setDeleting] = useState(null);

  async function loadData() {
    try {
      const [txns, cats, accts] = await Promise.all([
        api("/transactions"),
        api("/categories"),
        api("/accounts"),
      ]);
      setTransactions(txns);
      setCategories(cats);
      setAccounts(accts);
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
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          account_id: form.account_id === "" ? null : Number(form.account_id),
        }),
      });
      setForm({ amount: "", txn_date: "", description: "", account_id: "" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAccountChange(txnId, value) {
    const accountId = value === "" ? null : Number(value);
    try {
      const updated = await api(`/transactions/${txnId}`, {
        method: "PATCH",
        body: JSON.stringify({ account_id: accountId }),
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === txnId ? { ...t, account_id: updated.account_id } : t))
      );
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCategoryChange(txnId, value) {
    const categoryId = value === "" ? null : Number(value);
    try {
      const updated = await api(`/transactions/${txnId}`, {
        method: "PATCH",
        body: JSON.stringify({ category_id: categoryId }),
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === txnId ? { ...t, category_id: updated.category_id } : t))
      );
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function openEdit(txn) {
    setEditing(txn);
    setEditForm({
      amount: String(txn.amount),
      txn_date: txn.txn_date,
      description: txn.description,
      account_id: txn.account_id == null ? "" : String(txn.account_id),
    });
  }

  function closeEdit() {
    setEditing(null);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editing) return;
    try {
      const updated = await api(`/transactions/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: Number(editForm.amount),
          txn_date: editForm.txn_date,
          description: editForm.description,
          account_id: editForm.account_id === "" ? null : Number(editForm.account_id),
        }),
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === editing.id ? { ...t, ...updated } : t))
      );
      setEditing(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api(`/transactions/${deleting.id}`, { method: "DELETE" });
      setTransactions((prev) => prev.filter((t) => t.id !== deleting.id));
      setDeleting(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCsvUpload(e) {
    e.preventDefault();
    if (!csvFile) return;

    const body = new FormData();
    body.append("file", csvFile);
    if (csvAccountId !== "") body.append("account_id", csvAccountId);

    try {
      const result = await api("/transactions/import", { method: "POST", body });
      setImportResult(result);
      setCsvFile(null);
      setCsvAccountId("");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const skipCount = importResult?.skipped_duplicates ?? 0;

  return (
    <main className="page">
      <header className="page-head">
        <h1>Transactions</h1>
        <p className="page-sub">Track income and expenses, or import a bank statement.</p>
      </header>

      {error && (
        <div className="alert">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <section className="card panel">
        <h2 className="panel-title">Add a transaction</h2>
        <form onSubmit={handleAdd} className="form-row">
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Amount (negative = expense)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <input
            className="input"
            type="date"
            value={form.txn_date}
            onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
            required
          />
          <input
            className="input grow"
            type="text"
            placeholder="Description / merchant"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <select
            className="input"
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
          >
            <option value="">No account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </section>

      <section className="card panel">
        <h2 className="panel-title">Import a bank statement (CSV)</h2>
        <form onSubmit={handleCsvUpload} className="form-row">
          <label className={`file-btn${csvFile ? " has-file" : ""}`}>
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setCsvFile(e.target.files[0])}
            />
            {csvFile ? csvFile.name : "Choose CSV file"}
          </label>
          <select
            className="input"
            value={csvAccountId}
            onChange={(e) => setCsvAccountId(e.target.value)}
          >
            <option value="">No account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost" disabled={!csvFile}>
            Upload
          </button>
        </form>
        {importResult && (
          <p className="note">
            Imported {importResult.imported}, skipped {skipCount} duplicate
            {skipCount === 1 ? "" : "s"}
            {importResult.errors.length > 0
              ? `, ${importResult.errors.length} row(s) had issues.`
              : "."}
          </p>
        )}
      </section>

      <section className="card panel">
        <div className="panel-title-row">
          <h2 className="panel-title" style={{ marginBottom: 0 }}>
            All transactions
          </h2>
          {!loading && transactions.length > 0 && (
            <span className="count">{transactions.length}</span>
          )}
        </div>

        {loading && (
          <div className="skeleton-stack">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <p className="state">No transactions yet. Add one above or import a CSV.</p>
        )}

        {!loading && transactions.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th className="right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const amount = Number(t.amount);
                  return (
                    <tr key={t.id}>
                      <td data-label="Date">{formatDate(t.txn_date)}</td>
                      <td data-label="Description">{t.description}</td>
                      <td data-label="Category">
                        <select
                          className="input"
                          value={t.category_id == null ? "" : String(t.category_id)}
                          onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Account">
                        <select
                          className="input"
                          value={t.account_id == null ? "" : String(t.account_id)}
                          onChange={(e) => handleAccountChange(t.id, e.target.value)}
                        >
                          <option value="">No account</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        data-label="Amount"
                        className="right txn-amount"
                        style={{ color: amount < 0 ? "var(--danger)" : "var(--positive)" }}
                      >
                        {amount < 0 ? "\u2212" : "+"}
                        {formatCurrency(Math.abs(amount))}
                      </td>
                      <td data-label="Actions">
                        <div className="txn-actions">
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit transaction"
                            onClick={() => openEdit(t)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Delete transaction"
                            onClick={() => setDeleting(t)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit transaction</h3>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="modal-body">
                <div className="form-col">
                  <label>
                    Amount
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Date
                    <input
                      className="input"
                      type="date"
                      value={editForm.txn_date}
                      onChange={(e) => setEditForm({ ...editForm, txn_date: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Description
                    <input
                      className="input"
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Account
                    <select
                      className="input"
                      value={editForm.account_id}
                      onChange={(e) => setEditForm({ ...editForm, account_id: e.target.value })}
                    >
                      <option value="">No account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-backdrop" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Delete transaction?</h3>
            </div>
            <div className="modal-body">
              <p>
                This will permanently delete <strong>{deleting.description}</strong> for{" "}
                {formatCurrency(Number(deleting.amount))} on {formatDate(deleting.txn_date)}.
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
