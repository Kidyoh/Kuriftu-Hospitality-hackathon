
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const { userProfile, assessmentResults } = await req.json()

    console.log("Received request with profile:", JSON.stringify(userProfile))
    console.log("Assessment results:", JSON.stringify(assessmentResults))

    // Format assessment results for the prompt
    const formattedAssessment = Object.entries(assessmentResults)
      .map(([skill, score]) => `${skill.replace(/_/g, ' ')}: ${score}/5`)
      .join('\n')

    // Construct the prompt for Gemini
    const prompt = `
Based on the following employee profile and skill assessment for a hotel staff member, generate personalized learning recommendations:

Employee Profile:
- Department: ${userProfile.department || 'Not specified'}
- Position: ${userProfile.position || 'Not specified'}
- Experience Level: ${userProfile.experience_level || 'Not specified'}

Skill Self-Assessment (scored 1-5):
${formattedAssessment}

Please provide:
1. A brief analysis of their strengths and weaknesses (2-3 sentences)
2. Three recommended courses tailored to their role and skill gaps (include title, brief description, importance level, and estimated hours)
3. A suggested learning path progression (1-2 sentences)

Format the response as a valid JSON object with the following structure:
{
  "analysis": "text analysis here",
  "recommendedCourses": [
    {
      "title": "Course Title",
      "description": "Brief description",
      "importance": "Critical/High/Medium/Low",
      "hours": 5
    }
  ],
  "recommendedLearningPath": "Learning path suggestion here"
}
`

    console.log("Sending request to Gemini API with prompt:", prompt)

    // Call Gemini API
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Gemini API error:", error)
      throw new Error(`Gemini API error: ${error}`)
    }

    const result = await response.json()
    console.log("Gemini API response:", JSON.stringify(result))

    // Extract the text content from the response
    const textContent = result.candidates[0].content.parts[0].text

    // Parse the JSON from the text content
    // The AI might wrap the JSON in markdown code blocks, so we need to extract it
    const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/) || 
                      textContent.match(/```\n([\s\S]*?)\n```/) ||
                      [null, textContent]
                      
    const jsonString = jsonMatch[1].trim()
    
    // Parse the JSON
    let recommendations
    try {
      recommendations = JSON.parse(jsonString)
      console.log("Parsed recommendations:", JSON.stringify(recommendations))
    } catch (e) {
      console.error("Error parsing JSON from Gemini response:", e)
      // Fallback recommendations if parsing fails
      recommendations = {
        analysis: "We couldn't generate a personalized analysis at this time. Based on your profile, focusing on foundational skills for your role would be beneficial.",
        recommendedCourses: [
          {
            title: "Department Fundamentals",
            description: `Essential skills for ${userProfile.department || 'your department'} roles`,
            importance: "High",
            hours: 4
          },
          {
            title: "Customer Service Excellence",
            description: "Core principles of hospitality customer service",
            importance: "Critical",
            hours: 3
          },
          {
            title: "Hotel Operations Basics",
            description: "Understanding how different departments work together",
            importance: "Medium",
            hours: 5
          }
        ],
        recommendedLearningPath: `Start with foundational courses for your ${userProfile.department || 'department'} role, then progress to more specialized topics.`
      }
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Error in AI recommendations function:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred while generating recommendations" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
