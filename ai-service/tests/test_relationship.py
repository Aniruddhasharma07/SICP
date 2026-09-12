import pytest
from app.schemas.relationship import (
    ChallengeEntitySchema,
    RelationshipAnalysisRequest,
    RelationshipAnalysisResponse
)

def test_valid_relationship_request():
    subject = ChallengeEntitySchema(
        id="chal-1",
        title="Burst water main on MG Road",
        description="Fresh drinking water gushing onto the road from main pipe.",
        category="Water Supply",
        district="Varanasi",
        state="Uttar Pradesh",
        latitude=25.3176,
        longitude=82.9739,
        rootCause="High pressure ruptured aged ductile iron pipe",
        severity="SEVERE",
        durationMonths=1,
        evidenceCount=2
    )

    candidate = ChallengeEntitySchema(
        id="chal-2",
        title="No water pressure in residential houses near MG Road",
        description="Dry taps across 200 households connected to MG Road feeder.",
        category="Water Supply",
        district="Varanasi",
        state="Uttar Pradesh",
        latitude=25.3180,
        longitude=82.9745,
        rootCause="Feed pressure drop due to upstream transmission failure",
        severity="SEVERE",
        durationMonths=1,
        evidenceCount=1
    )

    req = RelationshipAnalysisRequest(
        subjectChallenge=subject,
        candidateChallenge=candidate
    )

    assert req.subjectChallenge.id == "chal-1"
    assert req.candidateChallenge.id == "chal-2"
    assert req.subjectChallenge.latitude == 25.3176

def test_valid_relationship_response():
    resp = RelationshipAnalysisResponse(
        relationshipType="SYSTEMIC_ROOT_CAUSE",
        confidenceScore=0.92,
        problemSimilarity=75.0,
        rootCauseSimilarity=88.0,
        geographicRelationship=95.0,
        infrastructureRelationship=90.0,
        temporalRelationship=100.0,
        evidenceConsistency=85.0,
        explanation="Candidate water pressure loss is a direct systemic consequence of subject main pipeline rupture on MG Road.",
        sharedInfrastructure="MG Road Water Main Feeder",
        recommendedAction="LINK_SYSTEMIC",
        requiresHumanReview=True
    )

    assert resp.relationshipType == "SYSTEMIC_ROOT_CAUSE"
    assert resp.confidenceScore == 0.92
    assert resp.sharedInfrastructure == "MG Road Water Main Feeder"
    assert resp.requiresHumanReview is True
    assert resp.recommendedAction == "LINK_SYSTEMIC"
