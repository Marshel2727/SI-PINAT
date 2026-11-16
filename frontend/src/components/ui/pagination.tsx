"use client";

export function Pagination({
  page,
  total,
  totalItems,
  onChange,
}: {
  page: number;
  total: number;
  totalItems?: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <button
        type="button"
        className="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Sebelumnya
      </button>
      <span>
        Menampilkan halaman {page} dari {total}
        {totalItems !== undefined ? ` (${totalItems} data)` : ""}
      </span>
      <button
        type="button"
        className="secondary"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya
      </button>
    </div>
  );
}
