const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Detect language from text (English or Hindi)
function detectLanguage(text) {
  if (!text) return "english";

  // Hindi Unicode ranges
  const hindiUnicodePattern = /[\u0900-\u097F]/g;
  const hindiMatches = text.match(hindiUnicodePattern);
  const hindiCount = hindiMatches ? hindiMatches.length : 0;

  // English ASCII characters
  const englishPattern = /[a-zA-Z]/g;
  const englishMatches = text.match(englishPattern);
  const englishCount = englishMatches ? englishMatches.length : 0;

  // If more than 30% Hindi characters, respond in Hindi
  const totalChars = hindiCount + englishCount;
  if (totalChars > 0 && hindiCount / totalChars > 0.3) {
    return "hindi";
  }

  return "english";
}

// Get system instruction based on language
function getSystemInstruction(language = "english") {
  if (language === "hindi") {
    return `
<persona>
मेरा नाम है Bodhi, एक मददगार और मज़ेदार AI असिस्टेंट। मैं हर सवाल का सटीक और उपयोगी जवाब देता हूँ। मैं दोस्ताना अंदाज़े में बात करता हूँ और हिंदी में सहज भाषा का इस्तेमाल करता हूँ। मैं हमेशा स्पष्ट और सहायक होता हूँ।

महत्वपूर्ण: जब भी संभव हो, अपने उत्तर को बुलेट पॉइंट्स या नंबर की हुई सूची में प्रस्तुत करें। मार्कडाउन शैली का उपयोग करें (जैसे: "- बिंदु" या "1. पद") ताकि पढ़ना आसान हो।
</persona>
`;
  }

  return `You are Bodhi, a helpful AI assistant. 

**CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS:**
- Respond ONLY in English. 100% English. No exceptions.
- Do NOT use Hindi, Punjabi, Urdu, or any other language.
- Do NOT mix languages.
- Do NOT use Hindustani or local dialect.
- Every single word must be in proper English.

When answering:
- Use clear bullet points or numbered lists when helpful
- Keep formatting simple and readable
- Always be accurate and helpful
- Use only standard English words and phrases

Example good responses:
- "Express.js is a web application framework for Node.js."
- "Here are the key features: 1. Lightweight 2. Flexible 3. Minimalist"

Example BAD responses (NEVER do this):
- "Oye hoye, Express.js baare..." (NO - this is Punjabi)
- "Arre bhai, Express hai..." (NO - this is Hindustani)
- "Haan, toh Express.js..." (NO - this is mixed language)

You MUST respond only in English.`;
}

async function generateResponse(prompt) {
  try {
    console.log("[AI_SERVICE] Starting generateResponse...");

    // Detect language from the prompt
    let userLanguage = "english";
    if (Array.isArray(prompt) && prompt.length > 0) {
      const lastMessage = prompt[prompt.length - 1];
      if (lastMessage.parts && lastMessage.parts[0]?.text) {
        userLanguage = detectLanguage(lastMessage.parts[0].text);
        console.log(
          "[AI_SERVICE] Detected language in generateResponse:",
          userLanguage,
        );
      }
    }

    console.time("[AI_SERVICE] Gemini API call");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction: getSystemInstruction(userLanguage),
      },
    });
    console.timeEnd("[AI_SERVICE] Gemini API call");

    let responseText = response?.text;
    console.log(
      "[AI_SERVICE] Gemini response received:",
      responseText?.substring(0, 50) || "EMPTY",
    );

    if (!responseText) {
      console.error(
        "[AI_SERVICE] Invalid response from Gemini:",
        JSON.stringify(response),
      );
      throw new Error("Gemini returned empty response");
    }

    // If English was requested, filter out any non-English responses
    if (userLanguage === "english") {
      // Check if response contains Devanagari, Gurmukhi, or other non-Latin scripts
      const nonLatinPattern = /[\u0900-\u097F\u0A00-\u0A7F\u0600-\u06FF]/g;
      const hasNonLatin = nonLatinPattern.test(responseText);

      if (hasNonLatin) {
        console.warn(
          "[AI_SERVICE] Response contains non-Latin characters, re-requesting in English...",
        );
        const retryResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            ...prompt,
            {
              role: "user",
              parts: [
                {
                  text: "Please respond ONLY in English. No Hindi, Punjabi, or any other language. Reply to the question in pure English only.",
                },
              ],
            },
          ],
          config: {
            temperature: 0.5,
            systemInstruction:
              "You MUST respond only in English. No other languages allowed.",
          },
        });
        responseText = retryResponse?.text || responseText;
        console.log("[AI_SERVICE] Retry response received");
      }
    }

    return responseText;
  } catch (err) {
    console.error("[AI_SERVICE] Error in generateResponse:", err.message);
    throw err;
  }
}

