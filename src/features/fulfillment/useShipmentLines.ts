import { useEffect, useState } from 'react';
import { fulfillmentApi } from './api/fulfillmentApi';

/** One order item carried by a shipment (ShipmentResponse.lines). */
export interface ShipmentLine {
  orderItemId: number;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
}

type LinesByShipment = Record<string, ShipmentLine[]>;

/**
 * Lines of every shipment of a seller order, keyed by shipmentId. `shipmentsKey` should change whenever the
 * shipment list does (e.g. ids + statuses) so the lines are reloaded with it. A shipment created before shipment
 * lines existed has none (it carried the whole order). Failures leave the map empty: lines are extra detail.
 */
export function useShipmentLines(sellerOrderId: string, shipmentsKey: string): LinesByShipment {
  const key = `${sellerOrderId}|${shipmentsKey}`;
  const [loaded, setLoaded] = useState<{ key: string; lines: LinesByShipment }>({ key: '', lines: {} });

  useEffect(() => {
    if (!shipmentsKey) return;
    let current = true;
    fulfillmentApi.getShipmentsBySellerOrder(sellerOrderId)
      .then((list: Array<{ shipmentId: number; lines?: ShipmentLine[] }>) => {
        if (!current) return;
        const lines: LinesByShipment = {};
        for (const shipment of Array.isArray(list) ? list : []) {
          lines[String(shipment.shipmentId)] = Array.isArray(shipment.lines) ? shipment.lines : [];
        }
        setLoaded({ key, lines });
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [key, sellerOrderId, shipmentsKey]);

  return loaded.key === key ? loaded.lines : {};
}
