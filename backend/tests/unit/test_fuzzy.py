import copy
import math
import unittest
from app.fuzzy.engine import membership, calculate, grid, academic_score, ranks
from app.fuzzy.reference import exact_reference, CASES, PARAMETERS, CONSEQUENTS

def config():
    variables=[{"id":i+1,"code":code,"domain_min":0,"domain_max":100} for i,code in enumerate(["ACADEMIC","COMPETENCY","SUITABILITY"])]
    sets=[]
    ids={}
    for variable in variables:
        for code,(shape,points) in PARAMETERS.items():
            identifier=len(sets)+1
            ids[(variable["code"],code)]=identifier
            sets.append({"id":identifier,"variable_id":variable["id"],"code":code,"shape":shape,**dict(zip(["point_a","point_b","point_c","point_d"],points))})
    rules=[]
    for i,a in enumerate(["LOW","MEDIUM","HIGH"]):
        for j,c in enumerate(["LOW","MEDIUM","HIGH"]):
            rules.append({"id":i*3+j+1,"rule_code":"R"+str(i*3+j+1),"academic_set_id":ids[("ACADEMIC",a)],
                          "competency_set_id":ids[("COMPETENCY",c)],"output_set_id":ids[("SUITABILITY",CONSEQUENTS[i][j])],
                          "operator":"AND","rule_weight":1})
    return {"variables":variables,"sets":sets,"rules":rules,"sampling_step":0.1}

class FuzzyTests(unittest.TestCase):
    def test_shoulders_and_triangle_peak(self):
        model=config()
        low,medium,high=model["sets"][:3]
        self.assertEqual(membership(0,low),1)
        self.assertEqual(membership(100,high),1)
        self.assertEqual(membership(50,medium),1)
        self.assertEqual(membership(40,low),0)
        self.assertEqual(membership(60,high),0)
        for value in range(101):
            self.assertTrue(all(0<=membership(value,s)<=1 for s in [low,medium,high]))

    def test_ten_scenarios_against_independent_analytic_integral(self):
        for a,c in CASES:
            with self.subTest(academic=a,competency=c):
                value=calculate(a,c,config())
                self.assertAlmostEqual(value["score"],exact_reference(a,c),delta=0.002)
                self.assertEqual(len(value["rule_activations"]),9)
                self.assertGreater(value["centroid_denominator"],0)

    def test_known_centroids(self):
        self.assertAlmostEqual(calculate(90,90,config())["score"],84.44444,places=4)
        self.assertAlmostEqual(calculate(50,50,config())["score"],50,places=5)
        self.assertAlmostEqual(calculate(0,0,config())["score"],15.55556,places=4)

    def test_or_and_capped_weight(self):
        model=config()
        model["rules"]=model["rules"][:1]
        model["rules"][0]["operator"]="OR"
        model["rules"][0]["rule_weight"]=0.3
        value=calculate(0,50,model)
        self.assertEqual(value["rule_activations"][0]["alpha"],0.3)
        model["rules"][0]["operator"]="AND"
        with self.assertRaises(ValueError):
            calculate(0,50,model)

    def test_zero_denominator_and_bad_config(self):
        model=config()
        for rule in model["rules"]:
            rule["rule_weight"]=0
        with self.assertRaises(ValueError):
            calculate(50,50,model)
        with self.assertRaises(ValueError):
            calculate(float("nan"),50,config())
        model=config()
        model["rules"][0]["academic_set_id"]=model["rules"][0]["output_set_id"]
        with self.assertRaises(ValueError):
            calculate(50,50,model)

    def test_grid_includes_exact_endpoint(self):
        self.assertEqual(grid(0,100,0.3)[-1],100)
        self.assertEqual(grid(0,100,0.1)[0],0)

    def test_sks_weighted_academic_and_missing_denominator(self):
        grades=[{"course_id":1,"normalized_score":100,"credits_snapshot":3},{"course_id":2,"normalized_score":50,"credits_snapshot":2}]
        self.assertAlmostEqual(academic_score(grades,{"1":0.5,"2":1}),250/3.5)
        with self.assertRaises(ValueError):
            academic_score(grades,{})

    def test_competition_ranking_and_preference_independence(self):
        scores=[{"specialization_code":"SC-02","suitability_score":50},{"specialization_code":"ES-01","suitability_score":80},{"specialization_code":"JDF-03","suitability_score":80}]
        ranked=ranks(copy.deepcopy(scores))
        self.assertEqual([s["rank_position"] for s in ranked],[1,1,3])
        model=config()
        baseline=calculate(40,60,model)["score"]
        for preference in ["ES-01","SC-02","JDF-03"]:
            model["preferred_specialization_code"]=preference
            self.assertEqual(calculate(40,60,model)["score"],baseline)

if __name__=="__main__":
    unittest.main()
