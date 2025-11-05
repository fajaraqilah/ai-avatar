## ⚙️ Prompt untuk Qoder AI (copy-paste langsung)

> 🧠 **Task:**
> In `index.js`, enhance the animation logic to support multiple talking animation variants instead of a single static one.
>
> ✅ Add a function called `selectAnimationVariant(text)` that:
>
> * Detects if the user’s message includes keywords like `"jelaskan"`, `"apa itu"`, `"explain"`, `"what is"`, or `"how"`.
> * If yes, returns an array `["Talking_0", "Talking_3"]`.
> * Otherwise, returns 2 randomly chosen variants from `Talking_0`–`Talking_7`.
>
> Then, after generating the Ollama response, replace this part:
>
> ```js
> const animationState = userMsg.trim() ? "Talking_3" : "Idle";
> ```
>
> with:
>
> ```js
> const animationVariants = userMsg.trim() ? selectAnimationVariant(userMsg) : ["Idle"];
> ```
>
> Finally, in the response JSON, replace `animation: animationState` with:
>
> ```js
> animations: animationVariants
> ```
>
> ⚙️ **Important:**
>
> * Do not modify the TTS, FFmpeg, or Rhubarb pipeline.
> * Keep all other logic identical.
> * The goal is to make the backend return a *list of animation names* (e.g., `["Talking_0", "Talking_3"]`) instead of a single one.

