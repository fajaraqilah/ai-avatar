# tts.py
from gtts import gTTS
import sys
import os

text = sys.argv[1]
sentences = text.split(".")
os.makedirs("audios", exist_ok=True)

for i, sentence in enumerate(sentences):
    sentence = sentence.strip()
    if sentence:
        tts = gTTS(sentence, lang='id')
        tts.save(f"audios/sentence_{i}.mp3")

print("Audio generated")