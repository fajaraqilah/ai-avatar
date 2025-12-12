Plan: Repair Gesture System

TL;DR — I'll produce a targeted, implementable plan to find why gestures always resolve to `Idle`, fix the backend classification and response, patch frontend mapping and sequencing, and add tests and stability improvements so gestures reliably drive Mixamo clips end-to-end.

Steps
1. Root-cause analysis (investigate backend responses, frontend coercions, and animation mapping).
2. Backend fixes (add/enable classifier, ensure correct JSON schema, add logging).
3. Frontend fixes (validate mapping, wait-for-mixer, robust fallback logic).
4. Integration (where to plug classifier into the existing pipeline).
5. Validation & testing (unit, API, and E2E).
6. Stability & refactor suggestions (config, schema, and CI).

**Root Cause Analysis**
- **Backend not producing gesture array**: `avatar-backend/index.js` currently does not call a text classifier; no `gestureLabels` generation path is visible. If `gestureLabels` is missing or not an array, frontend `useChat` will coerce or reset it (see `avatar-frontend/src/hooks/useChat.jsx` where invalid labels trigger a reset to `['Idle']`).
- **Invalid response shape / types**: If `gestureLabels` is a string (e.g., `"Idle"`) or null, the frontend will warn and replace with `['Idle']`.
- **Classifier invocation missing**: The repository mentions a dataset CSV but there is no live integration (no call to a `textClassifier` from `index.js`).
- **Animation mapping mismatch**: Frontend fuzzy matching (in `avatar-frontend/src/components/Avatar.jsx`) depends on animation names loaded from GLBs. If labels differ (language, underscore vs dash, case), the partial `includes()` logic may not find a match → fallback to Idle.
- **Actions not initialized / race conditions**: `actionsRef` is populated only after the mixer is created and GLBs load. If a message arrives too early, mapping returns fallback `['Talking_1']` or Idle. Also `mixer` event handling and action lifecycle could cause unexpected immediate fallback.
- **Fallback handling too aggressive**: Multiple fallbacks in `playGesture`/`playGestureSequence` prioritize `Idle` (in several places), masking specific-label failures.
- **Looping logic interfering with completion events**: `gestureManager.js` may return extremely large loop counts (9999 fallback) or set `LoopRepeat` incorrectly, preventing `finished` events and breaking sequences.

**Backend Fix Plan (files: `avatar-backend/index.js`, add `avatar-backend/textClassifier.js` or `classifier/` folder, `avatar-backend/tts.py`)**
- **Add/Enable classifier module**
  - Create `avatar-backend/textClassifier.js` (or `.py` if preferred) that:
    - Loads the CSV dataset (`avatar-backend/dataset_gesture_training.csv`).
    - Exposes a simple predict(text) → `string|label[]` (canonical label names).
    - Offer a lightweight fallback (keyword rules) if model unavailable.
  - Prefer JS for easier integration with `index.js`; if using Python, expose a small HTTP wrapper or CLI call.
- **Insert classifier into pipeline**
  - In `index.js` after LLM text `text = result.response || "No response."`, call the classifier synchronously/asynchronously to produce `gestureLabels`.
  - Normalize classifier output to an array of strings (e.g., `["normal"]`).
- **Ensure response schema correctness**
  - Build response object exactly as frontend expects (keys and types): `success: boolean, text: string, subtitles: string[], audio: base64 string, lipsync: object, gestureLabels: string[], audioDuration: number`.
  - Add checks / validation before `res.json(...)` and log errors with payload samples.
- **Fallback policy in backend**
  - If classifier confidence is low, return a small set of candidate labels (ordered) or `[]`, not a string.
  - Do not return `null` or non-array for `gestureLabels`.
- **Logging & diagnostic fields**
  - Include optional `debug` fields in non-production responses: `gesturePrediction: { label, confidence }` and `classifierUsed: "rule|model"`.
  - Add structured logs for each pipeline step (LLM, classifier, TTS, ffmpeg, rhubarb).
- **Files changed/added**
  - Modify: `avatar-backend/index.js`
  - Add: `avatar-backend/textClassifier.js` (or `classifier/*.js`)
  - (Optional) Add small `avatar-backend/api_test.sh` or `scripts/` helper for local verification.

