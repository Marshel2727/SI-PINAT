"""Pure numerical Mamdani engine. No HTTP, database, or preference dependency."""
import math
from decimal import Decimal, ROUND_HALF_UP

ENGINE_VERSION = "1.0.0"

def quantize(value, places=5):
    return float(Decimal(str(value)).quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP))

def membership(x, config):
    a, b, c = (float(config["point_" + k]) for k in "abc")
    shape = config["shape"]
    if shape not in {"TRIANGLE", "TRAPEZOID"}:
        raise ValueError("Bentuk keanggotaan tidak dikenal.")
    d = float(config["point_d"]) if shape == "TRAPEZOID" else c
    if not all(math.isfinite(v) for v in [x,a,b,c,d]) or not a <= b <= c <= d or a == d:
        raise ValueError("Parameter keanggotaan tidak sah.")
    if x < a or x > d:
        return 0.0
    if shape == "TRIANGLE":
        if x == b:
            return 1.0
        return max(0.0, min(1.0, (x-a)/(b-a) if x < b and b != a else (c-x)/(c-b) if c != b else 1.0))
    if b <= x <= c:
        return 1.0
    return max(0.0, min(1.0, (x-a)/(b-a) if x < b and b != a else (d-x)/(d-c) if d != c else 1.0))

def grid(low, high, step):
    if not 0.01 <= step <= 1 or not 0 <= low < high <= 100:
        raise ValueError("Domain atau sampling step tidak sah.")
    values = [low + i * step for i in range(int(math.floor((high-low)/step)) + 1)]
    if high - values[-1] > 1e-9:
        values.append(high)
    else:
        values[-1] = high
    return values

def integral(x, y):
    return math.fsum((x[i+1]-x[i])*(y[i+1]+y[i])/2 for i in range(len(x)-1))

def calculate(academic, competency, config):
    if not all(math.isfinite(v) and 0 <= v <= 100 for v in [academic, competency]):
        raise ValueError("Input fuzzy harus dalam domain 0-100.")
    variables = {v["code"]: v for v in config["variables"]}
    sets = {str(s["id"]): s for s in config["sets"]}
    groups = {k: [s for s in config["sets"] if str(s["variable_id"]) == str(v["id"])] for k,v in variables.items()}
    memberships = {}
    for code, x in [("ACADEMIC", academic), ("COMPETENCY", competency)]:
        v = variables[code]
        if not float(v["domain_min"]) <= x <= float(v["domain_max"]):
            raise ValueError("Input di luar domain model.")
        memberships[code] = {"crisp": x, "degrees": {s["code"]: membership(x,s) for s in groups[code]}}
    output = variables["SUITABILITY"]
    step = float(config["sampling_step"])
    z = grid(float(output["domain_min"]), float(output["domain_max"]), step)
    curve = [0.0] * len(z)
    activations = []
    for rule in config["rules"]:
        a, c, o = (sets[str(rule[key])] for key in ["academic_set_id","competency_set_id","output_set_id"])
        if any(str(s["variable_id"]) != str(variables[v]["id"]) for s,v in [(a,"ACADEMIC"),(c,"COMPETENCY"),(o,"SUITABILITY")]):
            raise ValueError("Aturan merujuk set dari variabel/versi yang salah.")
        da = memberships["ACADEMIC"]["degrees"][a["code"]]
        dc = memberships["COMPETENCY"]["degrees"][c["code"]]
        weight = float(rule["rule_weight"])
        if rule["operator"] not in {"AND","OR"} or not 0 <= weight <= 1:
            raise ValueError("Operator atau bobot aturan tidak sah.")
        alpha = min(min(da,dc) if rule["operator"] == "AND" else max(da,dc), weight)
        curve = [max(old,min(alpha,membership(value,o))) for old,value in zip(curve,z)]
        activations.append({"rule_id": str(rule["id"]), "rule_code": rule["rule_code"],
                            "academic_set": a["code"], "competency_set": c["code"], "output_set": o["code"],
                            "academic_degree": da, "competency_degree": dc, "operator": rule["operator"],
                            "rule_weight": weight, "alpha": alpha})
    denominator = integral(z,curve)
    if denominator <= 0:
        raise ValueError("Centroid tidak terdefinisi: tidak ada aturan yang mengaktifkan output.")
    numerator = integral(z,[a*b for a,b in zip(z,curve)])
    return {"score": quantize(numerator/denominator), "memberships": memberships,
            "rule_activations": activations, "aggregated_curve": {"domain": [z[0],z[-1]], "z": z, "mu": curve},
            "centroid_numerator": numerator, "centroid_denominator": denominator, "sampling_step": step}

def academic_score(grades, weights):
    parts = [(float(g["normalized_score"]), float(g["credits_snapshot"])*float(weights.get(str(g["course_id"]),0))) for g in grades]
    denominator = math.fsum(w for _,w in parts)
    if denominator <= 0:
        raise ValueError("Nilai akademik belum memiliki bobot positif.")
    return math.fsum(score*w for score,w in parts)/denominator

def ranks(scores):
    ordered = sorted(scores, key=lambda s: (-s["suitability_score"], s["specialization_code"]))
    previous, position = None, 0
    for index, value in enumerate(ordered,1):
        if value["suitability_score"] != previous:
            position = index
        value["rank_position"] = position
        previous = value["suitability_score"]
    return ordered
