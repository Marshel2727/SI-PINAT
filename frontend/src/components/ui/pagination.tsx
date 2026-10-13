"use client";

export function Pagination({ page, total, onChange }: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="pagination">
      <button className="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Sebelumnya</button>
      <span>Halaman {page} / {Math.max(total, 1)}</span>
      <button className="secondary" disabled={page >= total} onClick={() => onChange(page + 1)}>Berikutnya</button>
    </div>
  );
}
