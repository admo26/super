"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, ShoppingBasket } from "lucide-react";

import { Button, Field } from "@/app/ui";

type AdHocItemFormProps = {
  targetWeek: string;
};

export function AdHocItemForm({ targetWeek }: AdHocItemFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addItem() {
    const trimmedName = name.trim();
    setMessage(null);
    setError(null);

    if (!trimmedName) {
      setError("Enter an item first.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/order-items/ad-hoc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedName,
          week: targetWeek
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not add that item.");
        return;
      }

      setName("");
      setMessage(payload.message ?? "Added.");
      router.refresh();
    });
  }

  return (
    <div className="ad-hoc-form">
      <div className="ad-hoc-form__row">
        <Field
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          icon={<ShoppingBasket aria-hidden="true" />}
          placeholder="Add something extra for the next shop"
          aria-label="Ad hoc item name"
        />
        <Button icon={<Plus aria-hidden="true" />} type="button" onClick={addItem} disabled={isPending}>
          {isPending ? "Adding..." : "Add item"}
        </Button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
    </div>
  );
}
