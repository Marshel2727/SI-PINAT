"use client";

import { IconArrowRight, IconUser } from "@/components/icons";
import { ErrorNotice, Notice } from "@/components/ui";
import { useStudentSession } from "@/features/student-auth/student-session-context";
import { send } from "@/lib/api";
import { rememberAssessment } from "@/lib/assessment-session";
import { descriptions, icons, names, number } from "@/lib/format";
import type { Assessment } from "@/types/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveAssessmentStage } from "./use-start-assessment";

const PORTAL_GUIDE_STEPS = [
  [
    "1",
    "Pilih Minat Awal",
    "Tentukan bidang yang paling kamu minati sebagai pembanding di halaman hasil.",
  ],
  [
    "2",
    "Input Nilai s.d. Semester 4",
    "Unggah transkrip SIAKAD/Excel atau isi manual seluruh mata kuliah wajib s.d. Semester 4.",
  ],
  [
    "3",
    "Tes 30 Soal Teracak (1×)",
    "Kerjakan 30 soal kompetensi teracak. Tes hanya dikerjakan 1 kali per akun.",
  ],
  [
    "4",
    "Lihat, Cetak & Edit Nilai",
    "Telusuri skor Fuzzy Mamdani, cetak PDF, atau perbarui nilai akademik untuk hitung ulang.",
  ],
] as const;

export function HomePortal() {
  const { student, latestAssessment, loading, error: sessionError, refreshSession } = useStudentSession();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !student && !sessionError) {
      router.replace("/masuk");
    }
  }, [loading, student, sessionError, router]);

  async function handleStartNew() {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const { data } = await send<Assessment>("/assessments", {
        mode: "FULL",
        semester: 4,
      });
      const stage = resolveAssessmentStage(data);
      rememberAssessment(data, stage);
      await refreshSession();
      router.push(`/asesmen/${data.public_id}/${stage}`);
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="container section">
        <Notice>Memeriksa sesi mahasiswa Teknik Komputer…</Notice>
      </main>
    );
  }

  if (!student) {
    return (
      <main id="main-content" className="container section">
        <ErrorNotice error={sessionError} />
        <Notice>
          <div className="spread wrap">
            <span>Mengalihkan ke halaman masuk mahasiswa TEKOM…</span>
            <Link className="button compact" href="/masuk">
              Ke Halaman Masuk →
            </Link>
          </div>
        </Notice>
      </main>
    );
  }

  const stage = latestAssessment ? resolveAssessmentStage(latestAssessment) : null;
  const isCompleted = latestAssessment?.status === "COMPLETED";

  return (
    <main id="main-content">
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="student-identity-pill" aria-label="Identitas mahasiswa aktif">
              <IconUser size={15} />
              <span>
                <strong>{student.full_name}</strong> · <span className="mono">{student.nim}</span> · Teknik Komputer
              </span>
            </div>

            <h1>Tentukan Peminatan Teknik Komputer Sesuai Potensimu</h1>
            <p className="lead">
              Evaluasi kesesuaian peminatan melalui nilai akademik wajib hingga Semester 4 dan 30 soal tes kompetensi berbasis Fuzzy Mamdani.
            </p>

            <ErrorNotice error={actionError} />

            <div className="actions">
              {!latestAssessment && (
                <button type="button" disabled={busy} onClick={() => void handleStartNew()}>
                  {busy ? "Menyiapkan sesi…" : "Mulai Tentukan Peminatan"}
                  <IconArrowRight size={16} />
                </button>
              )}

              {latestAssessment && !isCompleted && stage && (
                <Link className="button" href={`/asesmen/${latestAssessment.public_id}/${stage}`}>
                  Lanjutkan Asesmen
                  <IconArrowRight size={16} />
                </Link>
              )}

              {latestAssessment && isCompleted && (
                <>
                  <Link className="button" href={`/asesmen/${latestAssessment.public_id}/hasil`}>
                    Lihat &amp; Cetak Hasil
                    <IconArrowRight size={16} />
                  </Link>
                  <Link className="button secondary" href={`/asesmen/${latestAssessment.public_id}/nilai`}>
                    Edit Nilai Akademik
                  </Link>
                </>
              )}

              <Link className="button white" href="/panduan">
                Lihat Alur &amp; Panduan
              </Link>
            </div>

            {latestAssessment && (
              <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
                Status asesmen terakhir:{" "}
                <strong>
                  {isCompleted
                    ? "Selesai (tes terkunci, nilai akademik dapat diperbarui)"
                    : latestAssessment.status === "IN_PROGRESS"
                      ? `Tes berlangsung (${latestAssessment.progress.answered}/${latestAssessment.question_count} soal)`
                      : latestAssessment.status === "ACADEMIC_READY"
                        ? "Nilai akademik siap · lanjut ke tes kompetensi"
                        : "Draf · lanjutkan pengisian tahap awal"}
                </strong>
              </p>
            )}
          </div>

          <article className="card example-card">
            <div className="spread">
              <strong>Ilustrasi Hasil Rekomendasi</strong>
              <small className="mono">Fuzzy Mamdani</small>
            </div>
            <div className="score-bars">
              {[
                ["Embedded System", 84.44],
                ["Sistem Cerdas", 60],
                ["Jaringan & Digital Forensik", 72.42],
              ].map(([label, n], i) => (
                <div key={label}>
                  <div className="spread">
                    <small>{label}</small>
                    <span className="mono">Skor {number(Number(n))}</span>
                  </div>
                  <div className="bar">
                    <div
                      style={{
                        width: n + "%",
                        background:
                          i === 0
                            ? "var(--primary)"
                            : i === 1
                              ? "var(--navy-secondary)"
                              : "var(--teal)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="notice">
              <small>REKOMENDASI TERATAS (ILUSTRASI)</small>
              <p className="mono">Embedded System · 84,44 dari 100</p>
            </div>
          </article>
        </div>
      </section>

      <section className="container section" aria-label="Panduan Singkat Penggunaan Sistem">
        <span className="eyebrow">PANDUAN SINGKAT PENGGUNAAN SISTEM</span>
        <h2>Empat Langkah Penentuan Peminatan</h2>
        <div className="four-columns">
          {PORTAL_GUIDE_STEPS.map(([stepNo, title, desc]) => (
            <article className="card step-card" key={stepNo}>
              <span className="step-number">{stepNo}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container section">
        <span className="eyebrow">TAKSONOMI KURIKULUM</span>
        <h2>Tiga Pilar Peminatan Keilmuan</h2>
        <div className="three-columns">
          {Object.entries(names).map(([code, name]) => (
            <article className="card specialization" key={code}>
              <span className="mono muted">{code}</span>
              <div className="title-icon">
                <span className="icon-box">
                  <img src={"/images/" + icons[code]} alt="" />
                </span>
                <h3>{name}</h3>
              </div>
              <p>{descriptions[code]}</p>
              <Link href="/tentang">Lihat cakupan &amp; metode →</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
