const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(prompt) {
  try {
    console.log("[AI_SERVICE] Starting generateResponse...");
    console.time("[AI_SERVICE] Gemini API call");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    console.time("[AI_SERVICE] Gemini image analysis call");

    const sanitizedBase64 = imageBase64.replace(/^data:.*;base64,/, "").trim();

    const prompt = `Analyze the uploaded image and provide a clear, structured response with meaningful insights. Include:
- A short summary of the scene or subject
- Visible objects, activities, or environments
- Any likely emotional tone, purpose, or context
- Practical observations, recommendations, or interesting details
${caption ? `\n- Caption: "${caption}"` : ""}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image",
              data: sanitizedBase64,
              mime_type: imageType || "image/png",
              resolution: "high",
            },
          ],
        },
      ],
      config: {
        temperature: 0.35,
        response_modalities: ["text"],
        systemInstruction: `You are a helpful assistant that analyzes user images. Provide concise and useful insights in bullet or numbered list form.`,
      },
    });

    console.timeEnd("[AI_SERVICE] Gemini image analysis call");
    console.log(
      "[AI_SERVICE] Gemini image response received:",
      response?.text?.substring(0, 50) || "EMPTY",
    );

    if (!response?.text) {
      console.error(
        "[AI_SERVICE] Invalid image response from Gemini:",
        JSON.stringify(response),
      );
      throw new Error("Gemini returned empty image analysis response");
    }

    return response.text;
  } catch (err) {
    console.error("[AI_SERVICE] Error in generateImageInsights:", err.message);
    throw err;
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
