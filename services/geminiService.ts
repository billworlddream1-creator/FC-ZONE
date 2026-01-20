
import { GoogleGenAI, Type } from "@google/genai";

// Directly utilizing process.env.API_KEY for SDK initialization
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

export const smartZoneQuery = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform the following task at high velocity:
      Input: "${query}"
      
      Tasks supported: 
      - Solve Math: Show steps clearly.
      - Solve Riddle: Provide the answer and a brief explanation.
      - Word Check: Check if written or spoken correctly, fix any spelling/grammar, and verify pronunciation phonetically if requested.
      
      Format as a concise, high-octane "Solution Briefing". Use Nitro/Racing metaphors where possible.`,
    });
    return response.text || "Smart Zone processing failed.";
  } catch (e) {
    return "Smart Zone logic engine overheated.";
  }
};

export const fetchLiveSportsData = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Find real-time sports scores for major matches happening right now or recently. Include details like attacking performance, goals/points, and current match status. Format as a clean list for a racing HUD.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "No live matches detected in the grid.";
  } catch (e) {
    return "Uplink to Sports Arena interrupted.";
  }
};

export const generateNitroBotResponse = async (history: string[], lastUserMessage: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `You are "Nitro Bot", a high-performance AI assistant in a racing chat app. You are helpful, cool, and use racing metaphors.
            
            Conversation History:
            ${history.slice(-5).join("\n")}
            
            User just said: "${lastUserMessage}"
            
            Respond directly to the user. Keep it under 2 sentences. Be helpful but cool.`,
        });
        return response.text || "Ignition failure. Say again?";
    } catch (e) {
        return "Nitro Bot system overload.";
    }
};

export const refineDraftMessage = async (draft: string, intent: 'fix' | 'translate' | 'style'): Promise<string> => {
    try {
        let prompt = "";
        if (intent === 'fix') prompt = `Fix grammar and spelling for this text, keep it concise: "${draft}"`;
        if (intent === 'translate') prompt = `Translate this text to English (or to Spanish if already English): "${draft}"`;
        if (intent === 'style') prompt = `Rewrite this text to sound like a Fast & Furious street racer (cool, slang, energetic): "${draft}"`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text?.replace(/^"|"$/g, '') || draft;
    } catch (e) {
        return draft;
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

export const analyzeSentimentAndStyle = async (text: string): Promise<{ mood: string, style: string, intent: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following text message for a high-speed racing context.
      Input: "${text}"
      
      Return a JSON object with:
      1. mood: One word emotion (e.g. "Aggressive", "Calm", "Panicked").
      2. style: Typing style description (e.g. "Rapid Fire", "Hesitant", "Precise").
      3. intent: The underlying goal (e.g. "Challenge", "Information", "Support").
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            style: { type: Type.STRING },
            intent: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { mood: "Unknown", style: "Encrypted", intent: "Hidden" };
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: "Transcribe this audio message. Return only the transcription text." }
        ]
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Transcription error:", e);
    return "";
  }
};

export const generateOfflineReply = async (senderName: string, recipientName: string, lastMessage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are simulating an offline auto-responder for "${recipientName}". "${senderName}" just sent: "${lastMessage}".
        Generate a short, cool, in-character message saying that ${recipientName} is currently offline/racing/busy but the system has logged the message. Use "Fast & Furious" style slang. Do not add quotes.`,
    });
    return response.text || `${recipientName} is offline. Message cached.`;
  } catch (e) {
      return "User offline. System acknowledgment.";
  }
};

export const analyzeDocument = async (fileName: string, fileData: string, mimeType?: string): Promise<string> => {
  try {
    let contents: any;

    if (mimeType && (mimeType.includes('pdf') || mimeType.includes('image'))) {
        contents = {
            parts: [
                { text: `You are the Nitro Document Analyst. Analyze this file named "${fileName}". Provide a high-speed, punchy summary suitable for being read aloud by a racing pilot. Focus on the core mission objectives or data points. Keep it under 50 words.` },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: fileData
                    }
                }
            ]
        };
    } else {
        contents = `You are the Nitro Document Analyst. Analyze this document named "${fileName}". Provide a high-speed, punchy summary suitable for being read aloud by a racing pilot. Focus on the core mission objectives. Keep it under 40 words.\n\nContent: ${fileData}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
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
      contents: `Perform a high-speed search analysis for this query: "${query}". Provide a concise (under 40 words), high-octane response. Use racer terminology. Include grounding facts if possible.`,
      config: {
        tools: [{ googleSearch: {} }],
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

export const performWebSearch = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the Nitro Web Scanner. Perform a Google Search for the user query. Extract the most relevant result and present it as a concise, high-tech intelligence briefing. Keep it under 40 words. If multiple links found, just give the top summary."
      }
    });
    return response.text || "Search grid offline. No data found.";
  } catch (error) {
    return "Connection blocked by firewall. Search failed.";
  }
};

/**
 * Interprets a natural language command from the racer and maps it to a system action.
 * Supports toggling sound, reading messages, starting calls, setting alarms, and toggling stealth mode.
 */
export const interpretUserCommand = async (query: string): Promise<{ action: string, params?: any, feedback: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the 'Nitro Crew Chief' terminal. Interpret the following command: "${query}"
      
      Actions available:
      1. TOGGLE_SOUND: params { state: boolean } - Enable/disable system audio.
      2. READ_LAST_MESSAGE: no params - Read the latest transmission.
      3. START_CALL: params { targetName: string } - Open comms with another racer.
      4. SET_ALARM: params { time: string } - Set a countdown or reminder.
      5. TOGGLE_STEALTH: params { state: boolean } - Enable/disable low-profile mode.
      
      Return a JSON object with 'action', optional 'params', and a 'feedback' message in racer slang.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            params: {
              type: Type.OBJECT,
              properties: {
                state: { type: Type.BOOLEAN },
                targetName: { type: Type.STRING },
                time: { type: Type.STRING }
              }
            },
            feedback: { type: Type.STRING }
          },
          required: ["action", "feedback"]
        }
      }
    });
    return JSON.parse(response.text || '{"action": "UNKNOWN", "feedback": "Signal scrambled. Repeat command."}');
  } catch (error) {
    return { action: "UNKNOWN", feedback: "Terminal uplink failed. Manual override required." };
  }
};
