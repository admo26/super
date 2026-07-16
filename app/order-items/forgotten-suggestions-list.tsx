"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button, Tag } from "@/app/ui";
import type { ForgottenSuggestion } from "@/lib/types";

type ForgottenSuggestionsListProps = {
  canAdd: boolean;
  suggestions: ForgottenSuggestion[];
  targetWeek: string;
};

export function ForgottenSuggestionsList({ canAdd, suggestions, targetWeek }: ForgottenSuggestionsListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!suggestions.length) return null;

  function addSuggestion(suggestion: ForgottenSuggestion) {
    setError(null);
    setPendingId(suggestion.id ?? suggestion.name);

    startTransition(async () => {
      const response = await fetch("/api/order-items/ad-hoc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          name: suggestion.name,
          qty: suggestion.qty,
          group: suggestion.group,
          week: targetWeek
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not add that suggestion.");
        setPendingId(null);
        return;
      }

      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <section className="forgotten-suggestions" aria-label="Might have forgotten">
      <div className="shopping-group__header">
        <span>Might have forgotten</span>
        <span>{suggestions.length}</span>
      </div>
      <div className="forgotten-suggestions__list">
        {suggestions.map((suggestion) => {
          const key = suggestion.id ?? `${suggestion.name}-${suggestion.lastOrdered}`;
          const isAdding = isPending && pendingId === (suggestion.id ?? suggestion.name);

          return (
            <article className="shopping-item" key={key}>
              <div>
                <div className="shopping-name">{suggestion.name}</div>
                <div className="shopping-meta">
                  Qty: {suggestion.qty} · {suggestion.note}
                </div>
              </div>
              <div className="shopping-item__actions">
                <Tag category={suggestion.group}>{suggestion.group}</Tag>
                {canAdd && suggestion.id ? (
                  <Button
                    className="ui-button--small"
                    icon={<Plus aria-hidden="true" />}
                    type="button"
                    variant="secondary"
                    onClick={() => addSuggestion(suggestion)}
                    disabled={isPending}
                  >
                    {isAdding ? "Adding..." : "Add"}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
