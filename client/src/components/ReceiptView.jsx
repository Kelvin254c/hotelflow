const ksh = (n) => `Ksh ${Number(n).toLocaleString()}`;
const PAY_LABEL = { MPESA: 'Mpesa', CASH: 'Cash', OTHER: 'Other' };

export default function ReceiptView({ order }) {
  return (
    <div id="receipt" className="mx-auto max-w-sm rounded-xl bg-white p-6 text-sm shadow-sm">
      <div className="text-center">
        <div className="text-xl font-bold">Hotelflow</div>
        <div className="text-xs text-gray-500">Kenyan Restaurant POS</div>
      </div>

      <div className="mt-4 space-y-0.5 text-xs text-gray-500">
        <div>Receipt for order #{order.id}</div>
        <div>{new Date(order.createdAt).toLocaleString()}</div>
        <div>Served by: {order.cashier.name}</div>
      </div>

      <div className="mt-4 border-t border-dashed border-gray-400 pt-3">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2 py-1">
            <span>
              {i.quantity} × {i.menuItem.name}
              <span className="block text-xs text-gray-400">@ {ksh(i.unitPrice)}</span>
            </span>
            <span className="whitespace-nowrap">{ksh(i.unitPrice * i.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-gray-400 pt-3">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{ksh(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Tax</span>
          <span>{ksh(order.tax)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-bold">
          <span>Total</span>
          <span>{ksh(order.total)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-dashed border-gray-400 pt-3 text-gray-500">
        <div className="flex justify-between">
          <span>Paid by</span>
          <span>{PAY_LABEL[order.payMethod] || order.payMethod}</span>
        </div>
        {order.amountReceived != null && (
          <>
            <div className="flex justify-between">
              <span>Cash received</span>
              <span>{ksh(order.amountReceived)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span>{ksh(order.amountReceived - order.total)}</span>
            </div>
          </>
        )}
      </div>

      <p className="mt-5 text-center text-xs text-gray-400">Thank you for dining with us!</p>
    </div>
  );
}