import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from education.indicator_explainer import explain_indicator
from advisor.finance_chatbot import generate_response

print(explain_indicator("RSI", 28))

context = {
    "recommendation": "BUY",
    "confidence": 78,
    "risk_level": "Moderate"
}

print(generate_response("Should I buy?", context))