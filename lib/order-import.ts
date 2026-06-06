export type ParsedOrderHistoryItem = {
  order_date: string | null;
  item_name: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  notes: string | null;
};

export type ParsedOrderHistoryPayload = {
  source_name: string;
  summary: string;
  confidence_notes: string[];
  items: ParsedOrderHistoryItem[];
};
