
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Directly utilizing process.env.API_KEY for SDK initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeRacerMood = async (bio: string, recentActivity: string): Promise<{ mood: string, color: string, analysis: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the Nitro Biometric Scanner. Analyze this racer's vibe.
      Bio: ${bio}
      Recent Activity: ${recentActivity}
      
      Return a JSON object with:
      1. 'mood': A short 2-word racer-themed mood (e.g. "Redlined & Ready", "Coolant Stable", "Turbo Lagging").
      2. 'color': A hex color representing the mood (e.g. #ff003c for aggressive, #00f3ff for calm).
      3. 'analysis': A short 15-word psychological "pit stop" analysis of their current mindset.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            color: { type: Type.STRING },
            analysis: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { mood: "Unknown Sync", color: "#666", analysis: "Biometric sensor error. Signal lost." };
  }
};

export const generateSmartReplies = async (recentMessages: string[]): Promise<string[]> => {
  try {
    const context = recentMessages.join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The following is a list of recent messages in a chat. Generate 3 short, energetic, "Fast & Furious" themed smart replies for the next message. Keep them under 5 words.
      Context:
      ${context}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating smart replies:", error);
    return ["Ride or die!", "Nitro boost activated!", "Quarter mile at a time."];
  }
};

export const getContextIntelligence = async (messages: string[]): Promise<string> => {
  try {
    const context = messages.slice(-25).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this high-speed race crew conversation and provide a punchy "Mission Briefing" summary. Focus on the current vibe, any plans mentioned, and the overall objective. Use racer terminology. Keep it under 50 words.\n\nContext:\n${context}`,
    });
    return response.text || "No signal in the context grid.";
  } catch (error) {
    return "Mission context scrambled. Sector unknown.";
  }
};

export const getDeepFileInsights = async (fileName: string, content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are the Nitro Data Forensics Engine. Perform a deep scan of the document "${fileName}". 
      Extract:
      1. Technical Specs (if any)
      2. Mission Objectives
      3. Hidden Risks
      Format as a structured report with high-octane headers. Keep it concise and professional for a race pilot.\n\nContent:\n${content}`,
    });
    return response.text || "Forensics failed. Data corrupt.";
  } catch (error) {
    return "Scanner overheated during deep file analysis.";
  }
};

export const nitroAssistantQuery = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: "You are 'Nitro AI', the ultra-fast assistant for 'Fast & Furious Chat Zone'. Your tone is high-performance, cool, and racing-oriented. You summarize group chats, translate messages into 'racer slang', and provide quick technical drift tips."
      }
    });
    return response.text || "Nitro engine stalled. Try again.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "Error connecting to Nitro Core.";
  }
};

export const translateMessage = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text into English if it's not already. If it is English, rewrite it in "Fast & Furious Racer Slang". \n\nText: "${text}"`,
    });
    return response.text || text;
  } catch (error) {
    return text;
  }
};

export const analyzeDocument = async (fileName: string, fileContent: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the Nitro Document Analyst. Analyze this document named "${fileName}". Provide a high-speed, punchy summary suitable for being read aloud by a racing pilot. Focus on the core mission objectives. Keep it under 40 words.\n\nContent: ${fileContent}`,
    });
    return response.text || "Document analysis failed. Sector data corrupt.";
  } catch (error) {
    console.error("Doc Analysis error:", error);
    return "Nitro scanner failed. Manual review required.";
  }
};

export const smartSearch = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a high-speed search analysis for this query: "${query}". Provide a concise (under 20 words), high-octane response. If it's a general question, answer as a racing expert. If it's a name, give a "racer profile" blurb.`,
      config: {
        systemInstruction: "You are the 'Nitro Search Engine'. You don't just find results, you give high-performance insights."
      }
    });
    return response.text || "No signal in this sector.";
  } catch (error) {
    return "Search engine overheated.";
  }
};

export const searchGifs = async (query: string): Promise<{url: string, title: string}[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is searching for GIFs related to: "${query}". 
      Return a JSON array of 6 objects. Each object has a 'url' (a relevant placeholder image from picsum.photos with seed based on keywords) and a 'title' (a punchy racing caption).
      Example: { "url": "https://picsum.photos/seed/burnout/300/200", "title": "Smoking Tires!" }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              url: { type: Type.STRING },
              title: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [
      { url: "https://picsum.photos/seed/race1/300/200", title: "Speed!" },
      { url: "https://picsum.photos/seed/race2/300/200", title: "Drift!" }
    ];
  }
};

export const searchEmojis = async (query: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user wants emojis related to: "${query}". Return a JSON array of 12 highly relevant emojis.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return ["🏎️", "🏁", "🔥", "💨", "⚡", "🔋", "🛠️", "🔧", "🚦", "🚔", "🕶️", "🦾"];
  }
};

export const fetchCategoryIntel = async (category: string): Promise<string> => {
  try {
    let query = "";
    switch (category) {
      case 'news': query = "Latest global breaking news and high-speed world events for today."; break;
      case 'tech': query = "Latest breakthroughs in automotive tech, AI, and performance tuning 2024."; break;
      case 'celeb': query = "Hottest celebrity gossip, VIP sightings and Hollywood track rumors."; break;
      case 'sports': query = "Real-time sporting scores, game analysis, and team performance stats for ongoing major leagues."; break;
      default: query = "General high-octane racing rumors and underground track gossip.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the Nitro Intel Hub. Provide a list of 3-4 punchy, high-octane bullet points summarizing the requested category intel. Be specific, use real-world data from the grounding results. Format each point with a bold title and a short description."
      }
    });

    return response.text || "Intel uplink failed. Sector silent.";
  } catch (error) {
    console.error("Gossip Fetch Error:", error);
    return "Error scanning grid for live data.";
  }
};

export const summarizeChat = async (messages: string[]): Promise<string> => {
    try {
      const context = messages.slice(-20).join("\n");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following chat conversation in a single punchy "Pit Stop Report" sentence: \n ${context}`,
      });
      return response.text || "No summary available.";
    } catch (error) {
      return "Unable to summarize at high speed.";
    }
}
