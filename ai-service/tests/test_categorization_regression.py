import pytest
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.gemini_adapter import GeminiAdapter

def test_scenario_1_road_damage_plus_drainage():
    """
    Scenario 1: Road damage + drainage
    Should classify as Road Infrastructure / Roads & Transport (ROAD_USAGE)
    Drainage MUST be a contributing factor or observation, NOT primary category.
    """
    req = AnalysisRequest(
        title="Road in my village is badly damaged and water collects there during rain",
        description="The main village road has deep potholes and asphalt stripping. Rainwater does not drain and accumulates in large puddles, worsening the road condition.",
        category="Roads & Transport",
        district="Varanasi",
        state="Uttar Pradesh"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    
    # Must NOT become Sanitation & Drainage
    assert res.category != "Sanitation & Drainage", f"Expected Roads & Transport, got {res.category}"
    assert "Road" in res.category or "Transport" in res.category or res.category == "Roads & Transport"
    assert res.problemType == "ROAD_USAGE"
    assert res.primaryProblem is not None
    assert "Road" in res.primaryProblem.category or "Transport" in res.primaryProblem.category
    
    # Drainage must be present as contributing factor or root cause
    contributing_factors = [cf.factor.lower() for cf in res.contributingFactors]
    assert any("drain" in f or "runoff" in f for f in contributing_factors), "Drainage must be captured as contributing factor"
    
    # Field confidences must be populated
    assert res.fieldConfidences is not None
    assert res.fieldConfidences.categoryConfidence >= 0.70
    assert res.fieldConfidences.problemTypeConfidence >= 0.70

def test_road_classification_regression_explicit():
    """
    Mandatory Road Classification Regression:
    'Road damaged in my village' MUST NOT become 'Sanitation & Drainage'
    """
    req = AnalysisRequest(
        title="Road damaged in my village",
        description="The main road in our village has several large potholes and broken surface causing severe difficulty for vehicles and pedestrians.",
        category="Roads & Transport",
        district="Pune",
        state="Maharashtra"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.category != "Sanitation & Drainage"
    assert res.category == "Roads & Transport"
    assert res.problemType == "ROAD_USAGE"

def test_scenario_2_waterlogging_plus_road():
    """
    Scenario 2: Waterlogging + road
    Primary problem is drainage/sanitation or flood, with road users as affected impact.
    """
    req = AnalysisRequest(
        title="Severe storm drain blockage causing street flooding",
        description="The stormwater drainage line is completely clogged with solid waste. Water is overflowing onto the street and entering nearby homes.",
        category="Sanitation & Drainage",
        district="Bengaluru",
        state="Karnataka"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.category == "Sanitation & Drainage"
    assert res.problemType == "SANITATION_SERVICE"
    assert any("drain" in obs.description.lower() for obs in res.observations)

def test_scenario_3_school_damage_plus_drainage():
    """
    Scenario 3: School building damage + poor drainage
    Primary problem must be Education / School Infrastructure. Drainage is contributing.
    """
    req = AnalysisRequest(
        title="Primary school building roof leaking and courtyard waterlogged",
        description="Government primary school classroom roof has major structural leaks during monsoon. Water accumulates in the open courtyard due to absence of drainage channels.",
        category="Education",
        district="Patna",
        state="Bihar"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.category == "School Infrastructure" or "Education" in res.category or res.category == "Education Service"
    assert res.problemType == "EDUCATION_SERVICE"
    assert res.primaryProblem.domain == "Education"
    assert any("drain" in cf.factor.lower() or "water" in cf.factor.lower() for cf in res.contributingFactors)

def test_scenario_4_water_contamination_plus_agricultural_runoff():
    """
    Scenario 4: Water contamination + agricultural runoff
    Primary problem is Water Supply. Agricultural runoff is root cause / contributing factor.
    """
    req = AnalysisRequest(
        title="Contaminated tap water supply in agrarian ward",
        description="Drinking water coming from municipal taps is discolored and smells of pesticide chemicals due to fertilizer runoff from surrounding farms.",
        category="Water Supply",
        district="Ludhiana",
        state="Punjab"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.problemType == "WATER_SUPPLY"
    assert "Water" in res.category
    assert any("agri" in cf.factor.lower() or "runoff" in cf.factor.lower() for cf in res.contributingFactors)
    assert any("runoff" in rc.cause.lower() or "agri" in rc.cause.lower() for rc in res.rootCauseHypothesesItems)

def test_scenario_5_broken_streetlights_plus_electrical_failure():
    """
    Scenario 5: Broken streetlights + electrical failure
    Primary problem is Energy / Electricity Network. Feeder line fault is root cause.
    """
    req = AnalysisRequest(
        title="Complete dark zone due to burnt distribution transformer and streetlights out",
        description="All streetlights along the 2km market stretch are non-functional following a transformer spark and feeder line failure 5 days ago.",
        category="Electricity & Lighting",
        district="Jaipur",
        state="Rajasthan"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.problemType == "ELECTRICITY_NETWORK"
    assert "Electric" in res.category or "Lighting" in res.category
    assert any("feeder" in rc.cause.lower() or "insulation" in rc.cause.lower() or "transformer" in rc.cause.lower() for rc in res.rootCauseHypothesesItems)

def test_scenario_6_healthcare_access_plus_transport_difficulty():
    """
    Scenario 6: Healthcare access + transport difficulty
    Primary problem is Healthcare. Transport is contributing factor.
    """
    req = AnalysisRequest(
        title="Primary Health Center unstaffed and inaccessible due to lack of bus transit",
        description="The rural health sub-center has no doctor on duty and patients cannot reach the taluk hospital because there are no buses or paved access.",
        category="Healthcare",
        district="Ranchi",
        state="Jharkhand"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.problemType == "HEALTHCARE_SERVICE"
    assert "Health" in res.category
    assert any("transport" in cf.factor.lower() or "transit" in cf.factor.lower() for cf in res.contributingFactors)

def test_scenario_7_field_level_confidence_breakdown():
    """
    Scenario 7: Field-Level Confidence Breakdown
    Verifies that global confidence is not a monolith and all 7 field confidences are provided.
    """
    req = AnalysisRequest(
        title="Broken culvert causing agricultural field inundation",
        description="A collapsed masonry culvert on the canal road is preventing proper drainage and flooding paddy fields.",
        category="Agriculture",
        district="Thanjavur",
        state="Tamil Nadu"
    )
    res: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req)
    assert res.fieldConfidences is not None
    fc = res.fieldConfidences
    assert 0.0 < fc.categoryConfidence <= 1.0
    assert 0.0 < fc.problemTypeConfidence <= 1.0
    assert 0.0 < fc.severityConfidence <= 1.0
    assert 0.0 < fc.impactConfidence <= 1.0
    assert 0.0 < fc.rootCauseConfidence <= 1.0
    assert 0.0 < fc.duplicateConfidence <= 1.0
    assert 0.0 < fc.systemicConfidence <= 1.0

def test_scenario_8_different_problems_same_location_root_cause_clustering():
    """
    Scenario 8: Different problems in same location
    Problem A: Handpumps producing little water -> Water Supply
    Problem B: Farm wells drying up -> Agriculture / Irrigation
    These must be categorized distinctly (NOT collapsed into duplicates),
    enabling a systemic root-cause cluster (Groundwater depletion).
    """
    req_a = AnalysisRequest(
        title="Handpumps are producing very little water",
        description="Community handpumps in the village yield barely any water after monsoon season.",
        category="Water Supply",
        district="Varanasi",
        state="Uttar Pradesh"
    )
    res_a: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req_a)

    req_b = AnalysisRequest(
        title="Farm wells are drying up",
        description="Borewells and tube wells used for irrigation of paddy crops have run dry across all local farms.",
        category="Agriculture",
        district="Varanasi",
        state="Uttar Pradesh"
    )
    res_b: AnalysisResponse = GeminiAdapter._generate_civic_engine_fallback(req_b)

    # Distinct categories and problem types - NOT identical duplicates
    assert res_a.problemType == "WATER_SUPPLY"
    assert res_b.problemType == "AGRICULTURE_DEPENDENCY"
    assert res_a.category != res_b.category
    assert res_a.primaryProblem.domain != res_b.primaryProblem.domain
    # Both preserve individual problem integrity
    assert "Water" in res_a.category
    assert any(term in res_b.category for term in ["Irrigation", "Agrarian", "Agriculture", "Crop"])
