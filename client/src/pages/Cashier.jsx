import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import Sidebar from '../components/Sidebar';

const TAX_RATE = 0.08; // keep the same as the server
const PAY_METHODS = [
  { value: 'MPESA', label: 'Mpesa' },
  { value: 'CASH', label: 'Cash' },
  { value: 'OTHER', label: 'Other' },
];

const ksh = (n) => `Ksh ${n.toLocaleString()}`;

export default function Cashier() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [payMethod, setPayMethod] = useState('MPESA');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/api/menu')
      .then((d) => {
        setCategories(d.categories);
        setItems(d.items);
      })
      .catch((e) => setStatus({ type: 'error', text: e.message }));
  }, []);

  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (activeCat === 'all' || i.categoryId === activeCat) &&
          i.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, activeCat, search]
  );

  function addToCart(item) {
    setStatus(null);
    setCart((prev) => {
      const found = prev.find((l) => l.item.id === item.id);
      if (found) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((l) => (l.item.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((l) => l.item.id !== id));
  }

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  async function checkout() {
    setSubmitting(true);
    setStatus(null);
    try {
      const order = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          payMethod,
          items: cart.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
        }),
      });
      setCart([]);
      setStatus({
        type: 'success',
        text: `Order #${order.id} saved. Total ${ksh(order.total)}`,
      });
    } catch (e) {
      setStatus({ type: 'error', text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu..."
            className="w-full max-w-sm rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-green-600"
          />
          <div className="text-right text-sm">
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-gray-400">
              {user.role === 'MANAGER' ? 'Manager' : 'Cashier'}
            </div>
          </div>
        </header>

        {/* Category tabs */}
        <div className="flex gap-3 overflow-x-auto px-4 pb-2">
          {[{ id: 'all', name: 'All' }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-xl border px-5 py-3 text-sm font-medium ${
                activeCat === c.id
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-4 font-semibold">Menu</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center rounded-xl bg-white p-4 text-center shadow-sm"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-xl font-bold text-green-700">
                  {item.name[0]}
                </div>
                <div className="mt-3 text-sm font-medium">{item.name}</div>
                <div className="mt-1 text-sm font-semibold text-green-600">
                  {ksh(item.price)}
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="mt-3 w-full rounded-full bg-green-600 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  + Add
                </button>
              </div>
            ))}
            {visible.length === 0 && (
              <p className="col-span-full text-sm text-gray-400">No items found.</p>
            )}
          </div>
        </div>
      </main>

      {/* Order panel */}
      <aside className="flex w-80 flex-col border-l border-gray-100 bg-white p-5">
        <h2 className="text-lg font-bold">Order Details</h2>
        <p className="text-xs text-gray-400">{new Date().toLocaleString()}</p>

        <div className="mt-4 flex-1 overflow-y-auto">
          {cart.length === 0 && (
            <p className="text-sm text-gray-400">No items yet. Tap Add on a menu item.</p>
          )}
          {cart.map((l) => (
            <div key={l.item.id} className="flex items-center justify-between border-b border-gray-100 py-3">
              <div>
                <div className="text-sm font-medium">{l.item.name}</div>
                <div className="text-xs font-semibold text-green-600">
                  {ksh(l.item.price * l.quantity)}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => changeQty(l.item.id, -1)}
                    className="h-6 w-6 rounded border border-gray-200 text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm">{l.quantity}</span>
                  <button
                    onClick={() => changeQty(l.item.id, 1)}
                    className="h-6 w-6 rounded border border-gray-200 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => removeLine(l.item.id)}
                className="text-gray-300 hover:text-red-500"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{ksh(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax ({TAX_RATE * 100}%)</span>
            <span>{ksh(tax)}</span>
          </div>
          <div className="flex justify-between pt-2 text-lg font-bold">
            <span>Total</span>
            <span>{ksh(total)}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {PAY_METHODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPayMethod(p.value)}
              className={`rounded-lg border py-2 text-sm font-medium ${
                payMethod === p.value
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {status && (
          <div
            className={`mt-3 rounded-lg p-3 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {status.text}
          </div>
        )}

        <button
          onClick={checkout}
          disabled={cart.length === 0 || submitting}
          className="mt-3 w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : `Checkout • ${ksh(total)}`}
        </button>
      </aside>
    </div>
  );
}