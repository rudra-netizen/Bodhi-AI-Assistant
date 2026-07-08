const { GoogleGenAI } = require("@google/genai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// For vision processing, use the alternative SDK which has better vision support
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    // Use gemini-pro-vision model with @google/generative-ai SDK
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: imageType || "image/jpeg",
      },
    };

    const prompt = `You are Bodhi, a playful AI with Punjabi accent! Analyze this image:
- Main subjects/objects
- Colors and mood
- Activities or actions
- Interesting details

${caption ? `User's caption: "${caption}"` : ""}

Answer in friendly way with Punjabi slang (yaar, bhai, etc). Keep it short and fun!`;

    console.log("[AI_SERVICE] Sending to gemini-pro-vision...");

    const result = await model.generateContent([imagePart, prompt]);
    const response = await result.response;
    const text = response.text();

    console.log("[AI_SERVICE] Got response:", !!text && text.length > 0);

    if (text && text.trim().length > 0) {
      console.log("[AI_SERVICE] Vision analysis successful!");
      return text;
    } else {
      throw new Error("Empty response from vision API");
    }
  } catch (err) {
    console.error(
      "[AI_SERVICE] Vision analysis failed:",
      err?.message || JSON.stringify(err),
    );
    console.error("[AI_SERVICE] Full error details:", err);

    // Fallback: Generic response indicating image was received
    const fallbackResponse = `🎨 Arre yaar! Tera image upload ho gaya successfully! 

${caption ? `Caption: "${caption}"` : ""}

Par visual analysis abhi beta features mein hai - thoda technical issue. Image safe and sound database mein save hai! 

Agar anything else ask karna ho, bas likha kar. Main text-based questions mein expert hoon! 😎`;

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

module.exports = { generateResponse, generateImageInsights, generateVector };
