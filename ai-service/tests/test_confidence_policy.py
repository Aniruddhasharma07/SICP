from app.core.confidence_policy import ConfidencePolicy

def test_confidence_above_threshold_normal_severity():
    requires_review, rules = ConfidencePolicy.evaluate(
        confidence_score=0.92,
        severity="MODERATE",
        threshold=0.80
    )
    assert requires_review is False
    assert len(rules) == 1
    assert "satisfies automated validation" in rules[0]

def test_confidence_below_threshold():
    requires_review, rules = ConfidencePolicy.evaluate(
        confidence_score=0.74,
        severity="MODERATE",
        threshold=0.80
    )
    assert requires_review is True
    assert any("below policy threshold" in r for r in rules)

def test_high_stakes_severity_triggers_review():
    requires_review, rules = ConfidencePolicy.evaluate(
        confidence_score=0.95,
        severity="CATASTROPHIC",
        threshold=0.80
    )
    assert requires_review is True
    assert any("High-stakes severity level" in r for r in rules)
