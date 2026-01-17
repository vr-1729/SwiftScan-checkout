
import { GoogleGenAI, Type } from "@google/genai";
import { CartItem, GroundingSource } from "../types";

// Always initialize with process.env.API_KEY directly as per guidelines
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getShoppingInsights = async (items: CartItem[]) => {
  if (items.length === 0) return null;
  const ai = getAi();
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
            recipeSuggestion: { 
              type: Type.STRING,
              description: 'A quick recipe suggestion using the items.'
            },
            totalCalories: { 
              type: Type.NUMBER,
              description: 'The estimated total calories in the cart.'
            },
            savingTips: { 
              type: Type.STRING,
              description: 'Money or health saving tips for these items.'
            },
          },
          propertyOrdering: ["recipeSuggestion", "totalCalories", "savingTips"],
        }
      }
    });
    // Use .text property directly (not a method) as required
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return null;
  }
};

export const editImageWithPrompt = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
    });
    // Iterate through response parts to find the image part as recommended
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (error) {
    console.error("Image Edit Error:", error);
    return null;
  }
};

export const generateVeoVideo = async (base64Image: string, onProgress: (msg: string) => void): Promise<string | null> => {
  // Create a new instance right before the call to ensure up-to-date API key
  const ai = getAi();
  try {
    onProgress("Initializing Veo engine...");
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: 'Animate this grocery item in a professional commercial style with cinematic lighting',
      image: {
        imageBytes: base64Image.split(',')[1] || base64Image,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    onProgress("Processing video frames...");
    while (!operation.done) {
      // Re-query the operation status as per guidelines
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      onProgress("Rendering magic... " + (Math.random() * 100).toFixed(0) + "%");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;
    // Append API key when fetching from the download link
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Veo Video Error:", error);
    return null;
  }
};

export const groundedSearchQuery = async (query: string): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: { tools: [{ googleSearch: {} }] },
    });
    // Extract grounding chunks as required when using search grounding
    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web)
      .map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || [];
    return { text: response.text || "No response.", sources };
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return { text: "Failed to search information.", sources: [] };
  }
};

export const groundedMapsQuery = async (query: string, location?: { lat: number, lng: number }): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = getAi();
  try {
    const config: any = { tools: [{ googleMaps: {} }] };
    if (location) {
      config.toolConfig = { retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } } };
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config
    });
    // Extract grounding chunks as required when using maps grounding
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter((c: any) => c.maps)
      .map((c: any) => ({ title: c.maps.title || "Map Location", uri: c.maps.uri })) || [];
    return { text: response.text || "No response.", sources };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Failed to fetch map data.", sources: [] };
  }
};
