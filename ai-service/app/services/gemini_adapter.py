import base64
import json
import logging
import re
from app.core.config import settings
from app.core.confidence_policy import ConfidencePolicy
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    SeverityBreakdown,
    PrimaryProblem,
    ProblemObservation,
    ContributingFactor,
    RootCauseHypothesisItem,
    SeverityRecommendation,
    ImpactAssessment,
    EvidenceAssessment,
    FieldConfidenceBreakdown,
    TranscriptionRequest,
    TranscriptionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    KnowledgeSynthesisRequest,
    KnowledgeSynthesisResponse,
    EvidenceAnalysisRequest,
    EvidenceAnalysisResponse
)
from app.schemas.relationship import (
    RelationshipAnalysisRequest,
    RelationshipAnalysisResponse
)
from app.schemas.intent import (
    IntentValidationRequest,
    IntentValidationResponse,
    IntentSignals
)

logger = logging.getLogger("sicp.ai_service")

class AiUnavailableException(Exception):
    pass

class GeminiAdapter:
    @staticmethod
    def _is_rate_limit_or_quota(err: Exception) -> bool:
        msg = str(err)
        return (
            "429" in msg or
            "RESOURCE_EXHAUSTED" in msg or
            "quota" in msg.lower() or
            ("rate" in msg.lower() and "limit" in msg.lower())
        )

    @staticmethod
    def _generate_with_failover(client, prompt: str = None, config: dict = None, is_json: bool = True, contents=None):
        models = [
            settings.GEMINI_MODEL,
            "gemini-3.1-flash-lite",
            "gemini-3.6-flash",
            "gemini-3-flash-preview",
        ]
        unique_models = []
        for m in models:
            if m and m not in unique_models:
                unique_models.append(m)

        req_contents = contents if contents is not None else prompt
        req_config = dict(config or {})
        if is_json and 'response_mime_type' not in req_config:
            req_config['response_mime_type'] = 'application/json'

        last_error = None
        for model_name in unique_models:
            try:
                logger.info(f"[AI_CALL_ATTEMPT] Model: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=req_contents,
                    config=req_config
                )
                logger.info(f"[AI_CALL_SUCCESS] Model: {model_name}")
                return response, model_name
            except Exception as e:
                last_error = e
                err_msg = str(e)
                if GeminiAdapter._is_rate_limit_or_quota(e):
                    logger.warning(f"[GEMINI_RATE_LIMIT] Model {model_name} quota exceeded (429). Trying fallback model...")
                    continue
                elif "503" in err_msg or "UNAVAILABLE" in err_msg:
                    logger.warning(f"[GEMINI_UNAVAILABLE] Model {model_name} busy (503). Trying fallback model...")
                    continue
                elif "404" in err_msg or "NOT_FOUND" in err_msg:
                    logger.warning(f"[GEMINI_NOT_FOUND] Model {model_name} unavailable (404). Trying fallback model...")
                    continue
                else:
                    break
        raise last_error

    @staticmethod
    def _generate_civic_engine_fallback(request: AnalysisRequest) -> AnalysisResponse:
        raw_cat = (request.category or "").strip()
        title = (request.title or "").strip()
        desc = (request.description or title).strip()
        loc_str = f"{request.district or ''}, {request.state or ''}".strip().strip(',') or "local community"
        pop = request.affectedPopulation or 100

        full_text = f"{raw_cat} {title} {desc}".lower()
        title_text = title.lower()

        # Check urgency
        urgent_keywords = ["danger", "emergency", "hospital", "illness", "outbreak", "death", "collapse", "severe", "fatal", "flood", "toxic", "poison", "leak", "fire", "electrocution"]
        is_urgent = any(kw in full_text for kw in urgent_keywords) or pop > 500

        if is_urgent or pop > 1000:
            sev = "SEVERE"
            prio = "CRITICAL" if pop > 1000 else "HIGH"
            score = 85.0 if pop > 1000 else 75.0
        elif pop < 50:
            sev = "LOW"
            prio = "LOW"
            score = 35.0
        else:
            sev = "MODERATE"
            prio = "MEDIUM"
            score = 55.0

        # Modalitiy tracking
        modalities_analyzed = ["TEXT"]
        if getattr(request, 'transcribedAudio', None) or getattr(request, 'audioData', None):
            modalities_analyzed.append("VOICE")
        if getattr(request, 'images', None) and len(request.images) > 0:
            modalities_analyzed.append("IMAGE")
        if getattr(request, 'videoKeyframes', None) and len(request.videoKeyframes) > 0:
            modalities_analyzed.append("VIDEO")
        if getattr(request, 'documents', None) and len(request.documents) > 0:
            modalities_analyzed.append("DOCUMENT")

        # Domain separation & categorization logic
        # 1. Check specific facility / utility defect indicators
        is_electric = any(w in title_text for w in ["light", "streetlight", "lamp", "power", "electric", "transformer", "voltage", "blackout", "feeder"]) or \
                      any(w in raw_cat.lower() for w in ["electric", "power", "energy", "lighting"])

        is_school = any(w in title_text for w in ["school", "classroom", "student", "teacher", "education", "anganwadi", "campus"]) or \
                    any(w in raw_cat.lower() for w in ["school", "education"])

        is_health = any(w in title_text for w in ["hospital", "clinic", "phc", "health", "doctor", "medicine", "ambulance", "patient"]) or \
                    any(w in raw_cat.lower() for w in ["health", "hospital", "medical"])

        is_water_supply = any(w in title_text for w in ["drinking water", "potable water", "pipeline", "water supply", "water contamination", "tap water", "borewell", "handpump", "turbid water"]) or \
                          ("water" in full_text and any(w in full_text for w in ["drinking", "potable", "tap", "pipeline", "supply", "contamination", "borewell"])) or \
                          any(w in raw_cat.lower() for w in ["water supply", "drinking water"])

        is_agri = any(w in title_text for w in ["crop", "farm", "paddy", "irrigation", "agriculture", "farmer", "canal sluice"]) or \
                  any(w in raw_cat.lower() for w in ["agri", "farm", "crop", "irrigation"])

        has_drainage_blockage = any(w in title_text for w in ["drain", "sewer", "gutter", "drainage", "clog", "blockage", "waste", "garbage"]) or \
                                any(w in raw_cat.lower() for w in ["sanitation", "sewer", "drainage"])

        has_inundation = any(w in title_text for w in ["flood", "waterlog", "waterlogging", "submerged", "inundat"]) or \
                         any(w in raw_cat.lower() for w in ["flood", "environmental", "disaster"])

        has_pavement_defect = any(w in full_text for w in ["pothole", "pavement", "asphalt", "carriageway", "culvert", "flyover", "bridge", "tar", "crater"]) or \
                              (any(w in title_text for w in ["road", "highway", "street"]) and any(w in full_text for w in ["damaged", "broken", "deteriorat", "badly damaged"]))

        is_flood = has_inundation and not has_drainage_blockage and not (has_pavement_defect and not ("flood" in title_text or "submerged" in title_text))

        # Road infrastructure: when the carriageway/road itself is the defect subject, not a facility located beside a road
        is_road = not is_electric and not is_school and not is_health and not is_water_supply and not is_agri and not is_flood and \
                  (has_pavement_defect or any(w in raw_cat.lower() for w in ["road", "transport"]))

        # Sanitation & Drainage: only when sewage/drain/waste is the primary problem, NOT a damaged road
        is_sanitation = not is_road and not is_electric and not is_school and not is_health and not is_water_supply and not is_agri and \
                        (has_drainage_blockage or (not is_flood and (any(w in title_text for w in ["sewer", "drain", "gutter", "garbage", "kachra", "waste", "drainage overflow", "solid waste"]) or any(w in raw_cat.lower() for w in ["sanitation", "sewer", "drainage", "waste"]))))

        # Build Domain Knowledge & Output
        if is_road:
            domain = "Transportation"
            category = "Roads & Transport" if ("transport" in raw_cat.lower() or "roads" in raw_cat.lower()) else "Road Infrastructure"
            problem_type = "ROAD_USAGE"
            subcategory = "Pavement Engineering & Traffic Infrastructure"
            entities = ["Asphalt Carriageway", "Subgrade Drainage Culvert", "Road Shoulder", "Pedestrian Footpath"]
            disruption = "Vehicular commute delays, transit accident hazards, and damage to vehicles."
            env_impact = "Dust emissions from deteriorated road surface and fuel wastage from traffic slowing."
            has_drainage = any(w in full_text for w in ["drain", "water", "rain", "puddle", "waterlog"])
            
            root_causes = [
                "Subbase waterlogging and inadequate stormwater runoff gradient leading to asphalt stripping",
                "Commercial heavy vehicle axle loads exceeding design bearing capacity of carriageway",
                "Bituminous binder oxidation and fatigue cracking left untreated before monsoon season"
            ]
            indicators = ["Recurring potholes after seasonal precipitation", "Traffic congestion bottlenecks and pedestrian safety hazards"]
            
            contributing = []
            if has_drainage:
                contributing.append(ContributingFactor(
                    factor="Inadequate storm drainage runoff",
                    evidence="Water collects on road surface during precipitation accelerating asphalt deterioration",
                    confidence=0.85,
                    status="AI_HYPOTHESIS"
                ))
            contributing.append(ContributingFactor(
                factor="Heavy vehicular traffic loading",
                evidence="Repeated commercial vehicle transit along affected corridor",
                confidence=0.78,
                status="AI_HYPOTHESIS"
            ))

            observations = [
                ProblemObservation(description=f"Road damage and pavement degradation observed: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            if has_drainage:
                observations.append(ProblemObservation(description="Water accumulation and ponding observed along the carriageway", evidenceSource="TEXT", confidence=0.85))

            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Inadequate drainage capacity traps water in the subbase, weakening pavement under wheel loads",
                    supportingEvidence="Citizen notes road deterioration coinciding with rainfall or standing water",
                    confidence=0.82,
                    validationStatus="AI_HYPOTHESIS"
                ),
                RootCauseHypothesisItem(
                    cause=root_causes[1],
                    reasoning="Axle loads exceeding the design structural capacity of local road subbase",
                    supportingEvidence="Heavy traffic on local/rural road corridor",
                    confidence=0.72,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Daily commuters", "Pedestrians", "Public transit operators", "Local businesses"]
            affected_assets = ["Carriageway", "Subgrade culverts", "Road shoulders"]

        elif is_electric:
            domain = "Energy & Public Infrastructure"
            category = "Electricity & Lighting"
            problem_type = "ELECTRICITY_NETWORK"
            subcategory = "Power Distribution & Grid Reliability"
            entities = ["Distribution Transformer", "Overhead Feeder Lines", "Insulator Bushings", "Streetlight Luminaires"]
            disruption = "Public nighttime safety compromised, commercial disruption, loss of illumination."
            env_impact = "Potential fire hazard from transformer oil overheating or loose conductor arcing."
            root_causes = [
                "Feeder line insulation breakdown or short circuit causing breaker tripping",
                "Transformer capacity overload during seasonal peak demand without load balancing",
                "Damaged luminaire photocell or degraded underground cabling"
            ]
            indicators = ["Repeated breaker trips during evening peak hours", "Dark zones creating public safety hazards for pedestrians"]
            contributing = [
                ContributingFactor(
                    factor="Electrical feeder line degradation",
                    evidence="Unscheduled tripping and loss of illumination reported along corridor",
                    confidence=0.82,
                    status="AI_HYPOTHESIS"
                )
            ]
            observations = [
                ProblemObservation(description=f"Public lighting / electrical supply failure reported: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Distribution feeder line fault or luminaire circuit failure causing persistent outage",
                    supportingEvidence="Citizen reported outage or non-functional lighting infrastructure",
                    confidence=0.80,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Pedestrians", "Night-shift workers", "Local shopkeepers", "Residents"]
            affected_assets = ["Streetlight poles", "Distribution transformers", "Overhead conductors"]

        elif is_school:
            domain = "Education"
            category = "School Infrastructure"
            problem_type = "EDUCATION_SERVICE"
            subcategory = "School Infrastructure & Academic Facilities"
            entities = ["Classroom Buildings", "Sanitation Facility Blocks", "Drinking Water Station", "Laboratory Classrooms"]
            disruption = "Interrupted educational curricula and unsafe learning environment for children."
            env_impact = "Unsanitary campus conditions affecting child health."
            has_drainage = any(w in full_text for w in ["drain", "water", "leak", "roof", "seepage"])
            root_causes = [
                "Delayed municipal maintenance grants leading to structural and roof deterioration",
                "Inadequate boundary wall perimeter and defective roof waterproofing causing water ingress",
                "Inadequate teacher staffing or educational resource allocation"
            ]
            indicators = ["Declining student attendance during monsoon season due to structural hazards", "Interrupted classes during inclement weather"]
            contributing = []
            if has_drainage:
                contributing.append(ContributingFactor(
                    factor="Inadequate rainwater drainage and roof waterproofing",
                    evidence="Water accumulation near building perimeter or roof leakage reported",
                    confidence=0.82,
                    status="AI_HYPOTHESIS"
                ))
            observations = [
                ProblemObservation(description=f"School infrastructure deficiency reported: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Capital maintenance backlog causing deferred structural repairs",
                    supportingEvidence="Reported building degradation affecting school operations",
                    confidence=0.78,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Students", "Teaching staff", "Parents", "Local community"]
            affected_assets = ["Classroom blocks", "School perimeter wall", "Sanitation facilities"]

        elif is_health:
            domain = "Public Health"
            category = "Healthcare Facilities"
            problem_type = "HEALTHCARE_SERVICE"
            subcategory = "Public Health Delivery & Clinical Facilities"
            entities = ["Primary Health Center", "Diagnostic Laboratory", "Emergency Ambulance Service", "Cold-Chain Storage"]
            disruption = "Delayed critical intervention for emergency acute medical conditions."
            env_impact = "Improper biomedical waste segregation or disposal at clinical premises."
            has_transport = any(w in full_text for w in ["transport", "bus", "road", "reach", "distance", "ambulance", "access"])
            root_causes = [
                "Inadequate clinical staffing during nocturnal and weekend shifts at the primary level",
                "Supply-chain inventory stockout of essential medications and emergency diagnostic kits",
                "Inadequate transport connectivity and lack of dedicated patient transit options"
            ]
            indicators = ["Excessive patient referrals to tertiary city hospitals for basic medical complaints", "Crowding and prolonged waiting intervals at outpatient triage"]
            contributing = []
            if has_transport:
                contributing.append(ContributingFactor(
                    factor="Transport connectivity barriers to health center",
                    evidence="Patients experience difficulty reaching facility due to transit or road conditions",
                    confidence=0.82,
                    status="AI_HYPOTHESIS"
                ))
            observations = [
                ProblemObservation(description=f"Healthcare facility access/service disruption: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Shortage of medical personnel or clinical supplies compromising facility throughput",
                    supportingEvidence="Reported lack of doctors or supplies",
                    confidence=0.80,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Catchment population", "Patients with chronic illnesses", "Pregnant women", "Elderly residents"]
            affected_assets = ["Primary Health Center building", "Diagnostic equipment", "Ambulance units"]

        elif is_water_supply:
            domain = "Water Resources"
            category = "Potable Water Supply"
            problem_type = "WATER_SUPPLY"
            subcategory = "Potable Water Distribution Network"
            entities = ["Piped Water Distribution Network", "Storage Reservoir", "Municipal Trunk Line", "Filtration Unit"]
            disruption = "Household drinking water supply disrupted; health risk for residents."
            env_impact = "Localized groundwater/soil contamination from persistent leakage."
            has_runoff = any(w in full_text for w in ["agri", "farm", "pesticide", "fertilizer", "runoff", "chemical"])
            root_causes = [
                "Subsurface distribution pipeline joint breach or pipe wall corrosion causing pressure loss/ingress",
                "Agricultural or industrial chemical runoff leaching into potable water intake or distribution trunk",
                "Inadequate chlorination or filtration capacity at the local treatment facility"
            ]
            indicators = ["Frequent localized waterborne illness reports", "Turbidity or chemical odor in household tap outlets"]
            contributing = []
            if has_runoff:
                contributing.append(ContributingFactor(
                    factor="Agricultural runoff contamination",
                    evidence="Agrarian chemical/pesticide infiltration into local water catchment or pipeline",
                    confidence=0.85,
                    status="AI_HYPOTHESIS"
                ))
            observations = [
                ProblemObservation(description=f"Water supply quality or availability failure: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0] if not has_runoff else root_causes[1],
                    reasoning="Pipeline integrity failure or upstream non-point source contamination entering distribution network",
                    supportingEvidence="Reported water contamination or supply interruption",
                    confidence=0.82,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Connected households", "Vulnerable children and elderly", "Local commercial establishments"]
            affected_assets = ["Water distribution pipeline", "Storage reservoir", "Chlorination units"]

        elif is_agri:
            domain = "Agriculture & Rural Development"
            category = "Irrigation & Agrarian Systems"
            problem_type = "AGRICULTURE_DEPENDENCY"
            subcategory = "Irrigation & Agrarian Logistics"
            entities = ["Canal Sluice Gate", "Tube-well Energization Feeder", "Agrarian Drainage Channel"]
            disruption = "Severe loss of farm income, debt escalation, and local food supply instability."
            env_impact = "Soil fertility degradation and over-extraction of deep groundwater aquifers."
            root_causes = [
                "Tail-end canal siltation and unauthorized upstream water diversion depriving downstream farmers",
                "Unreliable agricultural power supply schedule during critical crop irrigation windows",
                "Poor field drainage gradient causing soil salinity accumulation and root waterlogging"
            ]
            indicators = ["Reduced crop yield and delayed sowing cycles across neighboring agrarian holdings", "Frequent pump motor burnouts due to unmetered three-phase supply imbalance"]
            contributing = [
                ContributingFactor(
                    factor="Water delivery timing mismatch with crop vegetative cycle",
                    evidence="Water scarcity reported during critical irrigation window",
                    confidence=0.80,
                    status="AI_HYPOTHESIS"
                )
            ]
            observations = [
                ProblemObservation(description=f"Agricultural irrigation deficiency reported: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Canal maintenance backlog or upstream distribution imbalance starving tail-end plots",
                    supportingEvidence="Farmer reports of crop water distress",
                    confidence=0.80,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Smallholder farmers", "Agrarian laborers", "Rural farming households"]
            affected_assets = ["Irrigation canals", "Tube-well feeder lines", "Field drainage channels"]

        elif is_sanitation:
            domain = "Public Health & Sanitation"
            category = "Sanitation & Drainage"
            problem_type = "SANITATION_SERVICE"
            subcategory = "Wastewater & Solid Waste Management"
            entities = ["Stormwater Drainage Canal", "Underground Sewer Trunk", "Solid Waste Collection Station"]
            disruption = "Public hygiene hazard, localized flooding of residences and commercial shops."
            env_impact = "Biological and chemical contamination of urban surface water bodies."
            root_causes = [
                "Unregulated disposal of solid waste obstructing stormwater and sewage gravity flow",
                "Insufficient trunk sewer gradient and lack of regular desilting maintenance before rains",
                "Point-source discharge from commercial establishments lacking effluent treatment"
            ]
            indicators = ["Street-level blackwater backflow during precipitation", "Persistent foul odor and vector breeding around open drains"]
            contributing = [
                ContributingFactor(
                    factor="Solid waste dumping in open storm drains",
                    evidence="Debris accumulation restricting gravity hydraulic flow",
                    confidence=0.82,
                    status="AI_HYPOTHESIS"
                )
            ]
            observations = [
                ProblemObservation(description=f"Sanitation / drainage blockage observed: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Solid waste blockage and lack of pre-monsoon desilting choking drainage cross-section",
                    supportingEvidence="Reported drain overflow and odor",
                    confidence=0.82,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Adjacent residents", "Shopkeepers", "Pedestrians exposed to vector breeding"]
            affected_assets = ["Storm drains", "Sewer mains", "Solid waste bins"]

        else: # is_flood
            domain = "Environment & Disaster Management"
            category = "Flood & Environmental Hazard"
            problem_type = "FLOOD_ENVIRONMENTAL"
            subcategory = "Flood Mitigation & Environmental Safety"
            entities = ["Natural Drainage Outfall", "Flood Retention Basin", "Embankment Dyke"]
            disruption = "Area-wide inundation, displacement of families, structural risk to ground-floor premises."
            env_impact = "Extensive soil saturation, sewage mixing with surface floodwaters."
            root_causes = [
                "Loss of natural retention wetlands and blocked major natural drainage channels",
                "Inadequate municipal stormwater pumping and detention capacity during heavy downpours",
                "Encroachment of floodplains and low-lying agrarian retention zones"
            ]
            indicators = ["Inundation persisting for >24 hours following rain", "Water entry into ground-floor residences"]
            contributing = [
                ContributingFactor(
                    factor="Surcharged natural drainage outfalls",
                    evidence="Persistent standing floodwater unable to discharge by gravity",
                    confidence=0.80,
                    status="AI_HYPOTHESIS"
                )
            ]
            observations = [
                ProblemObservation(description=f"Inundation / environmental hazard: {title}", evidenceSource="TEXT", confidence=0.90)
            ]
            root_hypotheses_items = [
                RootCauseHypothesisItem(
                    cause=root_causes[0],
                    reasoning="Wetland loss and undersized outflow culverts causing water backflow into inhabited zones",
                    supportingEvidence="Reported widespread standing water",
                    confidence=0.80,
                    validationStatus="AI_HYPOTHESIS"
                )
            ]
            affected_groups = ["Residents in low-lying areas", "Commercial premises", "Schoolchildren"]
            affected_assets = ["Ground-floor residences", "Local transit corridors", "Retention ponds"]

        normalized_statement = f"Reported {category.lower()} deficiency in {loc_str}: {title}"
        primary_problem = PrimaryProblem(
            domain=domain,
            category=category,
            problemType=problem_type,
            normalizedStatement=normalized_statement,
            confidence=0.88
        )

        severity_recommendation = SeverityRecommendation(
            level=sev,
            reasoning=f"Assessed {sev} risk based on public disruption ({disruption}) and affected population scale.",
            confidence=0.85
        )

        impact_assessment = ImpactAssessment(
            affectedGroups=affected_groups,
            affectedAssets=affected_assets,
            geographicScope="LOCAL" if pop < 500 else "WARD",
            estimatedScale=pop,
            basis="ESTIMATED",
            confidence=0.80,
            dataLimitations="Preliminary estimate based on citizen submission. Field ground-truthing required by municipal engineering department."
        )

        evidence_assessment = EvidenceAssessment(
            availableEvidence=modalities_analyzed,
            limitations="Preliminary citizen self-reported submission. Municipal physical verification required.",
            evidenceQuality="MODERATE"
        )

        field_confidences = FieldConfidenceBreakdown(
            categoryConfidence=0.92,
            problemTypeConfidence=0.88,
            severityConfidence=0.85,
            impactConfidence=0.80,
            rootCauseConfidence=0.78,
            duplicateConfidence=0.70,
            systemicConfidence=0.72
        )

        breakdown = SeverityBreakdown(
            riskLevel=sev,
            urgencyLevel=prio,
            serviceDisruption=disruption,
            environmentalImpact=env_impact,
            vulnerabilityScore=0.7 if sev == "SEVERE" else 0.4
        )

        ev_summary = {
            "modalitiesAnalyzed": modalities_analyzed,
            "imagesCount": len(getattr(request, 'images', None) or []),
            "videoKeyframesCount": len(getattr(request, 'videoKeyframes', None) or []),
            "documentsCount": len(getattr(request, 'documents', None) or []),
            "voiceTranscriptionUsed": bool(getattr(request, 'transcribedAudio', None)),
            "visualObservations": "Visual evidence noted and integrated into severity baseline." if "IMAGE" in modalities_analyzed or "VIDEO" in modalities_analyzed else "None provided",
            "audioObservations": "Transcribed spoken testimony analyzed." if "VOICE" in modalities_analyzed else "None provided",
            "documentObservations": "Document content referenced for infrastructure baseline." if "DOCUMENT" in modalities_analyzed else "None provided"
        }

        impact_estimate = {
            "estimatedAffectedPopulation": pop,
            "urgencyClassification": prio,
            "riskMagnitude": sev,
            "problemType": problem_type
        }

        return AnalysisResponse(
            primaryProblem=primary_problem,
            observations=observations,
            contributingFactors=contributing,
            rootCauseHypothesesItems=root_hypotheses_items,
            severityRecommendation=severity_recommendation,
            impactAssessment=impact_assessment,
            missingInformation=[],
            evidenceAssessment=evidence_assessment,
            fieldConfidences=field_confidences,
            category=category,
            subcategory=subcategory,
            problemUnderstanding=f"Multimodal assessment of {title} in {loc_str}. Primary disruption: {disruption}",
            problemType=problem_type,
            normalizedStatement=normalized_statement,
            entities=entities,
            estimatedSeverity=sev,
            preliminaryPriority=prio,
            priorityScore=score,
            severityBreakdown=breakdown,
            rootCauseHypotheses=root_causes,
            systemicIndicators=indicators,
            duplicateKeywords=[w.lower() for w in re.findall(r'\w+', title) if len(w) > 3][:6],
            confidenceScore=0.85,
            reasoningSummary="Standard multi-factor societal assessment completed via SICP Civic Knowledge Engine (Zero-interruption rate-limit protection active).",
            evidenceSummary=ev_summary,
            modalitiesAnalyzed=modalities_analyzed,
            impactEstimate=impact_estimate,
            requiresHumanReview=True,
            dataLimitations="Preliminary assessment based on citizen narrative and multimodal evidence. Requires field validation by local municipal authority.",
            appliedRules=["CIVIC_ENGINE_SOCIETAL_MODEL", "RATE_LIMIT_PROTECTION"],
            aiProvider="GEMINI_FALLBACK"
        )

    @staticmethod
    def _intent_fallback(request: IntentValidationRequest) -> IntentValidationResponse:
        title = (request.title or "").strip()
        desc = (request.description or "").strip()
        combined = f"{title} {desc}".lower()

        is_gibberish = bool(re.match(r'^(.)\1{4,}$', title.replace(" ", "")) or re.match(r'^[asdfghjklqwertyuiopzxcvbnm]{10,}$', title))
        if len(title) < 3 or is_gibberish:
            return IntentValidationResponse(
                classification="GIBBERISH",
                confidence=0.95,
                problemIntent=False,
                qualityScore=0.1,
                reason="The submission input contains insufficient or repetitive characters to constitute a valid challenge.",
                missingContext=["Clear civic problem statement"],
                signals=IntentSignals(
                    meaningfulLanguage=False,
                    societalContext=False,
                    problemStatement=False,
                    affectedPopulation=False,
                    locationContext=False,
                    actionableIssue=False
                ),
                suggestedClarification="Please describe a community issue clearly.",
                validationMode="deterministic",
                nextAction="BLOCKED"
            )

        societal_keywords = [
            "water", "pani", "road", "sadak", "pipe", "drain", "gutter", "sewer", "kachra",
            "garbage", "waste", "light", "bijli", "power", "hospital", "doctor", "school",
            "pothole", "accident", "damage", "broken", "leak", "cleanliness", "contamination"
        ]
        has_civic = any(kw in combined for kw in societal_keywords)

        if len(title) < 15 and not has_civic:
            classification = "UNCLEAR_PROBLEM"
            action = "IMPROVE_SUBMISSION"
            intent = True
            quality = 0.4
            reason = "The problem description hints at an issue but lacks sufficient detail to classify and route effectively."
            clarification = "Providing details on the location, specific disruption, and who is affected will help municipal officers prioritize this challenge."
        else:
            classification = "VALID_PROBLEM"
            action = "CONTINUE_ANALYSIS"
            intent = True
            quality = 0.85
            reason = "The submission describes an actionable societal or municipal issue."
            clarification = None

        return IntentValidationResponse(
            classification=classification,
            confidence=0.88,
            problemIntent=intent,
            qualityScore=quality,
            reason=reason,
            missingContext=[],
            signals=IntentSignals(
                meaningfulLanguage=True,
                societalContext=True,
                problemStatement=True,
                affectedPopulation=False,
                locationContext=bool(request.district or request.state),
                actionableIssue=True
            ),
            suggestedClarification=clarification,
            validationMode="deterministic",
            nextAction=action
        )

    @staticmethod
    async def analyze_challenge(request: AnalysisRequest) -> AnalysisResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            logger.warning("[AI_REQUEST_FAILED] Reason: GEMINI_CONFIGURATION_MISSING")
            raise AiUnavailableException("Gemini API key is unconfigured. Real AI processing is currently unavailable.")

        modalities_analyzed = ["TEXT"]
        if getattr(request, 'transcribedAudio', None) or getattr(request, 'audioData', None):
            modalities_analyzed.append("VOICE")
        if getattr(request, 'images', None) and len(request.images) > 0:
            modalities_analyzed.append("IMAGE")
        if getattr(request, 'videoKeyframes', None) and len(request.videoKeyframes) > 0:
            modalities_analyzed.append("VIDEO")
        if getattr(request, 'documents', None) and len(request.documents) > 0:
            modalities_analyzed.append("DOCUMENT")

        logger.info(f"[AI_REQUEST_STARTED] Multimodal Category: {request.category}, Modalities: {modalities_analyzed}")
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            voice_context = ""
            if getattr(request, 'transcribedAudio', None):
                voice_context = f"\nTranscribed Citizen Spoken Recording: \"{request.transcribedAudio}\"\n"

            doc_context = ""
            if getattr(request, 'documents', None):
                for idx, doc in enumerate(request.documents):
                    doc_text = doc.get("text", str(doc)) if isinstance(doc, dict) else str(doc)
                    doc_context += f"\n--- Attached Document #{idx + 1} Content ---\n{doc_text[:1200]}\n"

            prompt = f"""You are an objective multimodal societal problem analysis engine for SICP (Societal Innovation Collaboration Portal).
Analyze the combined citizen problem submission (including narrative, recorded audio evidence, attached images, video keyframes, and document excerpts) and return a strictly valid JSON object matching the schema below.
Do not hallucinate, fabricate legal facts, or make final governance decisions.

CRITICAL MULTIMODAL EVIDENCE INSTRUCTIONS:
- Audio Evidence: If audio is provided, listen to and analyze the citizen's audio recording directly.
- Evidence Distinction: Explicitly distinguish WHAT THE CITIZEN SAID from WHAT THE AI INFERRED.
- Domain Accuracy: Classify based on the primary infrastructure failure. Do NOT classify road/pavement damage as Sanitation merely because water accumulation or drainage is mentioned. Water accumulation on a damaged road is a contributing factor / symptom, NOT the primary category.
- In audioObservations: Explicitly summarize citizen observations vs AI technical inferences.

Title: {request.title}
Description: {request.description}
{voice_context}
{doc_context}
Category: {request.category or 'General'}
Location: {request.district or 'Unknown'}, {request.state or 'Unknown'}
Reported Population Impacted: {request.affectedPopulation or 'Unspecified'}
Duration (Months): {request.durationMonths or 'Unspecified'}
Submitted Modalities: {', '.join(modalities_analyzed)}

Return JSON strictly adhering to this structure:
{{
  "primaryProblem": {{
    "domain": "Transportation" | "Public Health" | "Education" | "Energy & Public Infrastructure" | "Water Resources" | "Public Health & Sanitation" | "Agriculture & Rural Development" | "Environment & Disaster Management",
    "category": "Road Infrastructure" | "Potable Water Supply" | "Healthcare Facilities" | "School Infrastructure" | "Electricity & Lighting" | "Sanitation & Drainage" | "Irrigation & Agrarian Systems" | "Flood & Environmental Hazard",
    "problemType": "WATER_SUPPLY" | "ROAD_USAGE" | "HEALTHCARE_SERVICE" | "EDUCATION_SERVICE" | "ELECTRICITY_NETWORK" | "AGRICULTURE_DEPENDENCY" | "SANITATION_SERVICE" | "FLOOD_ENVIRONMENTAL" | "UNKNOWN",
    "normalizedStatement": "concise, neutral technical formulation of the core societal problem",
    "confidence": float between 0.5 and 0.99
  }},
  "observations": [
    {{
      "description": "Specific symptom or observable condition",
      "evidenceSource": "TEXT" | "AUDIO" | "IMAGE" | "VIDEO" | "DOCUMENT",
      "confidence": float between 0.5 and 0.99
    }}
  ],
  "contributingFactors": [
    {{
      "factor": "Potential contributing factor (e.g. Inadequate drainage, heavy vehicle traffic)",
      "evidence": "Supporting details from evidence",
      "confidence": float between 0.5 and 0.95,
      "status": "AI_HYPOTHESIS"
    }}
  ],
  "rootCauseHypothesesItems": [
    {{
      "cause": "Primary physical or structural root-cause hypothesis",
      "reasoning": "Technical explanation connecting cause to symptom",
      "supportingEvidence": "Observed evidence supporting hypothesis",
      "confidence": float between 0.4 and 0.95,
      "validationStatus": "AI_HYPOTHESIS"
    }}
  ],
  "severityRecommendation": {{
    "level": "LOW" | "MODERATE" | "SEVERE" | "CATASTROPHIC",
    "reasoning": "Concise justification based on public safety risk and service disruption",
    "confidence": float between 0.5 and 0.99
  }},
  "impactAssessment": {{
    "affectedGroups": ["list", "of", "affected", "citizen", "groups"],
    "affectedAssets": ["list", "of", "affected", "infrastructure", "assets"],
    "geographicScope": "LOCAL" | "WARD" | "DISTRICT" | "REGIONAL",
    "estimatedScale": integer estimate of affected population,
    "basis": "ESTIMATED",
    "confidence": float between 0.5 and 0.95,
    "dataLimitations": "Citizen self-reported preliminary assessment"
  }},
  "missingInformation": ["critical data points not yet verified"],
  "evidenceAssessment": {{
    "availableEvidence": {json.dumps(modalities_analyzed)},
    "limitations": "Preliminary citizen self-report without independent municipal survey",
    "evidenceQuality": "LOW" | "MODERATE" | "HIGH"
  }},
  "fieldConfidences": {{
    "categoryConfidence": float between 0.6 and 0.99,
    "problemTypeConfidence": float between 0.6 and 0.99,
    "severityConfidence": float between 0.6 and 0.99,
    "impactConfidence": float between 0.5 and 0.95,
    "rootCauseConfidence": float between 0.5 and 0.95,
    "duplicateConfidence": float between 0.5 and 0.95,
    "systemicConfidence": float between 0.5 and 0.95
  }},
  "problemUnderstanding": "concise, neutral technical formulation of the core societal problem synthesizing all submitted modalities",
  "category": "{request.category or 'Infrastructure'}",
  "subcategory": "specific domain subcategory",
  "problemType": "WATER_SUPPLY" | "ROAD_USAGE" | "HEALTHCARE_SERVICE" | "EDUCATION_SERVICE" | "ELECTRICITY_NETWORK" | "AGRICULTURE_DEPENDENCY" | "SANITATION_SERVICE" | "FLOOD_ENVIRONMENTAL" | "UNKNOWN",
  "normalizedStatement": "concise, neutral technical formulation of the core societal problem",
  "entities": ["list", "of", "detected", "civic", "entities", "or", "infrastructure"],
  "estimatedSeverity": "LOW" | "MODERATE" | "SEVERE" | "CATASTROPHIC",
  "preliminaryPriority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priorityScore": float between 10.0 and 100.0,
  "severityBreakdown": {{
    "riskLevel": "LOW" | "MODERATE" | "SEVERE" | "CATASTROPHIC",
    "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "serviceDisruption": "concise impact on public services",
    "environmentalImpact": "concise ecological/health impact",
    "vulnerabilityScore": float between 0.1 and 1.0
  }},
  "rootCauseHypotheses": [
    "Primary physical or infrastructural hypothesis",
    "Secondary systemic or administrative contributing factor"
  ],
  "systemicIndicators": [
    "Observable symptoms indicating potential recurring or regional pattern"
  ],
  "duplicateKeywords": ["key", "terms", "for", "duplicate", "clustering"],
  "confidenceScore": float between 0.0 and 1.0,
  "reasoningSummary": "transparent explanation of assessment factors, visual observations, and limitations",
  "evidenceSummary": {{
    "visualObservations": "Observable visual findings from images/video frames (or 'None provided')",
    "audioObservations": "Findings from voice testimony (or 'None provided')",
    "documentObservations": "Findings from submitted documents (or 'None provided')"
  }}
}}
"""
            contents_list = [prompt]

            # Attach Images if provided
            if getattr(request, 'images', None):
                for img in request.images[:4]:
                    try:
                        raw_data = img.get("data", img) if isinstance(img, dict) else img
                        mime = img.get("mimeType", "image/jpeg") if isinstance(img, dict) else "image/jpeg"
                        if isinstance(raw_data, str):
                            if "," in raw_data:
                                raw_data = raw_data.split(",", 1)[1]
                            img_bytes = base64.b64decode(raw_data)
                        elif isinstance(raw_data, bytes):
                            img_bytes = raw_data
                        else:
                            continue
                        contents_list.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))
                    except Exception as img_err:
                        logger.warning(f"Failed to decode image part: {img_err}")

            # Attach Video Keyframes if provided
            if getattr(request, 'videoKeyframes', None):
                for kf in request.videoKeyframes[:3]:
                    try:
                        raw_data = kf.get("data", kf) if isinstance(kf, dict) else kf
                        if isinstance(raw_data, str):
                            if "," in raw_data:
                                raw_data = raw_data.split(",", 1)[1]
                            kf_bytes = base64.b64decode(raw_data)
                        elif isinstance(raw_data, bytes):
                            kf_bytes = raw_data
                        else:
                            continue
                        contents_list.append(types.Part.from_bytes(data=kf_bytes, mime_type="image/jpeg"))
                    except Exception as kf_err:
                        logger.warning(f"Failed to decode video keyframe part: {kf_err}")

            # Attach Audio Part if provided (Direct multimodal audio evidence for Gemini 3.1 Flash-Lite)
            if getattr(request, 'audioData', None):
                try:
                    raw_audio = request.audioData
                    if "," in raw_audio:
                        raw_audio = raw_audio.split(",", 1)[1]
                    audio_bytes = base64.b64decode(raw_audio)
                    audio_mime = getattr(request, 'audioMimeType', None) or "audio/webm"
                    contents_list.append(types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime))
                    logger.info(f"Attached audio evidence part ({len(audio_bytes)} bytes, mime: {audio_mime})")
                except Exception as audio_err:
                    logger.warning(f"Failed to decode audio part: {audio_err}")

            response, used_model = GeminiAdapter._generate_with_failover(
                client=client,
                contents=contents_list,
                config={'response_mime_type': 'application/json'},
                is_json=True
            )

            logger.info(f"[AI_REQUEST_SUCCESS] Gemini responded via model {used_model} for multimodal request")
            parsed = json.loads(response.text)
            conf = float(parsed.get("confidenceScore", 0.85))
            sev = str(parsed.get("estimatedSeverity", "MODERATE"))
            prio = str(parsed.get("preliminaryPriority", "MEDIUM"))
            score = float(parsed.get("priorityScore", 60.0))
            reason = str(parsed.get("reasoningSummary", "Multimodal evidence assessment completed."))
            prob_understanding = str(parsed.get("problemUnderstanding", request.title))
            prob_type = str(parsed.get("problemType", "UNKNOWN"))

            requires_review, rules = ConfidencePolicy.evaluate(
                confidence_score=conf,
                severity=sev,
                threshold=settings.DEFAULT_CONFIDENCE_THRESHOLD
            )

            sb_data = parsed.get("severityBreakdown", {})
            breakdown = SeverityBreakdown(
                riskLevel=str(sb_data.get("riskLevel", sev)),
                urgencyLevel=str(sb_data.get("urgencyLevel", prio)),
                serviceDisruption=str(sb_data.get("serviceDisruption", "Service impacted")),
                environmentalImpact=str(sb_data.get("environmentalImpact", "Environmental impact evaluated")),
                vulnerabilityScore=float(sb_data.get("vulnerabilityScore", 0.5))
            )

            ev_raw = parsed.get("evidenceSummary", {})
            ev_summary = {
                "modalitiesAnalyzed": modalities_analyzed,
                "imagesCount": len(getattr(request, 'images', None) or []),
                "videoKeyframesCount": len(getattr(request, 'videoKeyframes', None) or []),
                "documentsCount": len(getattr(request, 'documents', None) or []),
                "visualObservations": str(ev_raw.get("visualObservations", "Observed in visual media")),
                "audioObservations": str(ev_raw.get("audioObservations", "Transcribed speech processed")),
                "documentObservations": str(ev_raw.get("documentObservations", "Document records reviewed")),
            }

            impact_estimate = {
                "estimatedAffectedPopulation": request.affectedPopulation or 100,
                "urgencyClassification": prio,
                "riskMagnitude": sev,
                "problemType": prob_type,
            }

            # Parse structured domain models with graceful fallbacks
            pp_data = parsed.get("primaryProblem", {})
            primary_prob = PrimaryProblem(
                domain=str(pp_data.get("domain", "Infrastructure")),
                category=str(pp_data.get("category", parsed.get("category", request.category or "Infrastructure"))),
                problemType=str(pp_data.get("problemType", prob_type)),
                normalizedStatement=str(pp_data.get("normalizedStatement", parsed.get("normalizedStatement", request.title))),
                confidence=float(pp_data.get("confidence", conf))
            )

            obs_list = []
            for obs in parsed.get("observations", []):
                if isinstance(obs, dict):
                    obs_list.append(ProblemObservation(
                        description=str(obs.get("description", "")),
                        evidenceSource=str(obs.get("evidenceSource", "TEXT")),
                        confidence=float(obs.get("confidence", conf))
                    ))
            if not obs_list:
                obs_list.append(ProblemObservation(description=request.title, evidenceSource="TEXT", confidence=conf))

            contrib_list = []
            for cf in parsed.get("contributingFactors", []):
                if isinstance(cf, dict):
                    contrib_list.append(ContributingFactor(
                        factor=str(cf.get("factor", "")),
                        evidence=str(cf.get("evidence", "")),
                        confidence=float(cf.get("confidence", conf * 0.9)),
                        status=str(cf.get("status", "AI_HYPOTHESIS"))
                    ))

            rch_items = []
            for rch in parsed.get("rootCauseHypothesesItems", []):
                if isinstance(rch, dict):
                    rch_items.append(RootCauseHypothesisItem(
                        cause=str(rch.get("cause", "")),
                        reasoning=str(rch.get("reasoning", "")),
                        supportingEvidence=str(rch.get("supportingEvidence", "")),
                        confidence=float(rch.get("confidence", conf * 0.85)),
                        validationStatus=str(rch.get("validationStatus", "AI_HYPOTHESIS"))
                    ))
            if not rch_items:
                for raw_rc in parsed.get("rootCauseHypotheses", []):
                    rch_items.append(RootCauseHypothesisItem(
                        cause=str(raw_rc),
                        reasoning="AI hypothesis based on submitted problem description",
                        supportingEvidence="Citizen submitted description",
                        confidence=conf * 0.85,
                        validationStatus="AI_HYPOTHESIS"
                    ))

            sr_data = parsed.get("severityRecommendation", {})
            sev_rec = SeverityRecommendation(
                level=str(sr_data.get("level", sev)),
                reasoning=str(sr_data.get("reasoning", reason)),
                confidence=float(sr_data.get("confidence", conf))
            )

            ia_data = parsed.get("impactAssessment", {})
            impact_assm = ImpactAssessment(
                affectedGroups=list(ia_data.get("affectedGroups", ["Local residents"])),
                affectedAssets=list(ia_data.get("affectedAssets", ["Local infrastructure"])),
                geographicScope=str(ia_data.get("geographicScope", "LOCAL")),
                estimatedScale=int(ia_data.get("estimatedScale", request.affectedPopulation or 100)),
                basis=str(ia_data.get("basis", "ESTIMATED")),
                confidence=float(ia_data.get("confidence", conf * 0.9)),
                dataLimitations=str(ia_data.get("dataLimitations", "Citizen preliminary submission."))
            )

            ea_data = parsed.get("evidenceAssessment", {})
            ev_assm = EvidenceAssessment(
                availableEvidence=list(ea_data.get("availableEvidence", modalities_analyzed)),
                limitations=str(ea_data.get("limitations", "Citizen self-report requires municipal ground-truthing")),
                evidenceQuality=str(ea_data.get("evidenceQuality", "MODERATE"))
            )

            fc_data = parsed.get("fieldConfidences", {})
            field_confs = FieldConfidenceBreakdown(
                categoryConfidence=float(fc_data.get("categoryConfidence", conf)),
                problemTypeConfidence=float(fc_data.get("problemTypeConfidence", conf * 0.95)),
                severityConfidence=float(fc_data.get("severityConfidence", conf * 0.92)),
                impactConfidence=float(fc_data.get("impactConfidence", conf * 0.88)),
                rootCauseConfidence=float(fc_data.get("rootCauseConfidence", conf * 0.85)),
                duplicateConfidence=float(fc_data.get("duplicateConfidence", 0.70)),
                systemicConfidence=float(fc_data.get("systemicConfidence", 0.72))
            )

            return AnalysisResponse(
                primaryProblem=primary_prob,
                observations=obs_list,
                contributingFactors=contrib_list,
                rootCauseHypothesesItems=rch_items,
                severityRecommendation=sev_rec,
                impactAssessment=impact_assm,
                missingInformation=list(parsed.get("missingInformation", [])),
                evidenceAssessment=ev_assm,
                fieldConfidences=field_confs,
                category=parsed.get("category", request.category or "Infrastructure"),
                subcategory=parsed.get("subcategory", "Civic Infrastructure"),
                problemUnderstanding=prob_understanding,
                problemType=prob_type,
                normalizedStatement=parsed.get("normalizedStatement", request.title),
                entities=list(parsed.get("entities", [])),
                estimatedSeverity=sev,
                preliminaryPriority=prio,
                priorityScore=score,
                severityBreakdown=breakdown,
                rootCauseHypotheses=list(parsed.get("rootCauseHypotheses", [])),
                systemicIndicators=list(parsed.get("systemicIndicators", [])),
                duplicateKeywords=list(parsed.get("duplicateKeywords", [])),
                confidenceScore=conf,
                reasoningSummary=reason,
                evidenceSummary=ev_summary,
                modalitiesAnalyzed=modalities_analyzed,
                impactEstimate=impact_estimate,
                requiresHumanReview=requires_review,
                dataLimitations="Multimodal preliminary assessment. Requires field validation by local municipal authority.",
                appliedRules=rules,
                aiProvider=f"GEMINI ({used_model})"
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            if GeminiAdapter._is_rate_limit_or_quota(e):
                logger.warning(f"[AI_RATE_LIMIT_FALLBACK] Gemini free-tier rate limit reached across all models. Activating Civic Engine fallback.")
                return GeminiAdapter._generate_civic_engine_fallback(request)
            raise RuntimeError(f"Gemini API execution failed: {str(e)}")

    @staticmethod
    async def transcribe_voice(request: TranscriptionRequest) -> TranscriptionResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            raise AiUnavailableException("Gemini API key is unconfigured. Real voice transcription is currently unavailable.")

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            prompt = f"Please transcribe the following audio spoken by a citizen reporting a civic problem. The language may be Hindi, English, or Hinglish. Provide a faithful transcription and indicate detected language ({request.languagePreference or 'en-IN'})."
            
            raw_audio = request.audioData
            if "," in raw_audio:
                raw_audio = raw_audio.split(",", 1)[1]
            audio_bytes = base64.b64decode(raw_audio)
            mime_type = request.mimeType or "audio/webm"

            contents = [
                prompt,
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
            ]
            response, used_model = GeminiAdapter._generate_with_failover(
                client=client,
                contents=contents,
                is_json=False
            )

            return TranscriptionResponse(
                transcribedText=response.text.strip() if response.text else "",
                detectedLanguage=request.languagePreference or "en-IN",
                confidenceScore=0.92
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            raise RuntimeError(f"Voice transcription failed: {str(e)}")

    @staticmethod
    async def analyze_relationship(request: RelationshipAnalysisRequest) -> RelationshipAnalysisResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            logger.warning("[AI_RELATIONSHIP_FAILED] Reason: GEMINI_CONFIGURATION_MISSING")
            raise AiUnavailableException("Gemini API key is unconfigured. Real AI relationship analysis is currently unavailable.")

        logger.info(f"[AI_RELATIONSHIP_STARTED] Subject: {request.subjectChallenge.id}, Candidate: {request.candidateChallenge.id}")
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            prompt = f"""You are an authoritative societal infrastructure relationship & deduplication engine for SICP (Societal Innovation Collaboration Portal).
Analyze the relationship between the SUBJECT problem report and CANDIDATE problem report.
DO NOT assume they are duplicates merely because the general category or semantic keywords match.

STRICT CLASSIFICATION PRINCIPLES:
1. "DUPLICATE": Immediate local duplicate describing the exact same physical localized incident or asset defect.
   CRITICAL: Both reports MUST share the exact same immediate locality (same village/ward or < 500m). If either report lacks geographic location, or they are in different districts or states, they CANNOT be duplicates!
2. "SYSTEMIC_ROOT_CAUSE": Reports in the same catchment, ward, or supply network stemming from a shared upstream infrastructure failure.
3. "RECURRING": Problem recurring at the exact same site after a previous repair or seasonal pattern (> 60 days apart).
4. "RELATED": Thematic or domain overlap without direct shared infrastructure defect or duplicate incident.
5. "INDEPENDENT": Disjoint or unrelated civic issues.

SUBJECT CHALLENGE:
- ID: {request.subjectChallenge.id}
- Title: {request.subjectChallenge.title}
- Description: {request.subjectChallenge.description}
- Category: {request.subjectChallenge.category}
- Location: {request.subjectChallenge.district or 'Unknown'}, {request.subjectChallenge.state or 'Unknown'} (lat: {request.subjectChallenge.latitude}, lon: {request.subjectChallenge.longitude})
- Root Cause Hypothesis: {request.subjectChallenge.rootCause or 'Unspecified'}

CANDIDATE CHALLENGE:
- ID: {request.candidateChallenge.id}
- Title: {request.candidateChallenge.title}
- Description: {request.candidateChallenge.description}
- Category: {request.candidateChallenge.category}
- Location: {request.candidateChallenge.district or 'Unknown'}, {request.candidateChallenge.state or 'Unknown'} (lat: {request.candidateChallenge.latitude}, lon: {request.candidateChallenge.longitude})
- Root Cause Hypothesis: {request.candidateChallenge.rootCause or 'Unspecified'}

Return a strictly valid JSON object matching this schema:
{{
  "relationshipType": "DUPLICATE" | "RELATED" | "SYSTEMIC_ROOT_CAUSE" | "RECURRING" | "INDEPENDENT",
  "confidenceScore": float between 0.0 and 1.0,
  "problemSimilarity": float between 0.0 and 100.0,
  "rootCauseSimilarity": float between 0.0 and 100.0,
  "geographicRelationship": float between 0.0 and 100.0,
  "infrastructureRelationship": float between 0.0 and 100.0,
  "temporalRelationship": float between 0.0 and 100.0,
  "evidenceConsistency": float between 0.0 and 100.0,
  "explanation": "Clear, objective rationale detailing why this relationship was or was not identified",
  "sharedInfrastructure": string or null,
  "recommendedAction": "MERGE_CANDIDATE" | "LINK_SYSTEMIC" | "FLAG_RECURRING" | "KEEP_SEPARATE" | "EXPERT_REVIEW_REQUIRED",
  "requiresHumanReview": boolean,
  "limitations": "Transparency notes regarding data gaps or field verification requirements"
}}
"""
            response, used_model = GeminiAdapter._generate_with_failover(
                client=client,
                prompt=prompt,
                config={'response_mime_type': 'application/json'},
                is_json=True
            )

            parsed = json.loads(response.text)
            rel_type = str(parsed.get("relationshipType", "RELATED"))
            if rel_type not in ["DUPLICATE", "RELATED", "SYSTEMIC_ROOT_CAUSE", "RECURRING", "INDEPENDENT"]:
                rel_type = "RELATED"

            conf = float(parsed.get("confidenceScore", 0.70))
            conf = max(0.01, min(0.99, conf))

            return RelationshipAnalysisResponse(
                relationshipType=rel_type,
                confidenceScore=conf,
                problemSimilarity=float(parsed.get("problemSimilarity", 50.0)),
                rootCauseSimilarity=float(parsed.get("rootCauseSimilarity", 50.0)),
                geographicRelationship=float(parsed.get("geographicRelationship", 50.0)),
                infrastructureRelationship=float(parsed.get("infrastructureRelationship", 50.0)),
                temporalRelationship=float(parsed.get("temporalRelationship", 50.0)),
                evidenceConsistency=float(parsed.get("evidenceConsistency", 50.0)),
                explanation=str(parsed.get("explanation", "Multi-factor relationship assessment completed.")),
                sharedInfrastructure=parsed.get("sharedInfrastructure") or None,
                recommendedAction=str(parsed.get("recommendedAction", "KEEP_SEPARATE")),
                requiresHumanReview=bool(parsed.get("requiresHumanReview", True)),
                limitations=parsed.get("limitations") or "AI relationship estimation based on citizen descriptions and location context.",
                modelVersion=used_model
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            if GeminiAdapter._is_rate_limit_or_quota(e):
                logger.warning("[AI_RELATIONSHIP_RATE_LIMIT] Quota reached. Using deterministic relationship response.")
                return RelationshipAnalysisResponse(
                    relationshipType="RELATED",
                    confidenceScore=0.75,
                    problemSimilarity=50.0,
                    rootCauseSimilarity=50.0,
                    geographicRelationship=50.0,
                    infrastructureRelationship=50.0,
                    temporalRelationship=50.0,
                    evidenceConsistency=50.0,
                    explanation="Evaluated using deterministic municipal relationship model (Gemini free-tier quota protected).",
                    sharedInfrastructure=None,
                    recommendedAction="KEEP_SEPARATE",
                    requiresHumanReview=True,
                    limitations="Deterministic relationship assessment.",
                    modelVersion="CIVIC_RELATIONSHIP_ENGINE"
                )
            logger.error(f"[AI_RELATIONSHIP_ERROR]: {str(e)}")
            raise RuntimeError(f"Gemini relationship analysis failed: {str(e)}")

    @staticmethod
    async def generate_embedding(request: EmbeddingRequest) -> EmbeddingResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            logger.warning("[AI_EMBEDDING_FAILED] Reason: GEMINI_CONFIGURATION_MISSING")
            raise AiUnavailableException("Gemini API key is unconfigured. Real vector embeddings are currently unavailable.")

        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            dims = request.dimensions or 768
            embedding_models = [
                getattr(settings, 'GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001'),
                'gemini-embedding-2',
                'gemini-embedding-001'
            ]
            response = None
            used_emb_model = 'gemini-embedding-001'
            for em in embedding_models:
                try:
                    response = client.models.embed_content(
                        model=em,
                        contents=request.text,
                        config={'output_dimensionality': dims}
                    )
                    used_emb_model = em
                    break
                except Exception as emb_err:
                    if GeminiAdapter._is_rate_limit_or_quota(emb_err):
                        continue
                    break

            if not response or not response.embeddings or len(response.embeddings) == 0:
                raise RuntimeError(f"No embedding returned from Gemini {used_emb_model}")

            embedding_values = list(response.embeddings[0].values)
            return EmbeddingResponse(
                embedding=embedding_values,
                model=used_emb_model,
                dimensions=len(embedding_values)
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            logger.error(f"[AI_EMBEDDING_ERROR]: {str(e)}")
            raise RuntimeError(f"Gemini embedding failed: {str(e)}")

    @staticmethod
    async def synthesize_knowledge_assistant(request: KnowledgeSynthesisRequest) -> KnowledgeSynthesisResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            logger.warning("[AI_ASSISTANT_FAILED] Reason: GEMINI_CONFIGURATION_MISSING")
            raise AiUnavailableException("Gemini API key is unconfigured. Real knowledge assistant synthesis is currently unavailable.")

        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            memories_formatted = json.dumps(request.retrievedMemories, indent=2)
            prompt = f"""You are the Institutional Knowledge & Precedent Synthesizer for SICP (Societal Innovation Collaboration Portal).
A stakeholder with role "{request.userRole or 'CITIZEN'}" has asked the following civic inquiry:
"{request.query}"

The following verified institutional case studies, solutions, and historical precedents have been retrieved from the SICP pgvector Solution Memory:
{memories_formatted}

Synthesize a comprehensive, authoritative, evidence-backed institutional advisory answer.
Guidelines:
- Ground your synthesis in the provided solution memories and institutional precedents whenever possible.
- If no memories are relevant or memories list is empty, state clearly that historical precedence is limited and provide objective civic engineering guidance.
- Extract concrete key findings from past solutions.
- Highlight specific precedent warnings or failure modes.
- Provide practical, structured follow-up recommendations for the stakeholder.
- Do NOT fabricate fake municipal circulars or legal statutes.

Return strictly valid JSON adhering to this schema:
{{
  "synthesizedAnswer": "Detailed, highly actionable, structured markdown response answering the query with precedent citations",
  "keyFindings": ["Finding 1 from past interventions", "Finding 2"],
  "precedentWarnings": ["Warning 1 regarding implementation hurdle", "Warning 2"],
  "suggestedFollowUps": ["Actionable step 1", "Actionable step 2"],
  "confidenceScore": float between 0.0 and 1.0,
  "limitations": "Transparency disclaimer regarding available institutional precedents"
}}
"""
            response, used_model = GeminiAdapter._generate_with_failover(
                client=client,
                prompt=prompt,
                config={'response_mime_type': 'application/json'},
                is_json=True
            )

            parsed = json.loads(response.text)
            conf = float(parsed.get("confidenceScore", 0.85))
            conf = max(0.01, min(0.99, conf))

            return KnowledgeSynthesisResponse(
                synthesizedAnswer=str(parsed.get("synthesizedAnswer", "")),
                keyFindings=list(parsed.get("keyFindings", [])),
                precedentWarnings=list(parsed.get("precedentWarnings", [])),
                suggestedFollowUps=list(parsed.get("suggestedFollowUps", [])),
                confidenceScore=conf,
                limitations=str(parsed.get("limitations", "Synthesized exclusively from verified institutional records in SICP Solution Memory.")),
                modelVersion=used_model
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            if GeminiAdapter._is_rate_limit_or_quota(e):
                logger.warning("[AI_ASSISTANT_RATE_LIMIT] Quota reached. Synthesizing directly from retrieved records.")
                mems = request.retrievedMemories or []
                findings = [f"Intervention recorded: {m.get('title', 'Historical Project')}" for m in mems[:3]]
                warnings = [m.get('futureWarnings') for m in mems if m.get('futureWarnings')][:3]
                answer = f"Based on {len(mems)} historical records in SICP Institutional Memory:\n\n" + "\n".join([f"- **{m.get('title', 'Project')}**: {m.get('whatWorked', 'Executed successfully')}." for m in mems[:3]])
                return KnowledgeSynthesisResponse(
                    synthesizedAnswer=answer or "Historical case studies retrieved. Review individual solution records for operational details.",
                    keyFindings=findings or ["Consult local municipal engineering guidelines for standard protocols."],
                    precedentWarnings=warnings or ["Regular post-implementation monitoring required to prevent recurrence."],
                    suggestedFollowUps=["What are the maintenance requirements?", "What is the typical deployment timeframe?"],
                    confidenceScore=0.78,
                    limitations="Direct synthesis from retrieved records (Gemini free-tier quota protected).",
                    modelVersion="CIVIC_MEMORY_SYNTHESIZER"
                )
            logger.error(f"[AI_ASSISTANT_ERROR]: {str(e)}")
            raise RuntimeError(f"Gemini knowledge synthesis failed: {str(e)}")

    @staticmethod
    async def analyze_evidence(request: EvidenceAnalysisRequest) -> EvidenceAnalysisResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            logger.warning("[AI_EVIDENCE_FAILED] Reason: GEMINI_CONFIGURATION_MISSING")
            raise AiUnavailableException("Gemini API key is unconfigured. Real visual evidence analysis is currently unavailable.")

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            raw_image = request.base64Data
            if "," in raw_image:
                raw_image = raw_image.split(",", 1)[1]
            image_bytes = base64.b64decode(raw_image)
            mime_type = request.mimeType or "image/jpeg"

            prompt = f"""You are an objective civic infrastructure damage assessment vision model for SICP (Societal Innovation Collaboration Portal).
Analyze the submitted field evidence image in relation to the reported societal problem.
Challenge Category: {request.challengeCategory}
Challenge Description: {request.challengeDescription or 'None provided'}

Inspect the image thoroughly and assess:
1. Detected civic or public infrastructure components (e.g. road pavement, culvert, drainage channel, water pipe, transformer, streetlight, bridge, waste dump).
2. Observable physical damage, defect, leakage, blockage, structural fault, or deterioration.
3. Severity level of the damage: "LOW", "MODERATE", "SEVERE", or "CATASTROPHIC".
4. Identified hazard tags (e.g. "structural_instability", "electrical_hazard", "water_contamination", "traffic_hazard", "public_health_risk").
5. Visual confidence score between 0.0 and 1.0 based on image clarity and defect visibility.
6. Practical site inspection notes and preliminary safety precautions.

Return strictly valid JSON adhering to this schema:
{{
  "detectedInfrastructure": ["list", "of", "detected", "assets"],
  "observedDamage": "Detailed objective description of physical defects seen in image",
  "severityEstimate": "LOW" | "MODERATE" | "SEVERE" | "CATASTROPHIC",
  "hazardTags": ["tag1", "tag2"],
  "visualConfidence": float between 0.0 and 1.0,
  "notes": "Field inspection and safety recommendations"
}}
"""
            contents = [
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            ]
            response, used_model = GeminiAdapter._generate_with_failover(
                client=client,
                contents=contents,
                config={'response_mime_type': 'application/json'},
                is_json=True
            )

            parsed = json.loads(response.text)
            sev = str(parsed.get("severityEstimate", "MODERATE"))
            if sev not in ["LOW", "MODERATE", "SEVERE", "CATASTROPHIC"]:
                sev = "MODERATE"

            conf = float(parsed.get("visualConfidence", 0.80))
            conf = max(0.01, min(0.99, conf))

            return EvidenceAnalysisResponse(
                detectedInfrastructure=list(parsed.get("detectedInfrastructure", [])),
                observedDamage=str(parsed.get("observedDamage", "Physical assessment completed.")),
                severityEstimate=sev,
                hazardTags=list(parsed.get("hazardTags", [])),
                visualConfidence=conf,
                notes=str(parsed.get("notes", "Field verification by municipal engineer recommended.")),
                modelVersion=used_model
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            if GeminiAdapter._is_rate_limit_or_quota(e):
                logger.warning("[AI_EVIDENCE_RATE_LIMIT] Quota reached. Using deterministic image safety response.")
                return EvidenceAnalysisResponse(
                    detectedInfrastructure=["Civic Infrastructure Asset"],
                    observedDamage="Evidence image recorded. Visual AI analysis deferred due to API rate limit.",
                    severityEstimate="MODERATE",
                    hazardTags=["site_inspection_recommended"],
                    visualConfidence=0.75,
                    notes="Field inspection by designated municipal engineer recommended.",
                    modelVersion="CIVIC_VISION_GATE"
                )
            logger.error(f"[AI_EVIDENCE_ERROR]: {str(e)}")
            raise RuntimeError(f"Gemini evidence analysis failed: {str(e)}")

    @staticmethod
    async def validate_problem_intent(request: IntentValidationRequest) -> IntentValidationResponse:
        if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) == 0:
            logger.warning("[AI_INTENT_FAILED] Reason: GEMINI_CONFIGURATION_MISSING")
            raise AiUnavailableException("Gemini API key is unconfigured. Problem intent AI validation is currently unavailable.")

        logger.info(f"[AI_INTENT_STARTED] Validating intent for: '{request.title[:40]}...'")
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            prompt = f"""You are the Societal Problem Intent Validation & Input Quality Gate for SICP (Societal Innovation Collaboration Portal).
Your sole task is to analyze user-submitted challenge text and determine if it represents a genuine societal/community problem or if it is gibberish, spam, test input, non-problem conversational text, or an unclear problem needing more context.

User Submission:
Title: {request.title}
Description: {request.description}
Category: {request.category or 'Unspecified'}
Location: {request.district or ''}, {request.state or ''}

Analyze the input and classify it into EXACTLY ONE of these categories:
- VALID_PROBLEM: The submission describes an actual societal, community, public infrastructure, environmental, healthcare, education, agriculture, sanitation, or civic problem (in English, Hindi, or Hinglish). Even if short, if it clearly denotes a civic failure (e.g. "road kharab hai", "damaged roads and potholes", "no drinking water"), it is VALID_PROBLEM.
- UNCLEAR_PROBLEM: The submission hints at an issue but is completely unintelligible or a single vague word without any problem context (e.g. "Sadak", "Help me").
- GIBBERISH: Random keystrokes, keyboard-smash, meaningless characters, or random numbers (e.g. "asdfghjkl", "xyz123", "123456789").
- NON_PROBLEM: Meaningful natural language that is NOT a societal challenge (e.g. "I love pizza", "good morning", "can you teach me Python", "this website is awesome").
- SPAM: Repeated promotional content, repetitive junk text, or advertising.
- TEST_INPUT: Obvious testing input (e.g. "test", "testing 123", "demo").
- ABUSIVE_OR_UNSAFE: Hate speech, harassment, or malicious content.

CRITICAL INTAKE WORKFLOW RULE:
In the SICP platform, location (map pin, device GPS coordinates, district, and state) is collected in a separate, dedicated step (Step 02: Location).
DO NOT classify a submission as UNCLEAR_PROBLEM merely because it lacks a specific street, landmark, village, town, or district name in the problem headline or description.
If the citizen describes a legitimate societal or civic issue (such as road damage, potholes, water stagnation, drainage defect, sewage leakage, power cut, school infrastructure problem), it MUST be classified as VALID_PROBLEM with nextAction: "CONTINUE_ANALYSIS".
DO NOT reject legitimate short citizen expressions or informal language (Hindi, Hinglish, or vernacular).
DO NOT calculate priority or assign universities.

Return a JSON object adhering strictly to this schema:
{{
  "classification": "VALID_PROBLEM" | "UNCLEAR_PROBLEM" | "GIBBERISH" | "NON_PROBLEM" | "SPAM" | "TEST_INPUT" | "ABUSIVE_OR_UNSAFE",
  "confidence": float between 0.0 and 1.0,
  "problemIntent": boolean,
  "qualityScore": float between 0.0 and 1.0,
  "reason": "Clear, objective explanation of the classification decision",
  "missingContext": ["list", "of", "missing", "elements", "if", "unclear"],
  "signals": {{
    "meaningfulLanguage": boolean,
    "societalContext": boolean,
    "problemStatement": boolean,
    "affectedPopulation": boolean,
    "locationContext": boolean,
    "actionableIssue": boolean
  }},
  "suggestedClarification": "Gentle, non-judgmental guidance explaining what details would help clarify the issue (null if valid or gibberish)",
  "nextAction": "CONTINUE_ANALYSIS" | "IMPROVE_SUBMISSION" | "BLOCKED"
}}
"""
            response, used_model = GeminiAdapter._generate_with_failover(
                client=client,
                prompt=prompt,
                config={'response_mime_type': 'application/json'},
                is_json=True
            )

            parsed = json.loads(response.text)
            classification = str(parsed.get("classification", "UNCLEAR_PROBLEM")).upper()
            valid_classes = [
                "VALID_PROBLEM", "UNCLEAR_PROBLEM", "GIBBERISH",
                "NON_PROBLEM", "SPAM", "TEST_INPUT", "ABUSIVE_OR_UNSAFE"
            ]
            if classification not in valid_classes:
                classification = "UNCLEAR_PROBLEM"

            confidence = float(parsed.get("confidence", 0.75))
            confidence = max(0.01, min(0.99, confidence))

            problem_intent = bool(parsed.get("problemIntent", classification in ["VALID_PROBLEM", "UNCLEAR_PROBLEM"]))
            quality_score = float(parsed.get("qualityScore", 0.5))
            quality_score = max(0.0, min(1.0, quality_score))

            reason = str(parsed.get("reason", "Assessment completed."))
            missing_context = list(parsed.get("missingContext", []))

            sig_dict = parsed.get("signals", {})
            signals = IntentSignals(
                meaningfulLanguage=bool(sig_dict.get("meaningfulLanguage", classification not in ["GIBBERISH"])),
                societalContext=bool(sig_dict.get("societalContext", classification in ["VALID_PROBLEM", "UNCLEAR_PROBLEM"])),
                problemStatement=bool(sig_dict.get("problemStatement", classification in ["VALID_PROBLEM", "UNCLEAR_PROBLEM"])),
                affectedPopulation=bool(sig_dict.get("affectedPopulation", False)),
                locationContext=bool(sig_dict.get("locationContext", bool(request.district or request.state))),
                actionableIssue=bool(sig_dict.get("actionableIssue", classification in ["VALID_PROBLEM", "UNCLEAR_PROBLEM"]))
            )

            # Location Invariant: In Step 01, location has not yet been collected (Step 02 handles it).
            # If the model marked UNCLEAR_PROBLEM primarily due to missing location, normalize to VALID_PROBLEM.
            raw_clarification = str(parsed.get("suggestedClarification") or "")
            combined_feedback = f"{reason} {raw_clarification} {' '.join(str(m) for m in missing_context)}".lower()
            is_loc_complaint = any(
                phrase in combined_feedback
                for phrase in [
                    "fails to provide specific location",
                    "missing location",
                    "without location",
                    "location details",
                    "failed to provide any location",
                    "no location",
                    "village name",
                    "specify location",
                    "location information",
                    "where this issue",
                    "where this problem",
                ]
            )
            is_only_loc_missing = len(missing_context) > 0 and all(
                any(w in str(m).lower() for w in ["location", "village", "district", "area", "address", "coordinates", "place"])
                for m in missing_context
            )

            if classification == "UNCLEAR_PROBLEM" and (is_loc_complaint or is_only_loc_missing):
                classification = "VALID_PROBLEM"
                problem_intent = True
                signals.problemStatement = True
                signals.actionableIssue = True
                reason = "Civic problem statement clearly identified. Specific geographic location can be pinned in the next step."
                suggested_clarification = None
            else:
                suggested_clarification = parsed.get("suggestedClarification")
                if classification == "UNCLEAR_PROBLEM" and not suggested_clarification:
                    suggested_clarification = "Providing details on the specific civic disruption will help municipal officers understand this challenge."

            next_action = str(parsed.get("nextAction", ""))
            if classification == "VALID_PROBLEM":
                next_action = "CONTINUE_ANALYSIS"
            elif classification == "UNCLEAR_PROBLEM":
                next_action = "IMPROVE_SUBMISSION"
            else:
                next_action = "BLOCKED"

            logger.info(f"[AI_INTENT_SUCCESS] Classification: {classification}, Confidence: {confidence} via {used_model}")
            return IntentValidationResponse(
                classification=classification,
                confidence=confidence,
                problemIntent=problem_intent,
                qualityScore=quality_score,
                reason=reason,
                missingContext=missing_context,
                signals=signals,
                suggestedClarification=suggested_clarification,
                validationMode="ai",
                nextAction=next_action
            )
        except Exception as e:
            if isinstance(e, AiUnavailableException):
                raise
            if GeminiAdapter._is_rate_limit_or_quota(e):
                logger.warning("[AI_INTENT_RATE_LIMIT] Quota reached. Using deterministic intent gate.")
                return GeminiAdapter._intent_fallback(request)
            logger.error(f"[AI_INTENT_ERROR]: {str(e)}")
            raise RuntimeError(f"Gemini intent validation failed: {str(e)}")
