
import { GoogleGenAI, Type } from "@google/genai";
import { CartItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getShoppingInsights = async (items: CartItem[]) => {
  if (items.length === 0) return null;

  const itemsList = items.map(i => `${i.name} (Qty: ${i.cartQuantity})`).join(", ");
  const prompt = `Based on these grocery items: ${itemsList}, provide:
  1. A quick recipe idea using some of these items.
  2. Total estimated calorie count for the whole cart.
  3. One health or money saving tip for these specific items.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipeSuggestion: { type: Type.STRING },
            totalCalories: { type: Type.NUMBER },
            savingTips: { type: Type.STRING },
          },
          required: ["recipeSuggestion", "totalCalories", "savingTips"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return null;
  }
};
