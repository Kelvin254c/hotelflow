import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ReceiptView from '../components/ReceiptView';
import { apiFetch } from '../api';

export default function Receipt() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrder(null);
    setError('');
    apiFetch(`/api/orders/${id}`)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="no-print mx-auto mb-4 flex max-w-sm items-center justify-between">
          <Link to="/orders" className="text-sm font-semibold text-green-600 hover:underline">
            ← Back to orders
          </Link>
          {order && (
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Reprint receipt
            </button>
          )}
        </div>

        {error && (
          <div className="no-print mx-auto max-w-sm rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {!order && !error && (
          <p className="no-print text-center text-sm text-gray-400">Loading...</p>
        )}

        {order && <ReceiptView order={order} />}
      </main>
    </div>
  );
}