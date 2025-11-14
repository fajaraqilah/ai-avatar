#!/usr/bin/env python3
"""
Flask API for generating gesture animations from text input.
"""

from flask import Flask, request, jsonify, send_file
import os
import json
from generate_gesture import text_to_gesture, save_gesture_data
from bvh_processor import convert_bvh_to_mixamo

app = Flask(__name__)

# Create output directory if it doesn't exist
os.makedirs("output", exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "gesture-generation-api"
    })

@app.route('/generate-gesture', methods=['POST'])
def generate_gesture():
    """
    Generate gesture from text input.
    
    Expected JSON input:
    {
        "text": "Hello everyone!",
        "format": "json"  // or "bvh"
    }
    
    Returns:
    {
        "success": true,
        "gesture_data": {...},  // if format is "json"
        "file_path": "output/gesture.bvh"  // if format is "bvh"
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'text' field in request"
            }), 400
        
        text = data['text']
        output_format = data.get('format', 'json')  # Default to JSON
        
        # Validate format
        if output_format not in ['json', 'bvh']:
            return jsonify({
                "success": False,
                "error": "Invalid format. Supported formats: 'json', 'bvh'"
            }), 400
        
        # Generate gesture data
        gesture_data = text_to_gesture(text, output_format)
        
        if output_format == 'bvh':
            # Save BVH file and return file path
            file_path = save_gesture_data({"bvh": gesture_data["bvh"]}, "output", "gesture")
            return jsonify({
                "success": True,
                "file_path": file_path,
                "message": "Gesture generated successfully"
            })
        else:
            # Return JSON data directly
            return jsonify({
                "success": True,
                "gesture_data": gesture_data,
                "message": "Gesture generated successfully"
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/generate-gesture-mixamo', methods=['POST'])
def generate_gesture_mixamo():
    """
    Generate gesture from text input and convert to Mixamo-compatible format.
    
    Expected JSON input:
    {
        "text": "Hello everyone!",
        "format": "json"  // or "fbx"
    }
    
    Returns:
    {
        "success": true,
        "data": {...},  // if format is "json" (Mixamo-compatible JSON)
        "file_path": "output/gesture.fbx"  // if format is "fbx"
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'text' field in request"
            }), 400
        
        text = data['text']
        output_format = data.get('format', 'json')  # Default to JSON
        
        # Validate format
        if output_format not in ['json', 'fbx']:
            return jsonify({
                "success": False,
                "error": "Invalid format. Supported formats: 'json', 'fbx'"
            }), 400
        
        # Generate BVH gesture data first
        bvh_data = text_to_gesture(text, "bvh")
        
        # Save BVH to temporary file
        bvh_file_path = save_gesture_data({"bvh": bvh_data["bvh"]}, "output", "temp_gesture")
        bvh_file_path = bvh_file_path.replace(".json", ".bvh")
        
        # Rename the file to have .bvh extension
        import shutil
        temp_json_path = bvh_file_path.replace(".bvh", ".json")
        if os.path.exists(temp_json_path):
            os.remove(temp_json_path)
        
        # Create actual BVH file content
        with open(bvh_file_path, 'w') as f:
            f.write(bvh_data["bvh"])
        
        # Convert BVH to Mixamo format
        conversion_result = convert_bvh_to_mixamo(bvh_file_path, output_format)
        
        # Clean up temporary BVH file
        if os.path.exists(bvh_file_path):
            os.remove(bvh_file_path)
        
        if conversion_result["success"]:
            if output_format == 'fbx':
                return jsonify({
                    "success": True,
                    "file_path": conversion_result["file_path"],
                    "message": "Gesture generated and converted to FBX successfully"
                })
            else:
                return jsonify({
                    "success": True,
                    "data": conversion_result["data"],
                    "message": "Gesture generated and converted to Mixamo JSON successfully"
                })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to convert gesture to Mixamo format"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/gesture-file/<filename>', methods=['GET'])
def get_gesture_file(filename):
    """
    Serve generated gesture files.
    
    Args:
        filename: Name of the file to serve
    """
    try:
        file_path = os.path.join("output", filename)
        if os.path.exists(file_path):
            return send_file(file_path)
        else:
            return jsonify({
                "success": False,
                "error": "File not found"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)