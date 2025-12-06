
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FixItResponse, ChatMessage, DetectedItem } from "../types";

const SYSTEM_INSTRUCTION_REPAIR = `
You are FixIt AI, a world-class expert mechanic, technician, and handyman.
Your goal is to analyze images or videos of broken objects, appliances, or scenarios and provide actionable, safe repair advice.

Analyze the user's input (image or video) and identify:
1. The Problem: What is broken or wrong.
2. The Root Cause: Why it happened.
3. Safety First: Critical safety warnings (electricity, sharp edges, heat, etc.).
4. Tools Needed: A list of specific tools required.
5. The Fix: Step-by-step instructions.
6. Visual Guide: A descriptive guide of what to look for, using text markup (e.g., "Look for the [Red Wire] connected to the [Blue Terminal]").

Keep instructions simple, practical, and tailored to the exact scenario shown.
If the image is unclear, provide general troubleshooting steps for what appears to be the object.
`;

const SYSTEM_INSTRUCTION_SUPPORT = `
You are the friendly AI Support Assistant for the "FixIt AI" web application.
Your role is to help users navigate and use the app features correctly.

App Features & Capabilities:
1. Upload: Users can drag & drop, paste (Ctrl+V), or browse to upload images/videos of broken items.
2. Camera: Users can use the "Use Camera" button to take photos directly.
3. Item Detection: When an image is uploaded, the app scans it to find specific repairable items.
4. Repair Guides: We generate step-by-step fixes, tool lists, and safety warnings using advanced AI.
5. History: Previous analyses are saved in the sidebar menu.
6. Theme: Users can toggle between Dark and Light mode.

Common Troubleshooting:
- "Upload failed": Check internet connection, ensure file is <20MB, supported formats are JPG, PNG, MP4.
- "Camera not working": Check browser permissions (allow camera access) or try a different browser.
- "Analysis inaccurate": Suggest taking a clearer photo with better lighting or selecting the specific item correctly.

Tone: Helpful, concise, friendly, and tech-savvy.
Limitations: You are here to help with APP USAGE. If the user asks how to fix a specific physical object (e.g., "how to fix my toaster"), politely guide them to UPLOAD A PHOTO of it so the main FixIt AI can analyze it. Do not try to repair objects in this chat.
`;

const RESPONSE_SCHEMA_REPAIR: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short, catchy title for the repair task" },
    problemDescription: { type: Type.STRING, description: "Clear identification of the problem seen in the media" },
    rootCause: { type: Type.STRING, description: "Explanation of why this failure likely occurred" },
    safetyWarnings: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Crucial safety warnings to read before starting" 
    },
    toolsNeeded: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of tools and materials required"
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER },
          instruction: { type: Type.STRING, description: "The main action to take" },
          detail: { type: Type.STRING, description: "Additional helpful details or tips for this step" }
        },
        required: ["step", "instruction", "detail"]
      },
      description: "Ordered list of repair steps"
    },
    visualGuide: {
      type: Type.STRING,
      description: "A text-based description identifying key parts in the image/video to focus on."
    }
  },
  required: ["title", "problemDescription", "rootCause", "safetyWarnings", "toolsNeeded", "steps", "visualGuide"]
};

// Schema for Item Detection
const RESPONSE_SCHEMA_DETECTION: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING, description: "Name of the object or scenario (e.g., 'Washing Machine', 'Leaky Faucet')" },
          description: { type: Type.STRING, description: "Brief description of the observed state or context." }
        },
        required: ["id", "name", "description"]
      }
    }
  },
  required: ["items"]
};

export const detectItems = async (base64Data: string, mimeType: string): Promise<DetectedItem[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "Identify the distinct objects, appliances, or repair scenarios visible in this image. List them so the user can choose which one to fix. Provide 3-5 distinct items max." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA_DETECTION
      }
    });

    const parsed = JSON.parse(response.text || '{ "items": [] }');
    return parsed.items || [];
  } catch (error) {
    console.error("Detection Error:", error);
    throw error;
  }
};

export const analyzeMedia = async (base64Data: string, mimeType: string, focusContext?: string): Promise<FixItResponse> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found in environment variables");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Customize prompt based on user selection
    const prompt = focusContext 
      ? `Analyze the image focusing specifically on this item: "${focusContext}". Provide a detailed repair guide for this specific problem.`
      : "Analyze this and provide a repair guide.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_REPAIR,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA_REPAIR
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(text) as FixItResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const getChatResponse = async (
  currentContext: FixItResponse,
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  // Construct system instruction with the context of the current repair
  const contextInstruction = `
    You are FixIt AI. You have just provided a repair guide to the user.
    
    Current Repair Context:
    Title: ${currentContext.title}
    Problem: ${currentContext.problemDescription}
    Steps: ${currentContext.steps.map(s => `${s.step}. ${s.instruction}`).join(' ')}
    
    Answer the user's follow-up questions specifically about this repair. 
    Keep answers concise, helpful, and safety-conscious.
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: contextInstruction,
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "I couldn't generate a response.";
};

// New function for general App Support Chat
export const getSupportChatResponse = async (
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_SUPPORT,
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "I'm having trouble connecting right now. Please try again later.";
};
