import sys
import json
import difflib

text = sys.argv[1].lower() if len(sys.argv) > 1 else ""

def is_similar(word, keywords, threshold=0.8):
    return any(difflib.SequenceMatcher(None, word, key).ratio() >= threshold for key in keywords)

words = text.split()

gesture_queue = []
expression = "neutral"

for word in words:
    if is_similar(word, ["halo", "hai", "hello", "hi"]):
        gesture_queue.append("Waving")
        expression = "smile"
    elif is_similar(word, ["jelaskan", "explain", "terangkan"]):
        gesture_queue.append("Talking_2")
        expression = "neutral"
    elif is_similar(word, ["senang", "bahagia", "happy"]):
        gesture_queue.append("Laughing")
        expression = "smile"
    elif is_similar(word, ["sedih", "sad", "menangis"]):
        gesture_queue.append("Crying")
        expression = "sad"
    elif is_similar(word, ["marah", "mad", "angry"]):
        gesture_queue.append("Angry")
        expression = "angry"
    elif is_similar(word, ["takut", "scared", "fear"]):
        gesture_queue.append("Terrified")
        expression = "smile"
    elif is_similar(word, ["menari", "dance", "dancing"]):
        gesture_queue.append("Rumba")
        expression = "funnyFace"

# fallback gesture
if not gesture_queue:
    gesture_queue.append("Talking_4")

print(json.dumps({
    "gestures": gesture_queue,
    "expression": expression
}))