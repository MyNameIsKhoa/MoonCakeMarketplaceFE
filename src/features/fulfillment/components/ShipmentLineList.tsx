import type { ShipmentLine } from '../useShipmentLines';

/** The items (and units) one shipment carries; nothing for a legacy whole-order shipment or while loading. */
export function ShipmentLineList({ lines }: { lines?: ShipmentLine[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="text-xs text-gray-600">
      <span className="font-medium text-gray-700">Sản phẩm trong kiện:</span>
      <ul className="m-0 mt-0.5 pl-4 list-disc">
        {lines.map((line) => (
          <li key={line.orderItemId}>
            {line.productNameSnapshot ?? `Sản phẩm #${line.orderItemId}`}
            {line.variantNameSnapshot ? ` (${line.variantNameSnapshot})` : ''} × {line.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}
