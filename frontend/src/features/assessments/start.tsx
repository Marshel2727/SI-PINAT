"use client";

import { ErrorNotice, Field, Modal, Notice } from "@/components/ui";
import { useStartAssessment } from "./use-start-assessment";

export function StartAssessment() {
  const { open, setOpen, mode, setMode, busy, error, start, unfinishedSession } = useStartAssessment();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Mulai Asesmen Mandiri{" "}
        <img
          src="/images/1dcbd.svg"
          alt=""
          width="16"
          height="16"
        />
      </button>
      <Modal open={open} title="Mulai asesmen" onClose={() => !busy && setOpen(false)}>
        <form onSubmit={start}>
          {unfinishedSession && (
            <Notice>
              Browser ini masih menyimpan pintasan sesi {unfinishedSession.mode} yang belum selesai. Memulai sesi baru akan mengganti pintasan lanjut di beranda.
            </Notice>
          )}
          <div className="tabs" role="group" aria-label="Mode asesmen">
            {["DEMO", "FULL"].map(m => (
              <button
                type="button"
                className={mode === m ? "" : "secondary"}
                aria-pressed={mode === m}
                key={m}
                onClick={() => setMode(m)}
              >
                {m === "DEMO" ? "Coba DEMO" : "Asesmen FULL"}
              </button>
            ))}
          </div>
          <Notice>
            {mode === "DEMO"
              ? "DEMO memakai tiga jawaban Anda dan 27 jawaban contoh yang ditandai EXAMPLE."
              : "FULL memerlukan identitas, nilai akademik semester 1–4, dan seluruh 30 jawaban nyata."}
          </Notice>
          {mode === "FULL" && (
            <>
              <Field label="NIM">
                <input
                  name="nim"
                  required
                  maxLength={20}
                  autoComplete="off"
                />
              </Field>
              <Field label="Nama lengkap">
                <input
                  name="full_name"
                  required
                  maxLength={120}
                  autoComplete="name"
                />
              </Field>
              <Field label="Kelas (opsional)">
                <input name="class_name" maxLength={40} />
              </Field>
              <p className="small muted" style={{ marginTop: -8 }}>
                Jika NIM pernah dipakai pada sesi FULL sebelumnya, nama lengkap dan kelas (kosongkan bila sebelumnya kosong) harus sama persis.
              </p>
            </>
          )}
          <Field label="Semester saat ini">
            <input
              name="semester"
              type="number"
              min="1"
              max="14"
              defaultValue="4"
              required
            />
          </Field>
          <ErrorNotice error={error} />
          <button type="submit" disabled={busy} className="full">
            {busy ? "Menyiapkan sesi\u2026" : "Lanjut ke peminatan awal"}
          </button>
        </form>
      </Modal>
    </>
  );
}
