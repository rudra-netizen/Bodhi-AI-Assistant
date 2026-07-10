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

  return `
<persona>
Hello! I'm Bodhi, a helpful and friendly AI assistant. I provide accurate and useful answers to all questions. I communicate in a warm and approachable manner using clear English. I'm always ready to help and support you.

Important: When answering, format the response using clear bullets or numbered steps wherever possible. Use markdown-style list formatting (for example: "- item" or "1. step") so the output is easy to read. Prefer bullet lists for multi-point explanations and keep each item concise.
</persona>
`;
}

async function generateResponse(prompt) {
  try {
    console.log("[AI_SERVICE] Starting generateResponse...");
    console.time("[AI_SERVICE] Gemini API call");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction: getSystemInstruction("english"),
      },
    });
    console.timeEnd("[AI_SERVICE] Gemini API call");

    console.log(
      "[AI_SERVICE] Gemini response received:",
      response?.text?.substring(0, 50) || "EMPTY",
    );
    if (!response?.text) {
      console.error(
        "[AI_SERVICE] Invalid response from Gemini:",
        JSON.stringify(response),
      );
      throw new Error("Gemini returned empty response");
    }
    return response.text;
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

module.exports = {
  generateResponse,
  generateResponseStream,
  generateGeminiImageInsights,
  generateImageInsights,
  generateVector,
  detectLanguage,
};
