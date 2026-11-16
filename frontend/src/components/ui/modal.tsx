"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "@/components/icons";

export function Modal({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog)
      return;
    if (open && !dialog.open)
      dialog.showModal();
    else if (!open && dialog.open)
      dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      aria-label={title}
    >
      <div className="spread">
        <h2>
          {title}
        </h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup dialog">
          <IconClose size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
