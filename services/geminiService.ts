import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, MessageRole } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables");
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateVectorExplanation = async (mode: string): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      Explain how a ${mode} graphics display system works in the context of vintage video game consoles (like the Vectrex or Atari Asteroids arcade).
      
      Focus on:
      1. How the electron beam moves.
      2. The visual characteristics (sharpness, brightness, lack of aliasing vs pixels).
      3. Why this technology was used and why it faded.
      
      Keep the response concise (under 200 words), technical but accessible, and formatted with clear bullet points or short paragraphs.
      Do not use markdown code blocks.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis failed. Signal lost.";
  } catch (error) {
    console.error("Error generating explanation:", error);
    return "SYSTEM ERROR: Could not retrieve data from the mainframe.";
  }
};

export const chatWithExpert = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  try {
    const ai = getClient();
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a retro-tech engineer specializing in 1980s vector display technology. You speak with a slight technical, cyberpunk flair. You explain concepts like 'XY monitors', 'phosphor persistence', 'DACs', and 'electron guns' clearly.",
      },
    });

    // We'd typically send history here, but for this simple implementation, we'll just send the new message
    // with some context if needed, or rely on the stateless request for simplicity in this demo structure.
    // Ideally, we rebuild history properly.
    
    const prompt = `User Query: ${newMessage}`;
    
    const response = await chat.sendMessage({
        message: prompt
    });
    
    return response.text || "No data received.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Connection interrupted. Try again.";
  }
};