// Streaming response with language detection
async function generateResponseStream(prompt, onChunk) {
  try {
    console.log("[AI_SERVICE] Starting generateResponseStream...");

    // Detect language from the last user message
    let userLanguage = "english";
    if (Array.isArray(prompt) && prompt.length > 0) {
      const lastMessage = prompt[prompt.length - 1];
      if (lastMessage.parts && lastMessage.parts[0]?.text) {
        userLanguage = detectLanguage(lastMessage.parts[0].text);
        console.log("[AI_SERVICE] Detected language:", userLanguage);
      }
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction: getSystemInstruction(userLanguage),
      },
    });

    console.log("[AI_SERVICE] Stream started, reading chunks...");
    let fullResponse = "";

    for await (const chunk of stream) {
      const chunkText = chunk?.text || "";
      if (chunkText) {
        fullResponse += chunkText;
        console.log("[AI_SERVICE] Received chunk:", chunkText.substring(0, 30));
        if (onChunk) {
          onChunk(chunkText);
        }
      }
    }

    console.log(
      "[AI_SERVICE] ✅ Stream completed. Total length:",
      fullResponse.length,
    );

    // If English was requested, verify response doesn't contain non-Latin scripts
    if (userLanguage === "english") {
      const nonLatinPattern = /[\u0900-\u097F\u0A00-\u0A7F\u0600-\u06FF]/g;
      const hasNonLatin = nonLatinPattern.test(fullResponse);

      if (hasNonLatin) {
        console.warn(
          "[AI_SERVICE] Stream response contains non-Latin characters, was supposed to be English",
        );
      }
    }

    return fullResponse;
  } catch (err) {
    console.error("[AI_SERVICE] Error in generateResponseStream:", err.message);
    throw err;
  }
}

async function generateGeminiImageInsights({
  imageBase64,
  imageType,
  caption = "",
}) {
  console.log("[AI_SERVICE] Starting generateGeminiImageInsights...");
  console.log("[AI_SERVICE] Base64 length:", imageBase64?.length || 0);
  console.log("[AI_SERVICE] Image type:", imageType);

  // Clean the base64
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(",")) {
    cleanBase64 = cleanBase64.split(",")[1];
  }
  cleanBase64 = cleanBase64.trim();

  console.log("[AI_SERVICE] Cleaned base64 length:", cleanBase64.length);

  const prompt = `You are Bodhi, a playful AI with english accent! Analyze this image and describe:\n- Main subjects/objects in the image\n- Colors and overall mood\n- Any activities or actions happening\n- Interesting details\n\n${caption ? `User's caption: "${caption}"` : ""}\n\nAnswer in a friendly, fun way with slang like \"yaar\", \"bhai\", etc. Keep it short and engaging.`;

  console.log("[AI_SERVICE] Sending image to Gemini 2.5 flash for analysis...");
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: imageType || "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    config: {
      temperature: 0.7,
    },
  });

  const responseText = response?.text || response?.output_text;
  console.log(
    "[AI_SERVICE] Gemini image response length:",
    responseText?.length,
  );

  if (responseText && responseText.trim().length > 0) {
    console.log("[AI_SERVICE] ✅ Gemini image analysis SUCCESSFUL!");
    return responseText;
  }

  console.log(
    "[AI_SERVICE] Gemini response object:",
    JSON.stringify(response).substring(0, 1000),
  );
  throw new Error("Empty response from Gemini image analysis");
}

async function generateImageInsights({ imageBase64, imageType, caption = "" }) {
  try {
    return await generateGeminiImageInsights({
      imageBase64,
      imageType,
      caption,
    });
  } catch (err) {
    console.error(
      "[AI_SERVICE] generateImageInsights fallback due to error:",
      err?.message || err,
    );
    const fallbackResponse = `🎨 Arre yaar! Tera image upload ho gaya successfully! \n\n${caption ? `Caption: "${caption}"` : ""}\n\nPar visual analysis abhi thoda issue hai. Image safe hai and database mein save ho gaya hai. Agar detailed analysis chahiye, text se pooch le, Bodhi ready hai! 😎`;
    return fallbackResponse;
  }
}

