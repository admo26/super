import { createClient } from "@/lib/supabase/server";

export type OrderHistoryRow = {
  order_date: string | null;
  item_name: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  notes: string | null;
  source_type: string;
  source_name: string | null;
};

export type OrderHistoryItem = {
  itemName: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  notes: string | null;
};

export type OrderHistoryGroup = {
  orderDate: string;
  sourceType: string;
  sourceName: string | null;
  items: OrderHistoryItem[];
};

export type OrderHistorySummary = {
  totalRows: number;
  totalOrders: number;
  latestOrderDate: string | null;
  earliestOrderDate: string | null;
  sourceLabel: string;
  orders: OrderHistoryGroup[];
};

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function normalizeOrderDate(value: string | null) {
  return value ?? "Unknown date";
}

function mapItem(row: OrderHistoryRow): OrderHistoryItem {
  return {
    itemName: row.item_name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    notes: row.notes
  };
}

// Supabase/PostgREST caps a single response at 1000 rows by default, so the
// history must be paged or older orders silently stop rendering.
const HISTORY_PAGE_SIZE = 1000;

export async function getOrderHistoryRows(limit?: number): Promise<OrderHistoryRow[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const rows: OrderHistoryRow[] = [];
    let from = 0;

    while (true) {
      const remaining = typeof limit === "number" ? limit - rows.length : HISTORY_PAGE_SIZE;
      if (remaining <= 0) {
        break;
      }
      const pageSize = Math.min(HISTORY_PAGE_SIZE, remaining);

      const result = await supabase
        .from("order_history_items")
        .select("order_date, item_name, quantity, unit, category, notes, source_type, source_name")
        .order("order_date", { ascending: false })
        .order("item_name", { ascending: true })
        // id tiebreaker keeps the sort stable across pages.
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (result.error) {
        return [];
      }

      const page = (result.data ?? []) as OrderHistoryRow[];
      rows.push(...page);

      if (page.length < pageSize) {
        break;
      }
      from += pageSize;
    }

    return rows;
  } catch {
    return [];
  }
}

export async function getOrderHistory(): Promise<OrderHistorySummary> {
  if (!hasSupabaseConfig()) {
    return {
      totalRows: 0,
      totalOrders: 0,
      latestOrderDate: null,
      earliestOrderDate: null,
      sourceLabel: "Unavailable",
      orders: []
    };
  }

  try {
    const rows = await getOrderHistoryRows();

    if (!rows.length) {
      return {
        totalRows: 0,
        totalOrders: 0,
        latestOrderDate: null,
        earliestOrderDate: null,
        sourceLabel: "Supabase",
        orders: []
      };
    }

    const grouped = new Map<string, OrderHistoryGroup>();

    for (const row of rows) {
      const orderDate = normalizeOrderDate(row.order_date);
      const key = `${orderDate}::${row.source_type}::${row.source_name ?? ""}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          orderDate,
          sourceType: row.source_type,
          sourceName: row.source_name,
          items: []
        });
      }

      grouped.get(key)!.items.push(mapItem(row));
    }

    const orders = [...grouped.values()].sort((left, right) =>
      right.orderDate.localeCompare(left.orderDate)
    );

    const knownDates = rows
      .map((row) => row.order_date)
      .filter((value): value is string => Boolean(value))
      .sort();

    return {
      totalRows: rows.length,
      totalOrders: orders.length,
      latestOrderDate: knownDates.at(-1) ?? null,
      earliestOrderDate: knownDates[0] ?? null,
      sourceLabel: "Supabase",
      orders
    };
  } catch {
    return {
      totalRows: 0,
      totalOrders: 0,
      latestOrderDate: null,
      earliestOrderDate: null,
      sourceLabel: "Unavailable",
      orders: []
    };
  }
}
