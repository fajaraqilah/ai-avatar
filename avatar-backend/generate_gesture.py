#!/usr/bin/env python3
"""
Generate gesture animations from text input using rule-based mapping.

This script converts text to gesture sequences and outputs them in a format
compatible with Mixamo animations or custom avatar systems.
"""

import re
import json
import os
import sys
import math
import logging
import numpy as np
from typing import List, Tuple, Dict, Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -------------------------
# Gesture definitions & mapping rules
# -------------------------
# Available gesture primitives:
# - 'idle'       : small breathing
# - 'nod'        : yes (vertical head)
# - 'shake'      : no (horizontal head)
# - 'wave'       : hand wave (right arm)
# - 'point'      : point forward (right arm extended)
# - 'hands_up'   : raised arms (emphasis / excitement)
# - 'bow'        : slight forward torso (thanks/apology)
# - 'head_tilt'  : tilt head (question)
# - 'emphatic'   : quick arm thump (exclamation emphasis)

# Basic lexicons
WAVE_WORDS = {'hello', 'hi', 'hey', 'hiya', 'greetings'}
THANKS_WORDS = {'thanks', 'thank', 'thankyou', 'thank you', 'thx', 'ty'}
YES_WORDS = {'yes', 'yeah', 'yep', 'sure', 'yup', 'correct', 'right'}
NO_WORDS = {'no', 'nope', 'nah'}
POINT_WORDS = {'this', 'that', 'over', 'there', 'see', 'look'}
QUESTION_WORDS = {'who','what','when','where','why','how'}
EMPHASIS_PUNCT = {'!'}
# detect verbs (very simple heuristic)
POINT_VERBS = {'show','point','indicate','look'}

def preprocess(text: str) -> str:
    """Preprocess text for gesture analysis."""
    t = text.lower().strip()
    t = re.sub(r'[^\w\s?!)\(\]\[]', '', t)  # remove punctuation except ? !
    return t

def pick_gestures(sentence: str) -> List[Tuple[str, float]]:
    """
    Return a list of (gesture, duration_sec) in order chosen for sentence.
    This is heuristic: picks a main gesture and some short supporting gestures.
    """
    s_raw = sentence.strip()
    s = preprocess(sentence)
    tokens = set(s.split())

    gestures = []

    # priority rules
    if any(w in tokens for w in WAVE_WORDS) and len(tokens) <= 4:
        gestures.append(('wave', 2.0))
    if any(w in tokens for w in THANKS_WORDS):
        gestures.append(('bow', 1.6))
    if any(w in tokens for w in YES_WORDS):
        gestures.append(('nod', 1.2))
    if any(w in tokens for w in NO_WORDS):
        gestures.append(('shake', 1.2))

    # question: question mark OR wh-word
    if '?' in s_raw or any(w in tokens for w in QUESTION_WORDS):
        gestures.append(('head_tilt', 1.4))

    # emphasis: exclamation or ALL CAPS words
    if any(p in s_raw for p in EMPHASIS_PUNCT) or any(w.isupper() and len(w) > 1 for w in sentence.split()):
        gestures.append(('emphatic', 1.0))
        # also raise hands for excitement
        gestures.append(('hands_up', 1.2))

    # pointing: presence of point verbs/words
    if any(w in tokens for w in POINT_VERBS) or any(w in tokens for w in POINT_WORDS):
        gestures.append(('point', 1.5))

    # fallback: if nothing selected, small idle + maybe nod or hands_up for short exclamations
    if not gestures:
        # choose subtle gesture based on sentence sentiment heuristics (very simple)
        if any(c in s_raw for c in ['!', 'great', 'awesome', 'love', 'yay']):
            gestures.append(('hands_up', 1.5))
        elif len(s.split()) > 3:
            gestures.append(('nod', 1.2))
        else:
            gestures.append(('idle', 2.0))

    # compress duplicates and keep reasonable ordering (head gestures before arm gestures)
    # prefer head gestures early
    head = [g for g in gestures if g[0] in ('nod','shake','head_tilt','bow')]
    arms = [g for g in gestures if g[0] in ('wave','point','hands_up','emphatic')]
    idle = [g for g in gestures if g[0]=='idle']
    ordered = head + arms + idle
    # cap total duration
    max_total = 6.0
    total = 0.0
    out = []
    for g,d in ordered:
        if total + d > max_total:
            d = max(0.6, max_total - total)
        out.append((g,d))
        total += d
        if total >= max_total:
            break
    return out

