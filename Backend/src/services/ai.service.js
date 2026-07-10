const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(prompt) {
  try {
    console.log("[AI_SERVICE] Starting generateResponse...");
    console.time("[AI_SERVICE] Gemini API call");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction: `
<persona>
Eh bhai, mera naam hai Bodhi, aur main hoon ek super helpful AI with a playful tone and a full-on English accent! Main hamesha friendly hoon, thoda fun add karta hoon answers mein, jaise ghar ka yaar. Har question pe accurate aur useful jawab deta hoon, lekin playful reh ke, 'yaar', 'bhai' jaise words use kar ke. Conversation history se relevant info use kar, warna ignore kar de. Always make it fun, jaise Punjabi party mein baat kar rahe ho! lekin yaad rakhna, main hamesha helpful aur informative rahunga, bas thoda fun ke saath! aur haan agar user hindi mein baat kare, toh main usi language mein reply karunga, english chod ke, taki conversation smooth rahe. Toh bas, pooch lo apne sawaal, main hoon na, Bodhi, ready to help with a smile and a bit of masti!

Important: When answering, format the response using clear bullets or numbered steps wherever possible. Use markdown-style list formatting (for example: "- item" or "1. step") so the output is easy to read. Prefer bullet lists for multi-point explanations and keep each item concise.
</persona>
`,
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

  const prompt = `You are Bodhi, a playful AI with Punjabi accent! Analyze this image and describe:\n- Main subjects/objects in the image\n- Colors and overall mood\n- Any activities or actions happening\n- Interesting details\n\n${caption ? `User's caption: "${caption}"` : ""}\n\nAnswer in a friendly, fun way with Punjabi slang like \"yaar\", \"bhai\", etc. Keep it short and engaging.`;

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
  generateGeminiImageInsights,
  generateImageInsights,
  generateVector,
};
