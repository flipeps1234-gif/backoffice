"use client";

import { useRef, useState } from "react";
import { formatCents, type Transaction } from "@/lib/transaction";
import { useLocale } from "./use-locale";

/**
 * One card at a time. Right = business, left = personal.
 * Ten seconds, one hand, in a driveway — so the gesture is the primary path,
 * but the two buttons do the same thing for anyone who can't drag, and the
 * arrow keys work when the card has focus.
 */

const COMMIT_PX = 80;

export default function SwipeDeck({
  pending,
  onDecide,
  onUndo,
  canUndo,
}: {
  pending: Transaction[];
  onDecide: (id: string, business: boolean) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const { t } = useLocale();
  const [dragX, setDragX] = useState(0);
  // Rendered, so it's state. The ref only carries the pointer's origin.
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const card = pending[0];
  const next = pending[1];

  if (!card) return null;

  function reset() {
    setDragX(0);
    setDragging(false);
    startX.current = null;
  }

  function decide(business: boolean) {
    reset();
    onDecide(card.id, business);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    startX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    setDragX(event.clientX - startX.current);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    // Measure from the event, not from dragX. On a fast flick the move and the
    // release batch into one render, so the dragX in this closure is stale and
    // the card would silently refuse to commit.
    const travelled = event.clientX - startX.current;
    if (travelled > COMMIT_PX) decide(true);
    else if (travelled < -COMMIT_PX) decide(false);
    else reset();
  }

  const leaning = Math.abs(dragX) > 24;
  const towardBusiness = dragX > 0;

  return (
    <div className="space-y-4">
      <div className="relative h-56">
        {next && (
          <article
            aria-hidden
            className="absolute inset-x-2 top-2 h-52 rounded-xl border border-neutral-200 bg-white"
          />
        )}

        <div
          role="group"
          tabIndex={0}
          aria-label={t(
            card.direction === "out" ? "sheet.cardAriaOut" : "sheet.cardAria",
            {
              payer: card.payer || t("sheet.unknownPayer"),
              amount: formatCents(card.amountCents),
            },
          )}
          className="absolute inset-0 h-52 cursor-grab touch-none select-none rounded-xl border border-neutral-300 bg-white p-5 shadow-sm active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-neutral-900"
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
            transition: dragging ? "none" : "transform 150ms",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") decide(true);
            if (event.key === "ArrowLeft") decide(false);
          }}
        >
          {card.direction === "out" && (
            <span className="mb-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              {t("sheet.moneyOut")}
            </span>
          )}
          <p
            className={`text-3xl font-semibold tabular-nums ${
              card.direction === "out" ? "text-red-600" : "text-neutral-900"
            }`}
          >
            {card.direction === "out" ? "−" : ""}
            {formatCents(card.amountCents)}
          </p>
          <p className="mt-1 text-lg text-neutral-900">
            {card.payer || t("sheet.unknownPayer")}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {card.date || t("sheet.noDate")}
            {card.memo && ` · ${card.memo}`}
          </p>

          {leaning && (
            <p
              className={`mt-4 text-sm font-semibold uppercase tracking-wide ${
                towardBusiness ? "text-emerald-600" : "text-neutral-400"
              }`}
            >
              {towardBusiness ? t("sheet.business") : t("sheet.personal")}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-4 text-base font-medium text-neutral-900 hover:bg-neutral-50"
          onClick={() => decide(false)}
        >
          {t("sheet.personal")}
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-4 text-base font-medium text-white hover:bg-emerald-700"
          onClick={() => decide(true)}
        >
          {t("sheet.business")}
        </button>
      </div>

      <button
        type="button"
        className="text-sm text-neutral-500 hover:underline disabled:opacity-40 disabled:hover:no-underline"
        disabled={!canUndo}
        onClick={onUndo}
      >
        {t("sheet.undoLast")}
      </button>
    </div>
  );
}
