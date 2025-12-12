"""
Utility training script wrapper for textClassifier.
Run from `avatar-backend` directory: `py train_classifier.py`
This simply invokes the classifier module with --train.
"""
import subprocess
import sys
import os

SCRIPT = os.path.join(os.path.dirname(__file__), 'textClassifier.py')

def main():
    print('Starting training...')
    res = subprocess.run([sys.executable, SCRIPT, '--train'])
    if res.returncode == 0:
        print('Training finished successfully')
    else:
        print('Training failed with code', res.returncode)

if __name__ == '__main__':
    main()
