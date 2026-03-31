require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

async function listModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const models = await ai.models.list();
    console.log("Your available models:");
    models.forEach((m) => console.log(`- ${m.name}`));
  } catch (err) {
    console.error("Error listing models:", err.message);
  }
}

listModels();
