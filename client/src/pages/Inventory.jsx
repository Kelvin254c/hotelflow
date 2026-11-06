import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const ksh = (n) => `Ksh ${Number(n).toLocaleString()}`;

const STATUS = {
  IN_STOCK: { label: 'In Stock', cls: 'bg-green-50 text-green-700' },
  LOW: { label: 'Low Stock', cls: 'bg-orange-50 text-orange-600' },
  OUT: { label: 'Out of Stock', cls: 'bg-red-50 text-red-600' },
};

const EMPTY = {
  name: '',
  category: '',
  unit: 'Kg',
  currentStock: '',
  minLevel: '',
  unitCost: '',
};

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const [form, setForm] = useState(null); // null = modal closed
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = await apiFetch('/api/inventory');
      setItems(d.items);
      setStats(d.stats);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))].sort(),
    [items]
  );

  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) &&
          (category === 'all' || i.category === category) &&
          (status === 'all' || i.status === status)
      ),
    [items, search, category, status]
  );

  const alerts = items.filter((i) => i.status !== 'IN_STOCK');

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      minLevel: item.minLevel,
      unitCost: item.unitCost,
    });
    setFormError('');
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const path = editingId ? `/api/inventory/${editingId}` : '/api/inventory';
      await apiFetch(path, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-600';

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-sm text-gray-500">
              Track ingredients, manage stock levels and avoid shortages
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openAdd}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              + Add Ingredient
            </button>
            <div className="text-right text-sm">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-gray-400">Manager</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Ingredients" value={stats.total} tone="text-gray-900" />
            <StatCard label="In Stock" value={stats.inStock} tone="text-green-600" />
            <StatCard label="Low Stock" value={stats.low} tone="text-orange-500" />
            <StatCard label="Out of Stock" value={stats.out} tone="text-red-500" />
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_280px]">
          {/* Table */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ingredients..."
                className="min-w-[180px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-600"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="all">Stock Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="OUT">Out of Stock</option>
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="py-2 pr-3">Ingredient</th>
                    <th className="pr-3">Category</th>
                    <th className="pr-3">Unit</th>
                    <th className="pr-3">Current</th>
                    <th className="pr-3">Min</th>
                    <th className="pr-3">Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="py-3 pr-3 font-medium">{i.name}</td>
                      <td className="pr-3 text-gray-500">{i.category}</td>
                      <td className="pr-3 text-gray-500">{i.unit}</td>
                      <td className="pr-3">{i.currentStock}</td>
                      <td className="pr-3 text-gray-500">{i.minLevel}</td>
                      <td className="pr-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[i.status].cls}`}
                        >
                          {STATUS[i.status].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <button
                          onClick={() => openEdit(i)}
                          className="mr-3 text-xs font-semibold text-green-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(i)}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-gray-400">
                        No ingredients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Showing {visible.length} of {items.length} ingredients
            </p>
          </div>

          {/* Side panels */}
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Low Stock Alerts</h3>
              <div className="mt-3 space-y-3">
                {alerts.length === 0 && (
                  <p className="text-sm text-gray-400">Everything is well stocked.</p>
                )}
                {alerts.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span>{i.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[i.status].cls}`}>
                      {i.currentStock} {i.unit} left
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {stats && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">Stock Value</div>
                <div className="mt-1 text-2xl font-bold">{ksh(stats.stockValue)}</div>
                <div className="text-xs text-gray-400">Total value of current inventory</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add / Edit modal */}
      {form && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Ingredient' : 'Add Ingredient'}
            </h2>

            {formError && (
              <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                {formError}
              </div>
            )}

            <label className="mt-4 block text-sm font-medium">Name</label>
            <input
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Category</label>
                <input
                  className={field}
                  list="cat-options"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                />
                <datalist id="cat-options">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium">Unit</label>
                <select
                  className={field}
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option>Kg</option>
                  <option>Ltrs</option>
                  <option>Pcs</option>
                </select>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">Current</label>
                <input
                  type="number" step="any" min="0" className={field}
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Minimum</label>
                <input
                  type="number" step="any" min="0" className={field}
                  value={form.minLevel}
                  onChange={(e) => setForm({ ...form, minLevel: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Cost/unit</label>
                <input
                  type="number" step="any" min="0" className={field}
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}