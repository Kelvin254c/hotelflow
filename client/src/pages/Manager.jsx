import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const ksh = (n) => `Ksh ${Number(n).toLocaleString()}`;
const COLORS = ['#16a34a', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#94a3b8'];

function Change({ value }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <div className={`mt-1 text-xs ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(value)}% vs previous period
    </div>
  );
}

function StatCard({ label, value, children }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {children}
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ${className}`}>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export default function Manager() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    apiFetch(`/api/reports?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [days]);

  const maxItem = data?.topItems[0]?.revenue || 1;
  const catTotal = data ? data.byCategory.reduce((s, c) => s + c.value, 0) : 0;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-gray-500">
              Business performance, sales trends and inventory overview
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <div className="text-right text-sm">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-gray-400">Manager</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        {!data && !error && <p className="mt-6 text-sm text-gray-400">Loading...</p>}

        {data && (
          <>
            {/* Stat cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Revenue" value={ksh(data.revenue)}>
                <Change value={data.revenueChange} />
              </StatCard>
              <StatCard label="Total Orders" value={data.orderCount.toLocaleString()}>
                <Change value={data.orderChange} />
              </StatCard>
              <StatCard label="Average Order Value" value={ksh(data.avgOrder)} />
              <StatCard label="Items Sold" value={data.itemsSold.toLocaleString()} />
            </div>

            {/* Charts row */}
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <Card title="Sales Performance" className="xl:col-span-1">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} width={50} />
                      <Tooltip formatter={(v) => ksh(v)} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#16a34a"
                        fill="#dcfce7"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Sales by Category">
                {data.byCategory.length === 0 ? (
                  <p className="text-sm text-gray-400">No sales yet.</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.byCategory}
                            dataKey="value"
                            innerRadius={45}
                            outerRadius={75}
                          >
                            {data.byCategory.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => ksh(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex-1 space-y-1.5 text-sm">
                      {data.byCategory.map((c, i) => (
                        <li key={c.name} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: COLORS[i % COLORS.length] }}
                            />
                            {c.name}
                          </span>
                          <span className="text-gray-500">
                            {Math.round((c.value / catTotal) * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              <Card title="Top Selling Items">
                {data.topItems.length === 0 && (
                  <p className="text-sm text-gray-400">No sales yet.</p>
                )}
                <div className="space-y-4">
                  {data.topItems.map((t) => (
                    <div key={t.name}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-gray-500">{ksh(t.revenue)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{ width: `${(t.revenue / maxItem) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Bottom row */}
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <Card title="Inventory Overview">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="text-xl font-bold text-green-700">{data.inventory.inStock}</div>
                    <div className="text-xs text-gray-500">In Stock</div>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-3">
                    <div className="text-xl font-bold text-orange-600">{data.inventory.low}</div>
                    <div className="text-xs text-gray-500">Low Stock</div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <div className="text-xl font-bold text-red-600">{data.inventory.out}</div>
                    <div className="text-xs text-gray-500">Out of Stock</div>
                  </div>
                </div>
              </Card>

              <Card title="Recent Orders">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-gray-400">
                    <tr>
                      <th className="pb-2">Order</th>
                      <th>Time</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((o) => (
                      <tr key={o.id} className="border-t border-gray-100">
                        <td className="py-2">#{o.id}</td>
                        <td className="text-gray-500">
                          {new Date(o.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{ksh(o.total)}</td>
                        <td>
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                            {o.status === 'COMPLETED' ? 'Completed' : o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.recent.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-3 text-gray-400">No orders yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>

              <Card title="Business Insights">
                <ul className="space-y-3 text-sm">
                  {data.insights.map((text, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-600" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}