def generate_gesture_keypoints(gestures: List[Tuple[str, float]], fps: int = 30) -> Dict[str, Any]:
    """
    Generate simplified gesture keypoints for each gesture.
    
    Returns a dictionary with compressed bone and frame data.
    """
    # This is a simplified version that just returns gesture names and durations
    # In a real implementation, this would generate actual 3D keypoints
    
    # For now, we'll return a structure that mimics what the frontend expects
    bones = ["Head", "RightArm", "LeftArm", "Torso"]  # Simplified bone structure
    frames = []
    
    # Generate timeline
    timeline = []
    total_frames = 0
    for name, dur in gestures:
        frames_count = max(1, int(fps * dur))
        timeline.append((name, frames_count))
        total_frames += frames_count

    # Create frame data (simplified)
    frame_idx = 0
    for gname, nframes in timeline:
        for i in range(nframes):
            # In a real implementation, this would contain actual 3D positions
            # For now, we just store the gesture name and a simple representation
            frame_data = {
                "gesture": gname,
                "time": frame_idx / fps,
                "positions": {}  # Would contain actual 3D positions in real implementation
            }
            frames.append(frame_data)
            frame_idx += 1
    
    # Add a few idle frames at the end
    for _ in range(int(fps*0.4)):
        frames.append({
            "gesture": "idle",
            "time": frame_idx / fps,
            "positions": {}
        })
        frame_idx += 1

    return {
        "compressed": {
            "bones": bones,
            "frames": frames
        }
    }

def generate_bvh_motion_data(gestures: List[Tuple[str, float]], frames: int = 100) -> List[str]:
    """
    Generate actual motion data for BVH file based on gesture labels.
    
    Args:
        gestures: List of (gesture_name, duration) tuples
        frames: Number of frames to generate
        
    Returns:
        List of motion data lines for BVH file
    """
    # Initialize motion data with zeros
    motion_data = []
    
    # Total duration of all gestures
    total_duration = sum(duration for _, duration in gestures)
    
    # If no gestures or zero duration, return all zeros
    if total_duration <= 0:
        return ["0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"] * frames
    
    # Frame time per gesture
    frame_time_per_gesture = [int((duration / total_duration) * frames) for _, duration in gestures]
    
    # Adjust for rounding errors
    total_allocated = sum(frame_time_per_gesture)
    if total_allocated < frames:
        frame_time_per_gesture[-1] += frames - total_allocated
    
    # Generate motion data for each gesture
    current_frame = 0
    for i, (gesture, duration) in enumerate(gestures):
        gesture_frames = frame_time_per_gesture[i]
        end_frame = min(current_frame + gesture_frames, frames)
        
        # Generate frames for this gesture
        for frame_idx in range(current_frame, end_frame):
            # Calculate progress through the gesture (0.0 to 1.0)
            progress = (frame_idx - current_frame) / max(1, gesture_frames - 1) if gesture_frames > 1 else 0.0
            
            # Generate motion data based on gesture type
            if gesture == 'nod':
                # Nod: sinusoidal rotation on Head (X-axis) ±20 degrees
                head_x_rotation = 20.0 * math.sin(progress * 2 * math.pi)
                motion_line = f"0.0 0.0 0.0 0.0 {head_x_rotation} 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'shake':
                # Shake: sinusoidal rotation on Head (Y-axis) ±20 degrees
                head_y_rotation = 20.0 * math.sin(progress * 2 * math.pi)
                motion_line = f"0.0 0.0 0.0 {head_y_rotation} 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'head_tilt':
                # Head tilt: static rotation on Head (Z-axis) ±15 degrees
                head_z_rotation = 15.0 if progress < 0.5 else -15.0
                motion_line = f"0.0 0.0 0.0 0.0 0.0 {head_z_rotation} 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'hands_up':
                # Hands up: raise both arms (LeftArm, RightArm) by +30 to +45 degrees
                arm_rotation = 30.0 + 15.0 * progress
                motion_line = f"0.0 0.0 0.0 0.0 0.0 0.0 0.0 {arm_rotation} 0.0 0.0 {-arm_rotation} 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'emphatic':
                # Emphatic: add bigger amplitude arm movement
                arm_rotation = 45.0 * math.sin(progress * 3 * math.pi)
                motion_line = f"0.0 0.0 0.0 0.0 0.0 0.0 0.0 {arm_rotation} 0.0 0.0 {-arm_rotation} 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'wave':
                # Wave: right arm waving motion
                arm_rotation = 30.0 * math.sin(progress * 4 * math.pi)
                motion_line = f"0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 {arm_rotation} 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'point':
                # Point: right arm extended forward
                right_arm_x = 30.0
                motion_line = f"0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 {right_arm_x} 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            elif gesture == 'bow':
                # Bow: slight forward torso
                chest_x = -15.0
                motion_line = f"0.0 0.0 0.0 0.0 0.0 0.0 {chest_x} 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            else:
                # Default: no motion
                motion_line = "0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0"
            
            motion_data.append(motion_line)
        
        current_frame = end_frame
    
    # Fill remaining frames with idle motion if needed
    while len(motion_data) < frames:
        motion_data.append("0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0")
    
    return motion_data

