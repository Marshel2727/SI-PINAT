import type { FuzzyModel, FuzzySet } from "@/types/fuzzy";

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

function buildGrid(low: number, high: number, step: number): number[] | null {
  if (
    !Number.isFinite(step)
    || step < 0.01
    || step > 1
    || !Number.isFinite(low)
    || !Number.isFinite(high)
    || low < 0
    || low >= high
    || high > 100
  ) {
    return null;
  }
  const count = Math.floor((high - low) / step) + 1;
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    values.push(low + i * step);
  }
  if (high - values[values.length - 1] > 1e-9) {
    values.push(high);
  }
  else {
    values[values.length - 1] = high;
  }
  return values;
}

/**
 * Evaluates the Mamdani centroid score for a specialization on the client,
 * mirroring `backend/app/fuzzy/engine.py`.
 */
export function evaluateMamdaniScore(
  academic: number,
  competency: number,
  model: Pick<FuzzyModel, "sampling_step" | "variables" | "sets" | "rules">,
  specializationId: string | number
): number | null {
  if (
    !Number.isFinite(academic)
    || !Number.isFinite(competency)
    || academic < 0
    || academic > 100
    || competency < 0
    || competency > 100
  ) {
    return null;
  }

  const varByCode = new Map(model.variables.map(v => [v.code, v]));
  const academicVar = varByCode.get("ACADEMIC");
  const competencyVar = varByCode.get("COMPETENCY");
  const outputVar = varByCode.get("SUITABILITY");
  if (!academicVar || !competencyVar || !outputVar) {
    return null;
  }

  const acadMin = Number(academicVar.domain_min);
  const acadMax = Number(academicVar.domain_max);
  const compMin = Number(competencyVar.domain_min);
  const compMax = Number(competencyVar.domain_max);
  if (
    !Number.isFinite(acadMin)
    || !Number.isFinite(acadMax)
    || academic < acadMin
    || academic > acadMax
    || !Number.isFinite(compMin)
    || !Number.isFinite(compMax)
    || competency < compMin
    || competency > compMax
  ) {
    return null;
  }

  const z = buildGrid(Number(outputVar.domain_min), Number(outputVar.domain_max), Number(model.sampling_step));
  if (!z || z.length < 2) {
    return null;
  }

  const setById = new Map<string, FuzzySet>();
  const academicDegrees = new Map<string, number>();
  const competencyDegrees = new Map<string, number>();

  for (const s of model.sets) {
    setById.set(String(s.id), s);
    if (String(s.variable_id) === String(academicVar.id)) {
      if (!validMembershipShape(s)) return null;
      academicDegrees.set(String(s.id), membershipAt(academic, s));
    }
    else if (String(s.variable_id) === String(competencyVar.id)) {
      if (!validMembershipShape(s)) return null;
      competencyDegrees.set(String(s.id), membershipAt(competency, s));
    }
    else if (String(s.variable_id) === String(outputVar.id)) {
      if (!validMembershipShape(s)) return null;
    }
  }

  const specRules = model.rules.filter(r => String(r.specialization_id) === String(specializationId));
  if (!specRules.length) {
    return null;
  }

  const curve = new Array<number>(z.length).fill(0);
  for (const rule of specRules) {
    const aSet = setById.get(String(rule.academic_set_id));
    const cSet = setById.get(String(rule.competency_set_id));
    const oSet = setById.get(String(rule.output_set_id));
    if (
      !aSet
      || !cSet
      || !oSet
      || String(aSet.variable_id) !== String(academicVar.id)
      || String(cSet.variable_id) !== String(competencyVar.id)
      || String(oSet.variable_id) !== String(outputVar.id)
    ) {
      return null;
    }

    const da = academicDegrees.get(String(aSet.id));
    const dc = competencyDegrees.get(String(cSet.id));
    const weight = Number(rule.rule_weight);
    if (
      da === undefined
      || dc === undefined
      || (rule.operator !== "AND" && rule.operator !== "OR")
      || !Number.isFinite(weight)
      || weight < 0
      || weight > 1
    ) {
      return null;
    }

    const alpha = Math.min(rule.operator === "AND" ? Math.min(da, dc) : Math.max(da, dc), weight);
    if (alpha <= 0) continue;

    for (let i = 0; i < z.length; i++) {
      const mu = Math.min(alpha, membershipAt(z[i], oSet));
      if (mu > curve[i]) {
        curve[i] = mu;
      }
    }
  }

  let denominator = 0;
  let numerator = 0;
  for (let i = 0; i < z.length - 1; i++) {
    const dx = z[i + 1] - z[i];
    denominator += dx * (curve[i + 1] + curve[i]) / 2;
    numerator += dx * (z[i + 1] * curve[i + 1] + z[i] * curve[i]) / 2;
  }

  if (!Number.isFinite(denominator) || denominator <= 0 || !Number.isFinite(numerator)) {
    return null;
  }

  return Number((numerator / denominator).toFixed(5));
}
