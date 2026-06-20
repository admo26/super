"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileUp, ListPlus, Save, Trash2, UploadCloud } from "lucide-react";

import { Button, DataTable, Field, Panel, Tag } from "@/app/ui";
import type { ParsedOrderHistoryItem, ParsedOrderHistoryPayload } from "@/lib/order-import";

function createEmptyRow(): ParsedOrderHistoryItem {
  return {
    order_date: null,
    item_name: "",
    quantity: null,
    unit: null,
    category: null,
    notes: null
  };
}

export function ImportHistoryManager() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedOrderHistoryPayload | null>(null);
  const [draftItems, setDraftItems] = useState<ParsedOrderHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function handleParse() {
    if (!file) {
      setError("Choose a PDF or image first.");
      return;
    }

    setError(null);
    setSaveMessage(null);

    startParsing(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-history/parse", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        setParsed(null);
        setDraftItems([]);
        setError(payload.error ?? "Failed to parse file.");
        return;
      }

      const parsedPayload = payload as ParsedOrderHistoryPayload;
      setParsed(parsedPayload);
      setDraftItems(parsedPayload.items.map((item) => ({ ...item })));
    });
  }

  function handleSave() {
    if (!parsed) return;

    setError(null);
    setSaveMessage(null);

    startSaving(async () => {
      const items = draftItems
        .map((item) => ({
          order_date: item.order_date?.trim() ? item.order_date.trim() : null,
          item_name: item.item_name.trim(),
          quantity: item.quantity?.trim() ? item.quantity.trim() : null,
          unit: item.unit?.trim() ? item.unit.trim() : null,
          category: item.category?.trim() ? item.category.trim() : null,
          notes: item.notes?.trim() ? item.notes.trim() : null
        }))
        .filter((item) => item.item_name.length > 0);

      if (!items.length) {
        setError("Add at least one item name before saving.");
        return;
      }

      const response = await fetch("/api/import-history/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsed,
          items
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Failed to save parsed rows.");
        return;
      }

      setSaveMessage(`Saved ${payload.saved} order history rows to Supabase.`);
      router.refresh();
    });
  }

  function updateRow(index: number, field: keyof ParsedOrderHistoryItem, value: string) {
    setDraftItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: value || null
            }
          : item
      )
    );
  }

  function addRow() {
    setDraftItems((current) => [...current, createEmptyRow()]);
  }

  function removeRow(index: number) {
    setDraftItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <>
      <Panel>
        <div className="section-header">
          <div>
            <h2><UploadCloud aria-hidden="true" size={19} /> Upload a receipt or order</h2>
            <p>We&apos;ll pull out the items, then you can give it a quick once-over before saving.</p>
          </div>
        </div>

        <div className="import-controls">
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button icon={<FileUp aria-hidden="true" />} onClick={handleParse} disabled={!file || isParsing}>
            {isParsing ? "Reading order..." : "Read order"}
          </Button>
          {parsed ? (
            <Button variant="secondary" icon={<Save aria-hidden="true" />} onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save to history"}
            </Button>
          ) : null}
        </div>

        {file ? <p className="helper-text">Ready to review: <strong>{file.name}</strong></p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {saveMessage ? <p className="success-text">{saveMessage}</p> : null}
      </Panel>

      {parsed ? (
        <>
          <Panel tone="tinted">
            <div className="section-header">
              <div>
                <h2>What we found</h2>
                <p>{parsed.summary}</p>
              </div>
            </div>

            <ul className="note-list">
              {parsed.confidence_notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <div className="section-header">
              <div>
                <h2>Give it a quick tidy-up</h2>
                <p>Fix anything that looks off before you save it to your history.</p>
              </div>
              <Button icon={<ListPlus aria-hidden="true" />} variant="secondary" onClick={addRow} type="button">
                Add an item
              </Button>
            </div>

            <DataTable className="import-table">
              <div className="import-table__head">
                <span>Date</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Category</span>
                <span>Notes</span>
                <span>Action</span>
              </div>

              {draftItems.map((item, index) => (
                <div className="import-table__row" key={index}>
                  <Field
                    type="date"
                    value={item.order_date ?? ""}
                    onChange={(event) => updateRow(index, "order_date", event.target.value)}
                    aria-label="Order date"
                  />
                  <Field
                    type="text"
                    value={item.item_name}
                    onChange={(event) => updateRow(index, "item_name", event.target.value)}
                    placeholder="Item name"
                    aria-label="Item name"
                  />
                  <Field
                    type="text"
                    value={item.quantity ?? ""}
                    onChange={(event) => updateRow(index, "quantity", event.target.value)}
                    placeholder="Qty"
                    aria-label="Quantity"
                  />
                  <Field
                    type="text"
                    value={item.unit ?? ""}
                    onChange={(event) => updateRow(index, "unit", event.target.value)}
                    placeholder="Unit"
                    aria-label="Unit"
                  />
                  <Field
                    type="text"
                    value={item.category ?? ""}
                    onChange={(event) => updateRow(index, "category", event.target.value)}
                    placeholder="Category"
                    aria-label="Category"
                  />
                  <textarea
                    className="ui-input import-textarea"
                    value={item.notes ?? ""}
                    onChange={(event) => updateRow(index, "notes", event.target.value)}
                    placeholder="Notes"
                    aria-label="Notes"
                    rows={2}
                  />
                  <Button
                    className="ghost-button--small"
                    icon={<Trash2 aria-hidden="true" />}
                    variant="danger"
                    type="button"
                    onClick={() => removeRow(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </DataTable>

            <div className="import-footer">
              <Tag tone="info">
                {draftItems.length} item{draftItems.length === 1 ? "" : "s"} in this draft.
              </Tag>
              <Button icon={<ListPlus aria-hidden="true" />} variant="secondary" onClick={addRow} type="button">
                Add an item
              </Button>
            </div>
          </Panel>
        </>
      ) : null}
    </>
  );
}
