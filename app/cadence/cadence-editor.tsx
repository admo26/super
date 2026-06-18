"use client";

import { useMemo, useState, useTransition } from "react";

import type { CadenceKey, CadenceItem } from "@/lib/types";

type EditableCadenceItem = CadenceItem;

type CadenceEditorProps = {
  sourceLabel: string;
  initialCadence: Record<CadenceKey, EditableCadenceItem[]>;
};

const cadenceTabs: CadenceKey[] = ["weekly", "fortnightly", "monthly"];

function cadenceLabel(cadence: CadenceKey) {
  return cadence[0].toUpperCase() + cadence.slice(1);
}

function createEmptyItem(): EditableCadenceItem {
  return {
    name: "",
    qty: "",
    note: ""
  };
}

function cloneCadence(cadence: Record<CadenceKey, EditableCadenceItem[]>) {
  return {
    weekly: cadence.weekly.map((item) => ({ ...item })),
    fortnightly: cadence.fortnightly.map((item) => ({ ...item })),
    monthly: cadence.monthly.map((item) => ({ ...item }))
  };
}

export function CadenceEditor({
  sourceLabel,
  initialCadence
}: CadenceEditorProps) {
  const [selectedCadence, setSelectedCadence] = useState<CadenceKey>("weekly");
  const [draftCadence, setDraftCadence] = useState(() => cloneCadence(initialCadence));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const counts = useMemo(
    () => ({
      weekly: draftCadence.weekly.length,
      fortnightly: draftCadence.fortnightly.length,
      monthly: draftCadence.monthly.length
    }),
    [draftCadence]
  );

  function updateItem(index: number, field: keyof EditableCadenceItem, value: string) {
    setDraftCadence((current) => ({
      ...current,
      [selectedCadence]: current[selectedCadence].map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
  }

  function addItem() {
    setDraftCadence((current) => ({
      ...current,
      [selectedCadence]: [...current[selectedCadence], createEmptyItem()]
    }));
  }

  function removeItem(index: number) {
    setDraftCadence((current) => ({
      ...current,
      [selectedCadence]: current[selectedCadence].filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function moveItem(index: number, targetCadence: CadenceKey) {
    if (targetCadence === selectedCadence) return;

    setDraftCadence((current) => {
      const item = current[selectedCadence][index];
      if (!item) return current;

      return {
        ...current,
        [selectedCadence]: current[selectedCadence].filter((_, currentIndex) => currentIndex !== index),
        [targetCadence]: [...current[targetCadence], { ...item }]
      };
    });
  }

  function resetCadence() {
    setDraftCadence(cloneCadence(initialCadence));
    setSaveMessage(null);
    setError(null);
    setSelectedCadence("weekly");
  }

  function saveCadence() {
    setError(null);
    setSaveMessage(null);

    startSaving(async () => {
      const response = await fetch("/api/cadence/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cadence: draftCadence
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Failed to save cadence items.");
        return;
      }

      setSaveMessage(`Saved ${payload.saved} cadence rows to Supabase.`);
    });
  }

  const visibleItems = draftCadence[selectedCadence];

  return (
    <section className="panel cadence-editor">
      <div className="section-header cadence-editor__header">
        <div>
          <h2>Recurring Staples Master List</h2>
          <p>{sourceLabel}</p>
        </div>
        <div className="cadence-editor__actions">
          <button className="ghost-button" type="button" onClick={resetCadence}>
            Reset draft
          </button>
          <button className="action-button" type="button" onClick={saveCadence} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save cadence"}
          </button>
        </div>
      </div>

      <div className="cadence-tabs" role="tablist" aria-label="Cadence buckets">
        {cadenceTabs.map((cadence) => (
          <button
            key={cadence}
            type="button"
            role="tab"
            aria-selected={selectedCadence === cadence}
            className={`cadence-tab ${selectedCadence === cadence ? "cadence-tab--active" : ""}`}
            onClick={() => setSelectedCadence(cadence)}
          >
            <span>{cadenceLabel(cadence)}</span>
            <strong>{counts[cadence]}</strong>
          </button>
        ))}
      </div>

      <div className="cadence-editor__meta">
        {saveMessage ? <span className="success-text">{saveMessage}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>

      <div className="cadence-editor__table">
        <div className="cadence-editor__head">
          <span>Name</span>
          <span>Qty</span>
          <span>Note</span>
          <span>Action</span>
        </div>

        {visibleItems.length ? (
          visibleItems.map((item, index) => (
            <div className="cadence-editor__row" key={`${selectedCadence}-${index}`}>
              <input
                className="import-input"
                type="text"
                value={item.name}
                onChange={(event) => updateItem(index, "name", event.target.value)}
                placeholder="Item name"
              />
              <input
                className="import-input"
                type="text"
                value={item.qty}
                onChange={(event) => updateItem(index, "qty", event.target.value)}
                placeholder="Quantity"
              />
              <textarea
                className="import-textarea"
                value={item.note}
                onChange={(event) => updateItem(index, "note", event.target.value)}
                placeholder="Note"
                rows={2}
              />
              <div className="cadence-editor__row-actions">
                <select
                  className="import-input cadence-editor__move-select"
                  aria-label={`Move ${item.name || "item"} to another cadence`}
                  defaultValue=""
                  onChange={(event) => {
                    const nextCadence = event.target.value as CadenceKey | "";
                    if (!nextCadence) return;
                    moveItem(index, nextCadence);
                    event.target.value = "";
                  }}
                >
                  <option value="">Move to…</option>
                  {cadenceTabs
                    .filter((cadence) => cadence !== selectedCadence)
                    .map((cadence) => (
                      <option key={cadence} value={cadence}>
                        {cadenceLabel(cadence)}
                      </option>
                    ))}
                </select>
                <button className="ghost-button ghost-button--small" type="button" onClick={() => removeItem(index)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="cadence-editor__empty">
            No items in this cadence bucket yet. Add the first line to get started.
          </div>
        )}
      </div>

      <div className="import-footer">
        <p className="helper-text">Editing the shared {selectedCadence} staples list used for future generations.</p>
        <button className="ghost-button" type="button" onClick={addItem}>
          Add line
        </button>
      </div>
    </section>
  );
}
