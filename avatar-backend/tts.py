# tts.py
from gtts import gTTS
import sys
import os
import re

def detect_language(text):
    # Simple language detection based on common Indonesian words
    indo_pattern = r'[^\x00-\x7F]|(yang|tidak|dan|apa)'
    if re.search(indo_pattern, text, re.IGNORECASE):
        return 'id'  # Indonesian
    else:
        return 'en'  # English

def read_text_file(file_path):
    """Read text file with multiple encoding attempts"""
    encodings = ['utf-8', 'utf-16', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError:
            continue
    
    # If all encodings fail, try with errors='ignore'
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
            return file.read()
    except Exception as e:
        raise Exception(f"Could not read file with any encoding: {str(e)}")

def main():
    # Initialize text_file_path to avoid unbound variable error
    text_file_path = None
    
    try:
        # Check if command line argument is provided
        if len(sys.argv) < 2:
            print("Error: No text file path provided")
            sys.exit(1)
            
        # Get the text file path from command line argument
        text_file_path = sys.argv[1]
        
        # Read text from file with proper encoding
        text = read_text_file(text_file_path)
        
        # Debug: Print text information
        print(f"Text length: {len(text)} characters")
        print(f"Text preview: {text[:100]}...")
        
        # Check if text is empty
        if not text or len(text.strip()) == 0:
            print("Warning: Empty text provided")
            sys.exit(1)
        
        # Create audios directory if it doesn't exist
        os.makedirs("audios", exist_ok=True)
        
        # Detect language and generate speech
        print("Detecting language...")
        lang = detect_language(text)
        print(f"Detected language: {lang}")
        
        print("Generating speech...")
        tts = gTTS(text, lang=lang)
        tts.save("audios/generated.mp3")
        print("Speech generated successfully")
        
        # Clean up temporary text file
        os.remove(text_file_path)
        
        print("Audio generated successfully")
    except IndexError:
        print("Error: No text file path provided")
        sys.exit(1)
    except FileNotFoundError:
        if text_file_path:
            print(f"Error: Text file not found at {text_file_path}")
        else:
            print("Error: Text file not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error generating audio: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()