import { GoogleGenAI, Type } from '@google/genai';
import { AiMealAnalysisResult } from '@mindful-plate/shared';
import { env } from '../../config/env';

export class GeminiService {
  private client: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  /**
   * Parse natural language description of food into structured items and macros.
   */
  async parseFoodText(textPrompt: string): Promise<AiMealAnalysisResult> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const systemPrompt = `You are a clinical dietitian nutrition analysis AI. 
Analyze the user's meal description and output the estimated nutritional breakdown for each item in the plate/meal.
Break down composite dishes into key ingredients or standard portions. Be realistic with calorie and macronutrient values.
Always return response adhering strictly to the JSON schema.`;

    const response = await this.client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { text: `${systemPrompt}\n\nUser meal description: "${textPrompt}"` }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                  fiber: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
            totalCalories: { type: Type.NUMBER },
            totalProtein: { type: Type.NUMBER },
            totalCarbs: { type: Type.NUMBER },
            totalFat: { type: Type.NUMBER },
            confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            notes: { type: Type.STRING },
          },
          required: ['items', 'totalCalories', 'totalProtein', 'totalCarbs', 'totalFat', 'confidence'],
        },
      },
    });

    const content = response.text();
    if (!content) {
      throw new Error('No output received from Gemini model.');
    }

    return JSON.parse(content) as AiMealAnalysisResult;
  }

  /**
   * Analyze food image with multimodal vision and output structured items and macros.
   */
  async parseFoodImage(imageBuffer: Buffer, mimeType: string): Promise<AiMealAnalysisResult> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const systemPrompt = `You are a clinical dietitian nutrition analysis AI.
Analyze this meal photo. Identify all discernible food items, estimate portion sizes/weights, and calculate calorie and macronutrient (protein, carbs, fat) breakdown.
Always return response adhering strictly to the JSON schema.`;

    const base64Data = imageBuffer.toString('base64');

    const response = await this.client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                  fiber: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
            totalCalories: { type: Type.NUMBER },
            totalProtein: { type: Type.NUMBER },
            totalCarbs: { type: Type.NUMBER },
            totalFat: { type: Type.NUMBER },
            confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            notes: { type: Type.STRING },
          },
          required: ['items', 'totalCalories', 'totalProtein', 'totalCarbs', 'totalFat', 'confidence'],
        },
      },
    });

    const content = response.text();
    if (!content) {
      throw new Error('No output received from Gemini model.');
    }

    return JSON.parse(content) as AiMealAnalysisResult;
  }
}

export const geminiService = new GeminiService();