**Frontend Fix Plan (files: `avatar-frontend/src/components/Avatar.jsx`, `gestureManager.js`, `src/hooks/useChat.jsx`)**
- **Tighten `useChat` validation**
  - In `useChat.jsx` keep validation but change behavior: when `gestureLabels` invalid, log the raw value (already does) and do not silently coerce to `['Idle']`—instead accept `[]` as "no label, let frontend classify".
  - Add a visible debug flag to surface the backend `gesturePrediction` when present.
- **Normalize gesture labels early**
  - In `Avatar.jsx` mapping (`mapLabelsToAvailableActions`), normalize casing, punctuation, and whitespace (e.g., convert both available actions and incoming labels to lower-case and replace `-`/` ` with `_`).
- **Wait-for-mixer initialization**
  - Ensure any incoming message processing defers until `actionsRef.current` is non-empty and `mixerRef.current` exists. If message arrives too early, queue it with a 100–300ms retry or hold until `actionsRef` ready.
- **Improve fuzzy matching**
  - Replace brittle `includes()` checks with a ranked-match algorithm:
    - Exact case-insensitive match
    - Normalized exact match (spaces/underscores removed)
    - Partial substring match (prefer longest matched substring)
    - Fallback mapping file (see next bullet)
  - Consider adding a small mapping JSON `avatar-frontend/public/gestureToClip.json` to map canonical `gestureLabels` → preferred clip name. This prevents reliance on fragile heuristics.
- **Fix fallback behavior**
  - Centralize fallback in one place: if no mapping found, return `null` and let high-level code decide: either play a safe `Idle` but log and show a visible debug message.
  - Avoid double-wrapping to Idle across both `playGestureSequence` and mixer `finished` handler.
- **Event & loop handling**
  - Ensure `LoopRepeat` counts are reasonable. If `gestureManager` returns huge loop (9999), replace with sentinel `loopUntilAudioEnd` flag and drive stop via audio end event.
  - Make sure `animationCallbacksRef` keys are the clip names (current code already uses clip name), and that mixer `finished` events trigger callbacks only for LoopOnce clips (or calling code sets clampWhenFinished).
- **Files changed**
  - Modify: `avatar-frontend/src/components/Avatar.jsx`,`gestureManager.js`, `src/hooks/useChat.jsx`
  - Add: `avatar-frontend/public/gestureToClip.json` (optional mapping helper)

**Integration Plan (where and how to plug classifier)**
- **Pipeline placement (reflecting current architecture)**
  1. `index.js` receives user message and queries Ollama → obtains generated `text`.
  2. Immediately after LLM text generation (before TTS), call classifier: `const predicted = await classifier.predict(text)`.
  3. Add `gestureLabels: Array.isArray(predicted) ? predicted : [predicted]` plus optional `gesturePrediction` debug object to the outgoing payload.
  4. Proceed with TTS and lipsync generation (audio/lipsync independent of classifier).
  5. Return consolidated JSON to frontend.
- **Classifier contract**
  - Inputs: raw generated string (cleaned as needed).
  - Output: ordered array of canonical gesture label strings and optionally confidences: `[{label:'normal', confidence:0.87}, ...]`.
  - Ensure labels match frontend canonical label set (lowercase, underscore).
- **Backward compatibility**
  - If classifier missing or fails, return `gestureLabels: []` and `gesturePrediction: null` rather than a single string.
- **Developer testing endpoint**
  - Add a debugging endpoint `/classify` in `index.js` that accepts `{ text }` and returns classifier output to ease iteration.
- **Deployment notes**
  - Keep classifier as a local file or a lightweight dependency. If model needs heavy deps, run it as a subprocess or external microservice.

**Validation & Testing Plan**
- **Classifier unit tests**
  - Use the existing CSV (`avatar-backend/dataset_gesture_training.csv`) to produce a test harness:
    - Hold out a small test fold and assert classifier accuracy > X% (baseline target: whatever dataset supports, e.g., >80% for simple labels).
    - Check canonicalization: classifier returns labels in the canonical naming used by frontend.
  - Add tests under `avatar-backend/tests/classifier.test.js`.
- **Backend API tests**
  - Create tests to POST `/chat` with sample messages and assert:
    - Response HTTP 200, `success: true`.
    - `gestureLabels` is an array.
    - `audio` is base64 (or empty string).
    - `lipsync.mouthCues` is an array when Rhubarb succeeds.
  - Add a deterministic test using a mocked Ollama response to isolate classifier behavior.
