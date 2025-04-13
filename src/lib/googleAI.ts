import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

if (!API_KEY) {
  throw new Error('Missing VITE_GOOGLE_AI_API_KEY environment variable');
}

export const genAI = new GoogleGenerativeAI(API_KEY); 