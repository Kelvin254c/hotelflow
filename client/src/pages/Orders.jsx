import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const ksh = (n) => `Ksh ${Number(n).toLocaleString()}`;
const PAY_LABEL = { MPESA: 'Mpesa', CASH: 'Cash', OTHER: 'Other' };
const EMPTY = { search: '', payMethod: '', from: '', to: '' };

export default function Orders() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page });
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    apiFetch(`/api/orders?${params}`)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  function update(key, value) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  }

  const input =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600';

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-sm text-gray-500">
              {user.role === 'MANAGER'
                ? 'All orders from every cashier'
                : 'Orders you have taken'}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-gray-400">
              {user.role === 'MANAGER' ? 'Manager' : 'Cashier'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <input
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Order number, e.g. 25"
            className={`${input} w-52`}
          />
          <select
            value={filters.payMethod}
            onChange={(e) => update('payMethod', e.target.value)}
            className={input}
          >
            <option value="">All payments</option>
            <option value="MPESA">Mpesa</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
          <div>
            <label className="block text-xs text-gray-400">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => update('from', e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => update('to', e.target.value)}
              className={input}
            />
          </div>
          <button
            onClick={() => {
              setFilters(EMPTY);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            Clear filters
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="py-2 pr-3">Order</th>
                  <th className="pr-3">Date &amp; time</th>
                  <th className="pr-3">Cashier</th>
                  <th className="pr-3">Items</th>
                  <th className="pr-3">Payment</th>
                  <th className="pr-3">Total</th>
                  <th className="pr-3">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.orders.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="py-3 pr-3 font-medium">#{o.id}</td>
                    <td className="whitespace-nowrap pr-3 text-gray-500">
                      {new Date(o.createdAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="pr-3 text-gray-500">{o.cashier.name}</td>
                    <td className="pr-3">{o.itemCount}</td>
                    <td className="pr-3">{PAY_LABEL[o.payMethod] || o.payMethod}</td>
                    <td className="pr-3 font-medium">{ksh(o.total)}</td>
                    <td className="pr-3">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        {o.status === 'COMPLETED' ? 'Completed' : o.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/orders/${o.id}`}
                        className="text-xs font-semibold text-green-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {data && data.orders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-6 text-center text-gray-400">
                      No orders found.
                    </td>
                  </tr>
                )}
                {!data && !error && (
                  <tr>
                    <td colSpan="8" className="py-6 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>
                Page {data.page} of {data.pages} · {data.total} orders
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}