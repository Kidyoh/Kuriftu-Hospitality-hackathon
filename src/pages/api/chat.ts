import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();

    // Create chat context
    const prompt = `You are a helpful AI assistant for an e-learning platform. You help students with questions about their courses.
Your responses should be:
1. Accurate and based on the course content provided
2. Concise but informative
3. Encouraging and supportive
4. Focused on helping the student learn

Here is the context about the course:

${context}

Student question: ${message}

Please provide a helpful response based on the course content.`;

    // Generate response using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({
      response: text
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process chat request'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 