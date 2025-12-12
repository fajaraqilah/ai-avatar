You are the AI Code Agent for this Avatar AI project.
Your task is to fix the gesture classification issues based on the following confirmed problems and requirements.

Please read and follow all instructions carefully.

---

## PROBLEMS TO FIX

1. The classifier consistently outputs `"normal"` even for greeting inputs such as "halo".
2. The classifier is currently classifying the **LLM output text**, not the original user input.
3. There is no rule-based override for greetings, causing misclassification for short phrases.
4. The model is biased because the training dataset has many more `"normal"` examples than `"Greeting"`.
5. Fallback and preprocessing logic on the backend cause gestureLabels to always default to `"idle"` or `"normal"` when classifier confidence is low.
6. gestureLabels must reliably match canonical gesture names used by the frontend and gestureToClip.json.

---

## REQUIRED FIXES

### 1. Classifier Pipeline Fix

Update the backend so that:

* Classification uses the **original user input**, not the LLM-generated response.
* Keep classification of the LLM response optional (behind a flag) but do not use it for gesture selection unless explicitly required.
* Ensure the backend correctly passes `userMessage` into `textClassifier.py`.

### 2. Implement Greeting Rule-Based Override

Before running ML classification, detect greeting phrases using a rule such as:

* `"hai"`, `"halo"`, `"hello"`, `"hi"`, `"assalam"`, `"assalamu"`, `"selamat pagi"`, `"selamat siang"`

If a match is found:

* Set gestureLabels = ["Greeting"]
* Skip classifier process for this case.

This ensures high accuracy for greetings regardless of model bias.

### 3. Improve Backend Gesture Selection Logic

Modify backend logic to:

* Use classifier prediction **only when rule-based checks do not trigger**.
* Interpret the classifier output as:

  * `label` (string)
  * `confidence` (float between 0 and 1)
* If classifier confidence is below `0.40`, fallback to `"normal"` or `"idle"` based on canonical rules.
* Ensure gestureLabels is always an array of strings.

### 4. Add canonical gestureToClip.json Mapping

Add or update:

`avatar-frontend/public/gestureToClip.json`

Example fields:

```
{
  "Greeting": "Greeting_1",
  "normal": "Talking_0",
  "explaining_normal": "Explaining_1",
  "idle": "Idle"
}
```

Ensure backend gesture labels match exactly the canonical keys required by the frontend.

### 5. Strengthen textClassifier.py Predict Function

Implement improvements:

* Support ngram_range=(1,2) for TF-IDF.
* Add class_weight="balanced" to reduce bias toward "normal".
* Add a minimum confidence threshold.
* Keep JSON output stable and machine-readable.

### 6. Update Backend Integration in index.js

Fix the subprocess call:

* Ensure classification reads the correct text input.
* Ensure command output is parsed correctly.
* Ensure logging reports both rule-based and ML-based decisions.

### 7. Add /classify Debug Endpoint

Create or update:

`GET /classify?text=...`

Return:

```
{
  "label": "...",
  "confidence": ...,
  "rulesTriggered": true|false,
  "rawClassifierOutput": {...}
}
```

---

## EXPECTED DELIVERABLE

Produce a step-by-step implementation plan AND then produce the necessary code changes across:

* `avatar-backend/index.js`
* `avatar-backend/textClassifier.py`
* `avatar-frontend/public/gestureToClip.json` (create if missing)
* Supporting utility files if required

The agent should:

1. First output the full implementation plan.
2. Then output all required code modifications file-by-file.

Do not modify unrelated files.
Do not change the response structure expected by the frontend.


