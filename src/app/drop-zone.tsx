"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The screenshot drop target.
 *
 * Its own component so the drag state dies with it. The box unmounts the
 * moment extraction finishes and the confirmation sheet takes over — and if
 * that happens while a file is still hovering, no dragleave ever reaches the
 * detached node. Owned by the parent, the counter would stay above zero and
 * the box would come back permanently stuck on "Drop them here", lying about
 * a drag that ended minutes ago. Unmounting is the reset.
 *
 * `busy` makes it inert rather than merely quiet: a box that still looks
 * droppable invites the second drop that would double-book the batch.
 */
export default function DropZone({
  busy,
  onFiles,
}: {
  busy: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  /** Nesting depth, not a boolean: dragging onto a child fires dragleave on
   *  the parent, and a flag would flicker off mid-hover. */
  const depth = useRef(0);

  useEffect(() => {
    // A drag can end without this box ever seeing a dragleave — released over
    // some other element, or cancelled outright. Either way it's over.
    const end = () => {
      depth.current = 0;
      setDragging(false);
    };
    window.addEventListener("drop", end);
    window.addEventListener("dragend", end);
    return () => {
      window.removeEventListener("drop", end);
      window.removeEventListener("dragend", end);
    };
  }, []);

  return (
    <label
      className={`block rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
        busy
          ? "pointer-events-none border-neutral-300 opacity-50"
          : dragging
            ? "cursor-pointer border-emerald-500 bg-emerald-500/10"
            : "cursor-pointer border-neutral-300 hover:border-neutral-500"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      // Without a preventDefault on dragover the browser refuses the drop.
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        onFiles(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        className="sr-only"
        onChange={(event) => onFiles(event.target.files)}
      />
      <span className="block text-base font-medium">
        {busy
          ? "Reading them now…"
          : dragging
            ? "Drop them here"
            : "Add screenshots of your payments"}
      </span>
      <span className="mt-1 block text-sm text-neutral-500">
        {busy
          ? "Hang on — this takes a few seconds."
          : // Tap first: the phone is the primary target, and there is no
            // dragging there.
            "Venmo, Cash App, or Zelle. Pick as many as you like — or drag them in."}
      </span>
    </label>
  );
}
