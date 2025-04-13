import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CourseAIChatProps {
  courseTitle: string;
  courseDescription: string;
  lessons: Array<{ title: string; description: string | null }>;
  quizzes: Array<{ title: string; description: string | null }>;
}

export function CourseAIChat({ courseTitle, courseDescription, lessons, quizzes }: CourseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Create context string from course data
      const context = `
Course: ${courseTitle}
Description: ${courseDescription}

Lessons:
${lessons.map(lesson => `- ${lesson.title}${lesson.description ? `: ${lesson.description}` : ''}`).join('\n')}

Quizzes:
${quizzes.map(quiz => `- ${quiz.title}${quiz.description ? `: ${quiz.description}` : ''}`).join('\n')}
`;

      // Create prompt
      const prompt = `You are a helpful AI assistant for an e-learning platform. You help students with questions about their courses.
Your responses should be:
1. Accurate and based on the course content provided
2. Concise but informative
3. Encouraging and supportive
4. Focused on helping the student learn

Here is the context about the course:

${context}

Student question: ${userMessage}

Please provide a helpful response based on the course content.`;

      // Generate response using Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error while processing your request. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Course Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[400px]">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'assistant'
                        ? 'bg-muted'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the course..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
} 