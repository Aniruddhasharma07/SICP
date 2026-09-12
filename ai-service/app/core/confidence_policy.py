from typing import Tuple, List

class ConfidencePolicy:
    @staticmethod
    def evaluate(
        confidence_score: float,
        severity: str,
        threshold: float = 0.80
    ) -> Tuple[bool, List[str]]:
        rules: List[str] = []
        requires_review = False

        if confidence_score < threshold:
            requires_review = True
            rules.append(f"Confidence score ({confidence_score:.2f}) is below policy threshold ({threshold:.2f})")

        if severity in ["SEVERE", "CATASTROPHIC"]:
            requires_review = True
            rules.append(f"High-stakes severity level ({severity}) mandates human government review")

        if not rules:
            rules.append("Confidence score satisfies automated validation threshold")

        return requires_review, rules
