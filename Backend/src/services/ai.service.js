const { GoogleGenAI } = require("@google/genai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Anthropic = require("@anthropic-ai/sdk");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// For vision processing, use Claude which has reliable vision support
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Claude for vision analysis
const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
Eh bhai, mera naam hai Bodhi, aur main hoon ek super helpful AI with a playful tone and a full-on Punjabi accent! Main hamesha mazzaak karta hoon, thoda fun add karta hoon answers mein, jaise ghar ka yaar. Har question pe accurate aur useful jawab deta hoon, lekin playful reh ke, 'yaar', 'bhai', 'koi gal nahi' jaise words use kar ke. Conversation history se relevant info use kar, warna ignore kar de. Always make it fun, jaise Punjabi party mein baat kar rahe ho! lekin yaad rakhna, main hamesha helpful aur informative rahunga, bas thoda fun ke saath! aur haan agar user angrezi mein baat kare, toh main usi language mein reply karunga, punjabi chod ke, taki conversation smooth rahe. Toh bas, pooch lo apne sawaal, main hoon na, Bodhi, ready to help with a smile and a bit of masti!

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

async function generateImageInsights({ imageBase64, imageType, caption = "" }) {
  async function generateImageInsights({
    imageBase64,
    imageType,
    caption = "",
  }) {
    try {
      console.log("[AI_SERVICE] Starting generateImageInsights...");
      console.log("[AI_SERVICE] Base64 length:", imageBase64?.length || 0);
      console.log("[AI_SERVICE] Image type:", imageType);

      // Clean the base64
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(",")) {
        cleanBase64 = imageBase64.split(",")[1];
      }
      cleanBase64 = cleanBase64.trim();

      console.log("[AI_SERVICE] Cleaned base64 length:", cleanBase64.length);

      // TRY CLAUDE VISION FIRST (most reliable)
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          console.log("[AI_SERVICE] Attempting Claude Vision...");

          const response = await claude.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: imageType || "image/jpeg",
                      data: cleanBase64,
                    },
                  },
                  {
                    type: "text",
                    text: `You are Bodhi, a playful AI with Punjabi accent! Analyze this image:
- Main subjects/objects
- Colors and mood  
- Activities happening
- Interesting details

${caption ? `User's caption: "${caption}"` : ""}

Answer in Punjabi accent with "yaar", "bhai", etc. Keep it SHORT and FUN! (2-3 sentences max)`,
                  },
                ],
              },
            ],
          });

          const analysisText = response.content[0].text;
          if (analysisText && analysisText.trim().length > 0) {
            console.log("[AI_SERVICE] ✅ Claude Vision SUCCESS!");
            return analysisText;
          }
        } catch (claudeErr) {
          console.warn("[AI_SERVICE] Claude Vision failed, trying Gemini...");
        }
      }

      // FALLBACK TO GEMINI-1.5-FLASH
      console.log("[AI_SERVICE] Using Gemini vision as fallback...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const imageData = {
        inlineData: {
          data: cleanBase64,
          mimeType: imageType || "image/jpeg",
        },
      };

      const textData = `You are Bodhi! Quick analysis:
- Objects/subjects
- Colors & mood
- Activities
- Details

${caption ? `Caption: "${caption}"` : ""}

Punjabi accent, short & fun!`;

      const result = await model.generateContent([imageData, textData]);
      const responseText = result.response.text();

      if (responseText && responseText.trim().length > 0) {
        console.log("[AI_SERVICE] ✅ Gemini Vision SUCCESS!");
        return responseText;
      } else {
        throw new Error("Empty response");
      }
    } catch (err) {
      console.error("[AI_SERVICE] BOTH vision methods failed:", err?.message);

      const fallbackResponse = `🎨 Arre yaar! Tera image upload ho gaya successfully! 

${caption ? `Caption: "${caption}"` : "File: " + (imageType || "image")}

Par Bodhi ka vision processor abhi sirf text-based analysis kar sakta hai. Image database mein save hai! 

Agar detailed analysis chahiye toh describe kar de text mein, Bodhi expert hai text-based questions mein! 😎`;

      return fallbackResponse;
    }
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

module.exports = { generateResponse, generateImageInsights, generateVector };
