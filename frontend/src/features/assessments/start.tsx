"use client";

import { IconArrowRight } from "@/components/icons";
import { ErrorNotice, Field, Modal, Notice } from "@/components/ui";
import { useId } from "react";
import { useStartAssessment } from "./use-start-assessment";

type StartAssessmentProps = {
  label?: string;
  variant?: "primary" | "secondary";
  triggerOnly?: boolean;
};

export function StartAssessment({
  label = "Mulai Tentukan Peminatan",
  variant = "primary",
  triggerOnly = false,
}: StartAssessmentProps) {
  if (triggerOnly) {
    return (
      <button
        type="button"
        className={variant === "secondary" ? "secondary" : undefined}
        onClick={() => window.dispatchEvent(new Event("sipinat-start-new"))}
      >
        {label}
        <IconArrowRight size={16} />
      </button>
    );
  }

  return <StartAssessmentModal label={label} variant={variant} />;
}

function StartAssessmentModal({
  label,
  variant,
}: {
  label: string;
  variant: "primary" | "secondary";
}) {
  const { open, setOpen, busy, error, start, unfinishedSession } = useStartAssessment({
    listenGlobal: true,
  });
  const nimHintId = useId();

  return (
    <>
      <button
        type="button"
        className={variant === "secondary" ? "secondary" : undefined}
        onClick={() => setOpen(true)}
      >
        {label}
        <IconArrowRight size={16} />
      </button>
      <Modal
        open={open}
        title="Mulai Tentukan Peminatan"
        dismissible={!busy}
        onClose={() => !busy && setOpen(false)}
      >
        <form onSubmit={start}>
          <p className="small muted">
            Masukkan data mahasiswa untuk memulai sesi asesmen resmi (berlaku 24 jam).
          </p>
          {unfinishedSession && (
            <Notice>
              Browser ini masih menyimpan pintasan sesi asesmen yang belum selesai. Memulai sesi baru akan mengganti pintasan lanjut di beranda.
            </Notice>
          )}
          <Field label="NIM">
            <input
              name="nim"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="Contoh: 220210501001"
              autoFocus
              required
              maxLength={20}
              aria-describedby={nimHintId}
            />
          </Field>
          <p id={nimHintId} className="small muted" style={{ marginTop: -8 }}>
            Jika NIM pernah dipakai pada sesi sebelumnya, nama lengkap dan kelas (kosongkan bila sebelumnya kosong) harus sama persis.
          </p>
          <Field label="Nama lengkap">
            <input
              name="full_name"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              placeholder="Sesuai data akademik"
              required
              maxLength={120}
            />
          </Field>
          <Field label="Kelas (opsional)">
            <input
              name="class_name"
              type="text"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="Contoh: TEKOM A"
              maxLength={40}
            />
          </Field>
          <Field label="Semester saat ini">
            <input
              name="semester"
              type="number"
              min={1}
              max={14}
              defaultValue={4}
              enterKeyHint="done"
              required
            />
          </Field>
          <ErrorNotice error={error} />
          <button type="submit" disabled={busy} className="full">
            {busy ? "Menyiapkan sesi…" : "Lanjut Pilih Minat Awal →"}
          </button>
        </form>
      </Modal>
    </>
  );
}
