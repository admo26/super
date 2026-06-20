"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const [saveMessage, setSaveMessage] = useState("Changes save automatically.");
  const [error, setError] = useState<string | null>(null);
  const hasMounted = useRef(false);
  const saveRequestId = useRef(0);

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

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    setError(null);
    setSaveMessage("Saving...");

    const requestId = saveRequestId.current + 1;
    saveRequestId.current = requestId;
    const timeoutId = window.setTimeout(async () => {
      try {
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

        if (requestId !== saveRequestId.current) return;

        if (!response.ok) {
          setSaveMessage("Auto-save paused.");
          setError(payload.error ?? "Failed to save cadence items.");
          return;
        }

        setSaveMessage(`Saved ${payload.saved} staples.`);
      } catch {
        if (requestId !== saveRequestId.current) return;
        setSaveMessage("Auto-save paused.");
        setError("Failed to save cadence items.");
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [draftCadence]);

  const visibleItems = draftCadence[selectedCadence];

  return (
    <section className="panel cadence-editor">
      <div className="section-header cadence-editor__header">
        <div>
          <h2>Staples you like to keep on hand</h2>
          <p>{sourceLabel}</p>
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

      <div className="editor-card-list">
        {visibleItems.length ? (
          visibleItems.map((item, index) => (
            <article className="editor-card" key={`${selectedCadence}-${index}`}>
              <div className="editor-card__fields editor-card__fields--staples">
                <label className="field-stack">
                  <span>Name</span>
                  <input
                    className="import-input"
                    type="text"
                    value={item.name}
                    onChange={(event) => updateItem(index, "name", event.target.value)}
                    placeholder="Item name"
                  />
                </label>
                <label className="field-stack">
                  <span>Qty</span>
                  <input
                    className="import-input"
                    type="text"
                    value={item.qty}
                    onChange={(event) => updateItem(index, "qty", event.target.value)}
                    placeholder="Quantity"
                  />
                </label>
              </div>
              <div className="editor-card__actions editor-card__actions--menu">
                <details className="action-menu">
                  <summary className="action-menu__trigger" aria-label={`Actions for ${item.name || "item"}`}>
                    <svg
                      className="action-menu__icon"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="4" cy="10" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
                      <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" />
                    </svg>
                  </summary>
                  <div className="action-menu__panel">
                    <label className="field-stack field-stack--compact">
                      <span>Move to</span>
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
                        <option value="">Choose...</option>
                        {cadenceTabs
                          .filter((cadence) => cadence !== selectedCadence)
                          .map((cadence) => (
                            <option key={cadence} value={cadence}>
                              {cadenceLabel(cadence)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="ghost-button ghost-button--small action-menu__remove"
                      type="button"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                </details>
              </div>
            </article>
          ))
        ) : (
          <div className="cadence-editor__empty">
            Nothing in this bucket yet. Add your first staple to get it started.
          </div>
        )}
      </div>

      <div className="import-footer">
        <p className="helper-text">These {selectedCadence} staples help build future shopping lists faster.</p>
        <button className="ghost-button" type="button" onClick={addItem}>
          Add a staple
        </button>
      </div>
    </section>
  );
}
