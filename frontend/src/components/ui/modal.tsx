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
    if (open)
      ref.current?.showModal();
    else
      ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      aria-label={title}
    >
      <div className="spread">
        <h2>
          {title}
        </h2>
        <button className="icon-button" onClick={onClose} aria-label="Tutup dialog">
          <IconClose size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