def text_to_gesture(text: str, output_format: str = "json") -> Dict[str, Any]:
    """
    Convert text to gesture data.
    
    Args:
        text: Input text to convert to gestures
        output_format: Output format ("json" or "bvh")
        
    Returns:
        Dictionary containing gesture data
    """
    logger.info(f"Processing text: {text[:50]}...")
    gestures = pick_gestures(text)
    logger.info(f"Identified gestures: {gestures}")
    
    if output_format == "bvh":
        # For BVH output, we would need a proper BVH generator
        # This is placeholder implementation
        bvh_data = generate_bvh_with_motion(gestures)
        return {"bvh": bvh_data}
    else:
        # JSON format with keypoints
        return generate_gesture_keypoints(gestures)

def generate_bvh_with_motion(gestures: List[Tuple[str, float]]) -> str:
    """
    Generate a BVH file content with real motion data based on gestures.
    
    Args:
        gestures: List of (gesture_name, duration) tuples
        
    Returns:
        String content of a BVH file with real motion data
    """
    bvh_content = """HIERARCHY
ROOT Hips
{
    OFFSET 0.0 0.0 0.0
    CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
    JOINT Chest
    {
        OFFSET 0.0 10.0 0.0
        CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT Head
        {
            OFFSET 0.0 15.0 0.0
            CHANNELS 3 Zrotation Xrotation Yrotation
            End Site
            {
                OFFSET 0.0 5.0 0.0
            }
        }
        JOINT LeftArm
        {
            OFFSET 0.0 12.0 -5.0
            CHANNELS 3 Zrotation Xrotation Yrotation
            JOINT LeftForeArm
            {
                OFFSET 0.0 0.0 -10.0
                CHANNELS 3 Zrotation Xrotation Yrotation
                End Site
                {
                    OFFSET 0.0 0.0 -8.0
                }
            }
        }
        JOINT RightArm
        {
            OFFSET 0.0 12.0 5.0
            CHANNELS 3 Zrotation Xrotation Yrotation
            JOINT RightForeArm
            {
                OFFSET 0.0 0.0 10.0
                CHANNELS 3 Zrotation Xrotation Yrotation
                End Site
                {
                    OFFSET 0.0 0.0 8.0
                }
            }
        }
    }
}

MOTION
Frames: 100
Frame Time: 0.033333

"""

    # Generate motion data based on gestures
    motion_lines = generate_bvh_motion_data(gestures, 100)
    
    # Add motion data to BVH content
    bvh_content += "\n".join(motion_lines)
    
    return bvh_content

def save_gesture_data(gesture_data: Dict[str, Any], output_dir: str = "output", filename: str = "gesture") -> str:
    """
    Save gesture data to files.
    
    Args:
        gesture_data: Dictionary containing gesture data
        output_dir: Directory to save output files
        filename: Base filename for output files
        
    Returns:
        Path to saved file
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if we're saving BVH data
    if "bvh" in gesture_data:
        # Save as BVH file
        bvh_path = os.path.join(output_dir, f"{filename}.bvh")
        with open(bvh_path, 'w') as f:
            f.write(gesture_data["bvh"])
        return bvh_path
    else:
        # Save as JSON
        json_path = os.path.join(output_dir, f"{filename}.json")
        with open(json_path, 'w') as f:
            json.dump(gesture_data, f, indent=2)
        return json_path

def main():
    """Main function to process text input and generate gestures."""
    if len(sys.argv) < 2:
        print("Usage: python generate_gesture.py <text> [output_format]")
        print("Example: python generate_gesture.py \"Hello everyone!\" json")
        sys.exit(1)
    
    text = sys.argv[1]
    output_format = sys.argv[2] if len(sys.argv) > 2 else "json"
    
    print(f"Generating gesture for: {text}")
    
    # Generate gesture data
    gesture_data = text_to_gesture(text, output_format)
    
    # Save to file
    if output_format == "bvh":
        output_path = save_gesture_data({"bvh": gesture_data["bvh"]}, "output", "gesture")
        print(f"BVH gesture saved to: {output_path}")
    else:
        output_path = save_gesture_data(gesture_data, "output", "gesture")
        print(f"JSON gesture saved to: {output_path}")
    
    # Also save as JSON for the API
    json_path = save_gesture_data(gesture_data, "output", "gesture")
    print(f"Gesture data also saved as JSON to: {json_path}")

if __name__ == "__main__":
    main()