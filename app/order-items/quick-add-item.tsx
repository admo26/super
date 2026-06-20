"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Plus, ShoppingBasket, X } from "lucide-react";

import { Button, Field, IconButton } from "@/app/ui";

export function QuickAddItem() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 80);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function openQuickAdd() {
    setIsOpen(true);
    setError(null);
  }

  function addItem() {
    const trimmedName = name.trim();
    setMessage(null);
    setError(null);

    if (!trimmedName) {
      setError("Enter an item first.");
      inputRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/order-items/ad-hoc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedName
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not add that item.");
        return;
      }

      setName("");
      setMessage(payload.message ?? "Added to next shop.");
      router.refresh();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    });
  }

  const mobileQuickAdd = (
    <>
      <button className="quick-add-fab" type="button" onClick={openQuickAdd} aria-label="Add item to next shop">
        <Plus aria-hidden="true" />
        <span>Add</span>
      </button>

      {isOpen ? (
        <div className="quick-add-overlay" role="presentation">
          <button className="quick-add-backdrop" type="button" aria-label="Close quick add" onClick={() => setIsOpen(false)} />
          <section className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
            <div className="quick-add-sheet__header">
              <div>
                <p className="page-kicker">Quick Add</p>
                <h2 id="quick-add-title">Add to next shop</h2>
              </div>
              <IconButton
                icon={<X aria-hidden="true" />}
                label="Close quick add"
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              />
            </div>

            <div className="quick-add-sheet__body">
              <Field
                ref={inputRef}
                icon={<ShoppingBasket aria-hidden="true" />}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Milk, nappies, bananas..."
                aria-label="Item to add to next shop"
              />
              <Button icon={<Plus aria-hidden="true" />} type="button" onClick={addItem} disabled={isPending}>
                {isPending ? "Adding..." : "Add to next shop"}
              </Button>
            </div>

            {message ? (
              <p className="quick-add-message quick-add-message--success">
                <CheckCircle2 aria-hidden="true" />
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="quick-add-message quick-add-message--error">
                <AlertCircle aria-hidden="true" />
                {error}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <Button
        className="quick-add-trigger quick-add-trigger--desktop"
        icon={<Plus aria-hidden="true" />}
        type="button"
        onClick={openQuickAdd}
      >
        Add item
      </Button>
      {portalRoot ? createPortal(mobileQuickAdd, portalRoot) : null}
    </>
  );
}
