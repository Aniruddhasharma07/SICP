from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    TranscriptionRequest,
    EmbeddingRequest,
    EmbeddingResponse,
    KnowledgeSynthesisRequest,
    KnowledgeSynthesisResponse,
    EvidenceAnalysisRequest,
    EvidenceAnalysisResponse
)

def test_valid_analysis_request():
    req = AnalysisRequest(
        title="Severe drainage overflow in sector 4",
        description="Drainage water has been overflowing on the primary road for 3 days causing hazard.",
        category="Sanitation",
        district="Varanasi",
        state="Uttar Pradesh"
    )
    assert req.title == "Severe drainage overflow in sector 4"
    assert req.category == "Sanitation"

def test_valid_analysis_response():
    resp = AnalysisResponse(
        category="Sanitation",
        estimatedSeverity="SEVERE",
        preliminaryPriority="HIGH",
        confidenceScore=0.88,
        reasoningSummary="Flooding in primary transit route poses active health hazard.",
        requiresHumanReview=True,
        appliedRules=["High-stakes severity level (SEVERE) mandates human government review"],
        aiProvider="GEMINI"
    )
    assert resp.confidenceScore == 0.88
    assert resp.requiresHumanReview is True

def test_valid_embedding_schema():
    req = EmbeddingRequest(text="Groundwater salinity mitigation in rural tubewells")
    assert req.dimensions == 768
    resp = EmbeddingResponse(embedding=[0.1] * 768, dimensions=768)
    assert len(resp.embedding) == 768

def test_valid_knowledge_synthesis_schema():
    req = KnowledgeSynthesisRequest(
        query="What are effective community rainwater harvesting systems?",
        userRole="FACULTY",
        retrievedMemories=[{"title": "Checkdam in Bundelkhand", "impact": "High"}]
    )
    assert req.userRole == "FACULTY"
    resp = KnowledgeSynthesisResponse(
        synthesizedAnswer="Decentralized checkdams combined with recharge pits show 78% retention efficiency.",
        keyFindings=["Recharge pits enhance aquifer replenishment."],
        precedentWarnings=["Requires pre-monsoon silt clearance."],
        confidenceScore=0.91
    )
    assert resp.confidenceScore == 0.91
    assert len(resp.keyFindings) == 1

def test_valid_evidence_analysis_schema():
    req = EvidenceAnalysisRequest(
        fileKey="evidence-123.jpg",
        mimeType="image/jpeg",
        base64Data="dGVzdA==",
        challengeCategory="Water Management"
    )
    assert req.challengeCategory == "Water Management"
    resp = EvidenceAnalysisResponse(
        detectedInfrastructure=["Submersible pump outlet", "Open masonry channel"],
        observedDamage="Corrosion and major pipe fracture causing localized flooding",
        severityEstimate="SEVERE",
        hazardTags=["water_contamination"],
        visualConfidence=0.88
    )
    assert resp.severityEstimate == "SEVERE"
    assert resp.visualConfidence == 0.88

