"use client";

import { useState, useTransition } from "react";

import type { ParsedOrderHistoryPayload } from "@/lib/order-import";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedOrderHistoryPayload | null>(null);
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
        setError(payload.error ?? "Failed to parse file.");
        return;
      }

      setParsed(payload);
    });
  }

  function handleSave() {
    if (!parsed) return;

    setError(null);
    setSaveMessage(null);

    startSaving(async () => {
      const response = await fetch("/api/import-history/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed)
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Failed to save parsed rows.");
        return;
      }

      setSaveMessage(`Saved ${payload.saved} order history rows to Supabase.`);
    });
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
                <p>Check the extracted rows before saving them to order history.</p>
              </div>
            </div>

            <div className="import-table">
              <div className="import-table__head">
                <span>Date</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Category</span>
                <span>Notes</span>
              </div>

              {parsed.items.map((item, index) => (
                <div className="import-table__row" key={`${item.item_name}-${index}`}>
                  <span>{item.order_date ?? ""}</span>
                  <span>{item.item_name}</span>
                  <span>{item.quantity ?? ""}</span>
                  <span>{item.unit ?? ""}</span>
                  <span>{item.category ?? ""}</span>
                  <span>{item.notes ?? ""}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
