"use client";

import { useState, useTransition } from "react";

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

export default function ImportPage() {
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
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Order Import</p>
          <h1>Bring In PDFs And Screenshots</h1>
          <p className="hero-copy">
            Upload a supermarket PDF or screenshot, let AI turn it into order rows, review the result, and save it to Supabase.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-stats">
            <article className="stat-card">
              <span className="stat-label">Accepted files</span>
              <strong>PDF, PNG, JPG</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Flow</span>
              <strong>Parse then review</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Save target</span>
              <strong>Supabase</strong>
            </article>
          </div>

          <aside className="hero-aside">
            <h2>Why This Exists</h2>
            <p className="hero-note">
              This is the bridge from messy order documents into structured history that the weekly planner can actually use.
            </p>
            <p className="hero-note">
              Parsing runs through your Vercel AI setup so usage stays visible in one place.
            </p>
          </aside>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "18px" }}>
        <div className="section-header">
          <div>
            <h2>Upload</h2>
            <p>Start with one order document so we can sanity-check extraction quality before scaling up.</p>
          </div>
        </div>

        <div className="import-controls">
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button onClick={handleParse} disabled={!file || isParsing}>
            {isParsing ? "Parsing..." : "Parse order"}
          </button>
          {parsed ? (
            <button className="ghost-button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save rows"}
            </button>
          ) : null}
        </div>

        {file ? <p className="helper-text">Selected file: {file.name}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {saveMessage ? <p className="success-text">{saveMessage}</p> : null}
      </section>

      {parsed ? (
        <>
          <section className="panel" style={{ marginTop: "18px" }}>
            <div className="section-header">
              <div>
                <h2>Parse Summary</h2>
                <p>{parsed.summary}</p>
              </div>
            </div>

            <ul className="note-list">
              {parsed.confidence_notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="panel" style={{ marginTop: "18px" }}>
            <div className="section-header">
              <div>
                <h2>Preview Rows</h2>
                <p>Edit, add, or remove rows before saving them to order history.</p>
              </div>
              <button className="ghost-button" onClick={addRow} type="button">
                Add line
              </button>
            </div>

            <div className="import-table">
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
                  <input
                    className="import-input"
                    type="date"
                    value={item.order_date ?? ""}
                    onChange={(event) => updateRow(index, "order_date", event.target.value)}
                  />
                  <input
                    className="import-input"
                    type="text"
                    value={item.item_name}
                    onChange={(event) => updateRow(index, "item_name", event.target.value)}
                    placeholder="Item name"
                  />
                  <input
                    className="import-input"
                    type="text"
                    value={item.quantity ?? ""}
                    onChange={(event) => updateRow(index, "quantity", event.target.value)}
                    placeholder="Qty"
                  />
                  <input
                    className="import-input"
                    type="text"
                    value={item.unit ?? ""}
                    onChange={(event) => updateRow(index, "unit", event.target.value)}
                    placeholder="Unit"
                  />
                  <input
                    className="import-input"
                    type="text"
                    value={item.category ?? ""}
                    onChange={(event) => updateRow(index, "category", event.target.value)}
                    placeholder="Category"
                  />
                  <textarea
                    className="import-textarea"
                    value={item.notes ?? ""}
                    onChange={(event) => updateRow(index, "notes", event.target.value)}
                    placeholder="Notes"
                    rows={2}
                  />
                  <button className="ghost-button ghost-button--small" type="button" onClick={() => removeRow(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="import-footer">
              <p className="helper-text">
                {draftItems.length} line{draftItems.length === 1 ? "" : "s"} in the editable draft.
              </p>
              <button className="ghost-button" onClick={addRow} type="button">
                Add line
              </button>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