- **Frontend unit/integration tests**
  - Add a small test to `Avatar` mapping logic:
    - Feed synthetic `message` objects (with `gestureLabels`) to `useChat`/Avatar and assert `mapLabelsToAvailableActions` returns expected clip names.
    - Use `list_animations.js` output to ensure mapping matches available clips.
- **End-to-end manual test**
  - Steps:
    1. Start Ollama, backend, and frontend (documented commands).
    2. Send `curl` requests to `/chat` with sample prompts that should map to specific gestures (e.g., "Explain photosynthesis" → `normal`).
    3. Observe frontend avatar: verify non-idle animation plays and lipsync matches audio.
    4. Verify logs: backend shows classifier result, frontend mapping logs matched clip.
- **Edge-case tests**
  - Confirm behavior when:
    - Classifier returns unknown label → frontend logs and falls back cleanly.
    - No Rhubarb output → frontend still plays fallback animation and shows audio.
    - Audio duration long → looping behavior respects audio end.
- **Automation**
  - Add small CI checks that run the classifier unit tests and the `list_animations.js` script to ensure animation names are detectable.

**Stability & Refactoring Suggestions**
- **Canonical label registry**
  - Add a single source-of-truth `gesture_labels.json` (backend + frontend read when starting) to avoid label drift. Use canonical lowercase underscore format.
- **Mapping file**
  - `gestureToClip.json` maps canonical `gestureLabels` → preferred clip name(s) in GLBs. Frontend uses this mapping before fuzzy heuristics.
- **Make external tools configurable**
  - Replace hardcoded paths in `avatar-backend/index.js` with env vars: `FFMPEG_PATH`, `RHUBARB_PATH`, `PYTHON_PATH`, `OLLAma_URL`. Add `.env.example`.
- **Schema validation**
  - Add a JSON Schema validator for `/chat` responses on both backend (before sending) and frontend (accepting) to detect regressions early.
- **Better event model for audio-driven loops**
  - Use `loopUntilAudioEnd` semantics instead of artificially large `LoopRepeat`. Drive sequence progression using audio `ended` event or a shared clock.
- **Improve logging & diagnostics**
  - Correlate logs with request IDs; add timestamped structured logs at key pipeline points (LLM, classifier, TTS, ffmpeg, rhubarb).
- **CI & Tests**
  - Add lightweight CI (GitHub Actions) to run classifier unit tests and `list_animations.js` so that PRs which change labels or models fail fast.
- **Developer ergonomics**
  - Add `/classify` debug endpoint and a `scripts/test_chat.sh` that posts sample messages and prints classifier and backend responses.
- **Progressive rollout**
  - If you change classifier model, version it and allow backend to return `classifierVersion` so frontend and tests can assert compatibility.

**Questions / Clarifications before implementation**
- Which classifier approach do you prefer?
  - Option A: JS-based rule + lightweight ML (fast to add).
  - Option B: Small Python model (e.g., scikit-learn) using the CSV (requires Python subprocess or microservice).
  - Option C: Use Ollama to classify (LLM prompt + mapping) — simpler but less deterministic and may add costs/latency.
- Do you want canonical label/clip mapping files added to the repo (recommended)?
- Should I create the backend `/classify` debug endpoint and a `gestureToClip.json` skeleton as part of the plan?

If you confirm which classifier approach you prefer and whether to add mapping files, I’ll refine this into an ordered implementation TODO list for the coding agent to execute next.


I confirm the following decisions:

1. I choose **Option B**:
   Use a **Python text classifier** (e.g., scikit-learn or lightweight model) trained using my existing CSV dataset. This classifier will run from the backend via a Python subprocess.

2. Yes, please create a **canonical gesture-to-clip mapping file** (e.g., `gestureToClip.json`) to ensure stable mapping between classifier labels and Mixamo animation clip names.

3. Yes, please create a backend **`/classify` debug endpoint** so I can test classification independently of the full pipeline.

With these choices confirmed, please refine the previous plan and produce a **step-by-step Implementation TODO List**, specifying all file modifications and additions required across:

* `avatar-backend/index.js`
* new `avatar-backend/textClassifier.py`
* Python model training script
* classifier invocation integration
* gestureToClip.json creation and usage
* frontend mapping updates
* fallback logic adjustments
* testing and validation steps

Do not write code yet.
Produce only a complete, ordered implementation plan.



