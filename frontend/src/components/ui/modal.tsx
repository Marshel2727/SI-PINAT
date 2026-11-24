"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconClose } from "@/components/icons";

export function Modal({
  open,
  title,
  onClose,
  dismissible = true,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  dismissible?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog)
      return;
    if (open && !dialog.open)
      dialog.showModal();
    else if (!open && dialog.open)
      dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open || !dismissible)
      return;
    if (typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype)
      return;

    let startedOnBackdrop = false;

    const isOutsideDialog = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      startedOnBackdrop =
        event.button === 0 &&
        event.target === dialog &&
        isOutsideDialog(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const shouldClose =
        startedOnBackdrop &&
        event.button === 0 &&
        event.target === dialog &&
        isOutsideDialog(event);
      startedOnBackdrop = false;
      if (shouldClose) {
        onCloseRef.current();
      }
    };

    const handlePointerCancel = () => {
      startedOnBackdrop = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    dialog.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
      dialog.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [open, dismissible]);

  return (
    <dialog
      ref={ref}
      {...(dismissible ? ({ closedby: "any" } as Record<string, string>) : {})}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) {
          onClose();
        }
      }}
      onClose={onClose}
      aria-labelledby={titleId}
    >
      <div className="spread">
        <h2 id={titleId}>
          {title}
        </h2>
        <button
          type="button"
          className="icon-button"
          onClick={() => dismissible && onClose()}
          disabled={!dismissible}
          aria-label="Tutup dialog"
        >
          <IconClose size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
