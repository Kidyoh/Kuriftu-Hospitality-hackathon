
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile, assessmentResults } = await req.json();

    if (!userProfile || !assessmentResults) {
      return new Response(
        JSON.stringify({ error: 'User profile and assessment results are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = generatePrompt(userProfile, assessmentResults);
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error("Unexpected API response structure:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to get recommendations from AI", details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Parse the AI response to get structured recommendations
    const recommendations = parseAIResponse(aiResponse);

    return new Response(
      JSON.stringify(recommendations),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in AI recommendations function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePrompt(userProfile: any, assessmentResults: any) {
  const { department, position, experience_level } = userProfile;
  
  return `
You are an expert hospitality training consultant for Kuriftu Resort. 
Based on the following employee profile and assessment results, provide specific learning recommendations.

EMPLOYEE PROFILE:
- Department: ${department || 'Not specified'}
- Position: ${position || 'Not specified'}
- Experience Level: ${experience_level || 'Not specified'}

SKILL ASSESSMENT RESULTS:
${Object.entries(assessmentResults).map(([skill, score]) => `- ${skill}: ${score}/5`).join('\n')}

Please provide the following in a structured format:
1. A brief analysis of the employee's strengths and areas for improvement (2-3 sentences)
2. Three specific course recommendations that would be most beneficial for this employee in their specific role
3. A recommended learning path based on their department and experience level

For each course recommendation, include:
- Course title
- Brief description (1-2 sentences)
- Why this is important for their role
- Estimated completion time (in hours)

Format your response in the following structure:
ANALYSIS: [Your analysis]

RECOMMENDED COURSES:
1. [Course title]: [Description] - [Importance] - [Hours] hours
2. [Course title]: [Description] - [Importance] - [Hours] hours
3. [Course title]: [Description] - [Importance] - [Hours] hours

RECOMMENDED LEARNING PATH: [Learning path name]
`;
}

function parseAIResponse(aiResponse: string) {
  try {
    // Extract analysis
    const analysisMatch = aiResponse.match(/ANALYSIS:(.*?)(?=RECOMMENDED COURSES:|$)/s);
    const analysis = analysisMatch ? analysisMatch[1].trim() : "";

    // Extract recommended courses
    const coursesMatch = aiResponse.match(/RECOMMENDED COURSES:(.*?)(?=RECOMMENDED LEARNING PATH:|$)/s);
    const coursesText = coursesMatch ? coursesMatch[1].trim() : "";
    
    // Extract individual courses
    const courseRegex = /\d+\.\s+([^:]+):\s+([^-]+)-\s+([^-]+)-\s+(\d+)\s+hours/g;
    const courses = [];
    let courseMatch;
    
    while ((courseMatch = courseRegex.exec(coursesText)) !== null) {
      courses.push({
        title: courseMatch[1].trim(),
        description: courseMatch[2].trim(),
        importance: courseMatch[3].trim(),
        hours: parseInt(courseMatch[4])
      });
    }

    // Extract recommended learning path
    const pathMatch = aiResponse.match(/RECOMMENDED LEARNING PATH:(.*?)$/s);
    const recommendedPath = pathMatch ? pathMatch[1].trim() : "";

    return {
      analysis,
      recommendedCourses: courses,
      recommendedLearningPath: recommendedPath
    };
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return {
      analysis: "Unable to parse AI recommendations.",
      recommendedCourses: [],
      recommendedLearningPath: ""
    };
  }
}