async function generateVector(content) {
  try {
    console.log("[AI_SERVICE] Generating vector for content...");
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: content,
      config: {
        outputDimensionality: 768, // Must match Pinecone index dimension
      },
    });
    console.log("[AI_SERVICE] Vector generated successfully");
    if (
      response &&
      Array.isArray(response.embeddings) &&
      response.embeddings[0] &&
      Array.isArray(response.embeddings[0].values) &&
      response.embeddings[0].values.length > 0
    ) {
      return response.embeddings[0].values;
    } else {
      console.error("Gemini embedding API returned invalid response", response);
      return null;
    }
  } catch (err) {
    console.error("Error generating vector from Gemini API:", err.message);
    return null; // Return null instead of throwing, so it doesn't block the flow
  }
}

// Text -> Image generation using Google Generative REST endpoint
async function generateGeminiImages(options = {}) {
  const {
    prompt,
    size = "1024x1024",
    count = 1,
    model = "imagen-3-fast",
  } = options;

  console.log("[AI_SERVICE] generateGeminiImages called", {
    prompt,
    size,
    count,
    model,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");

  let fetchFn = null;
  try {
    const nf = await import("node-fetch");
    fetchFn = nf.default;
  } catch (e) {
    if (typeof globalThis.fetch === "function") fetchFn = globalThis.fetch;
  }

  if (!fetchFn)
    throw new Error("No fetch implementation available (install node-fetch)");

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages`;

  const body = {
    prompt: String(prompt || ""),
  };

  console.log("[AI_SERVICE] Image API URL:", apiUrl);
  console.log("[AI_SERVICE] Image API request body:", JSON.stringify(body));

  const res = await fetchFn(`${apiUrl}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("[AI_SERVICE] Image API response status:", res.status);
  console.log(
    "[AI_SERVICE] Image API response (first 500 chars):",
    text.substring(0, 500),
  );

  if (!res.ok) {
    console.error(
      "[AI_SERVICE] Image API error:",
      res.status,
      text.substring(0, 500),
    );
    throw new Error(
      `Image API error: ${res.status} - ${text.substring(0, 200)}`,
    );
  }

  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("[AI_SERVICE] Failed to parse image API response", e);
    throw new Error("Invalid image API response");
  }

  const images = [];
  console.log("[AI_SERVICE] Parsed API response data keys:", Object.keys(data));

  if (data?.candidates && Array.isArray(data.candidates)) {
    console.log(
      "[AI_SERVICE] Found candidates array, length:",
      data.candidates.length,
    );
    for (const c of data.candidates) {
      if (c?.image?.imageBytes) {
        images.push(`data:image/png;base64,${c.image.imageBytes}`);
      } else if (c?.image?.b64) {
        images.push(`data:image/png;base64,${c.image.b64}`);
      } else if (typeof c === "string" && c.trim()) {
        images.push(c.trim());
      }
    }
  }

  if (images.length === 0 && data?.image?.imageBytes) {
    console.log("[AI_SERVICE] Found image.imageBytes");
    images.push(`data:image/png;base64,${data.image.imageBytes}`);
  }

  if (images.length === 0 && data?.image?.b64) {
    console.log("[AI_SERVICE] Found image.b64");
    images.push(`data:image/png;base64,${data.image.b64}`);
  }

  if (images.length === 0 && data?.images && Array.isArray(data.images)) {
    console.log("[AI_SERVICE] Found images array, length:", data.images.length);
    for (const img of data.images) {
      if (img.bytesBase64)
        images.push(`data:image/png;base64,${img.bytesBase64}`);
      else if (img.b64) images.push(`data:image/png;base64,${img.b64}`);
      else if (typeof img === "string" && img.trim()) images.push(img.trim());
    }
  }

  if (
    images.length === 0 &&
    typeof data?.image === "string" &&
    data.image.trim()
  ) {
    console.log("[AI_SERVICE] Found string image data");
    images.push(data.image.trim());
  }

  console.log("[AI_SERVICE] Total images extracted:", images.length);

  if (images.length === 0) {
    console.error(
      "[AI_SERVICE] No images returned from API. Full response:",
      JSON.stringify(data),
    );
    throw new Error("No images returned from image API");
  }

  return images.slice(0, count);
}

module.exports = {
  generateResponse,
  generateResponseStream,
  generateGeminiImageInsights,
  generateImageInsights,
  generateGeminiImages,
  generateVector,
  detectLanguage,
};
