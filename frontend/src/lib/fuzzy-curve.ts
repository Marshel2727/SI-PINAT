import type { FuzzySet } from "@/types/fuzzy";

export type MembershipShape = Pick<FuzzySet, "code" | "shape" | "point_a" | "point_b" | "point_c" | "point_d">;

export function validMembershipShape(set: MembershipShape): boolean {
  const points = [set.point_a, set.point_b, set.point_c];
  if (set.shape === "TRAPEZOID") {
    if (set.point_d === null) return false;
    points.push(set.point_d);
  }
  return (set.shape === "TRIANGLE" || set.shape === "TRAPEZOID")
    && points.every(point => Number.isFinite(point) && point >= 0 && point <= 100)
    && points.every((point, index) => index === 0 || point >= points[index - 1])
    && points[0] < points[points.length - 1];
}

export function membershipAt(value: number, set: MembershipShape): number {
  const { point_a: a, point_b: b, point_c: c } = set;
  const d = set.shape === "TRAPEZOID" ? set.point_d! : c;
  if (value < a || value > d) return 0;
  if (set.shape === "TRIANGLE") {
    if (value === b) return 1;
    return Math.max(0, Math.min(1, value < b && b !== a ? (value - a) / (b - a) : c !== b ? (c - value) / (c - b) : 1));
  }
  if (b <= value && value <= c) return 1;
  return Math.max(0, Math.min(1, value < b && b !== a ? (value - a) / (b - a) : d !== c ? (d - value) / (d - c) : 1));
}
