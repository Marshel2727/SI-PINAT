export const number = (value: number, places = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(value);

export const time = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "\u2014";

export function formatRemainingTime(expiresAt?: string | null, nowMs = Date.now()): string | null {
  if (!expiresAt) return null;

  const targetMs = Date.parse(expiresAt);
  if (!Number.isFinite(targetMs)) return null;

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Kedaluwarsa";

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  }
  return `${minutes} menit`;
}

export const names: Record<string, string> = {
  "ES-01": "Embedded System",
  "SC-02": "Sistem Cerdas",
  "JDF-03": "Jaringan & Digital Forensik",
};

export const descriptions: Record<string, string> = {
  "ES-01": "Perangkat keras, mikrokontroler, IoT, sistem tertanam, dan robotika.",
  "SC-02": "Kecerdasan buatan, machine learning, visi komputer, dan pengolahan data.",
  "JDF-03": "Jaringan komputer, keamanan siber, dan analisis forensik digital.",
};

export const icons: Record<string, string> = {
  "ES-01": "aab2d.svg",
  "SC-02": "6f02e.svg",
  "JDF-03": "9d2a9.svg",
};
