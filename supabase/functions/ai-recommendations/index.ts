
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Recommendation Logic
async function generateRecommendations(
  userProfile: { department: string; position: string; experience_level: string },
  assessmentResults: Record<string, string>
) {
  try {
    // Fetch courses from the database
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*');

    if (error) throw error;

    // If no courses available, return generic recommendations
    if (!courses || courses.length === 0) {
      return getDefaultRecommendations(userProfile);
    }

    // Analyze assessment results
    const skills = Object.entries(assessmentResults).map(([skill, rating]) => ({ skill, rating }));
    const lowSkills = skills.filter(s => ['1', '2'].includes(s.rating)).map(s => s.skill);
    const mediumSkills = skills.filter(s => ['3'].includes(s.rating)).map(s => s.skill);
    
    // Select courses based on department and low-rated skills
    let recommendedCourses = courses
      .filter(course => {
        // If description or title mentions department or position, prioritize it
        const relevantToDepartment = course.description?.toLowerCase().includes(userProfile.department?.toLowerCase() || '') || 
                                    course.title?.toLowerCase().includes(userProfile.department?.toLowerCase() || '');
        
        // If description mentions any of the low-rated skills
        const addressesWeakSkills = lowSkills.some(skill => 
          course.description?.toLowerCase().includes(skill.toLowerCase()) || 
          course.title?.toLowerCase().includes(skill.toLowerCase())
        );
        
        return relevantToDepartment || addressesWeakSkills;
      })
      .slice(0, 3); // Limit to 3 courses
    
    // If we don't have enough courses, add some based on medium-rated skills
    if (recommendedCourses.length < 3) {
      const additionalCourses = courses
        .filter(c => !recommendedCourses.some(rc => rc.id === c.id)) // Filter out already recommended courses
        .filter(course => {
          // If description mentions any of the medium-rated skills
          return mediumSkills.some(skill => 
            course.description?.toLowerCase().includes(skill.toLowerCase()) || 
            course.title?.toLowerCase().includes(skill.toLowerCase())
          );
        })
        .slice(0, 3 - recommendedCourses.length);
      
      recommendedCourses = [...recommendedCourses, ...additionalCourses];
    }
    
    // If still not enough, add some general courses for their experience level
    if (recommendedCourses.length < 3) {
      const difficultyMap: Record<string, string> = {
        'beginner': 'beginner',
        'intermediate': 'intermediate',
        'experienced': 'intermediate',
        'expert': 'advanced'
      };
      
      const targetDifficulty = difficultyMap[userProfile.experience_level || 'beginner'] || 'beginner';
      
      const generalCourses = courses
        .filter(c => !recommendedCourses.some(rc => rc.id === c.id)) // Filter out already recommended
        .filter(course => course.difficulty_level === targetDifficulty)
        .slice(0, 3 - recommendedCourses.length);
      
      recommendedCourses = [...recommendedCourses, ...generalCourses];
    }
    
    // Even if we still don't have 3, use what we have
    // But format them for the response
    const formattedCourses = recommendedCourses.map(course => ({
      title: course.title,
      description: course.description || "No description available",
      importance: getImportanceLevel(course, lowSkills, mediumSkills),
      hours: course.estimated_hours || 2
    }));
    
    // Generate analysis text based on assessment
    const analysis = generateAnalysisText(userProfile, skills);
    
    // Generate recommended learning path
    const learningPath = generateLearningPathText(userProfile, lowSkills, mediumSkills);
    
    return {
      analysis,
      recommendedCourses: formattedCourses,
      recommendedLearningPath: learningPath
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return getDefaultRecommendations(userProfile);
  }
}

// Helper function to determine importance level
function getImportanceLevel(
  course: any, 
  lowSkills: string[], 
  mediumSkills: string[]
): string {
  if (!course.description) return "Recommended";
  
  const description = course.description.toLowerCase();
  const title = course.title.toLowerCase();
  
  // If this course addresses multiple low-rated skills
  if (lowSkills.filter(skill => 
    description.includes(skill.toLowerCase()) || 
    title.includes(skill.toLowerCase())
  ).length > 1) {
    return "Critical";
  }
  
  // If this course addresses at least one low-rated skill
  if (lowSkills.some(skill => 
    description.includes(skill.toLowerCase()) || 
    title.includes(skill.toLowerCase())
  )) {
    return "High Priority";
  }
  
  // If this course addresses at least one medium-rated skill
  if (mediumSkills.some(skill => 
    description.includes(skill.toLowerCase()) || 
    title.includes(skill.toLowerCase())
  )) {
    return "Recommended";
  }
  
  return "Suggested";
}

// Generate analysis text based on assessment
function generateAnalysisText(
  userProfile: { department: string; position: string; experience_level: string },
  skills: Array<{ skill: string; rating: string }>
): string {
  const department = userProfile.department || "hospitality";
  const position = userProfile.position || "staff";
  const experienceLevel = userProfile.experience_level || "beginner";
  
  const lowSkills = skills.filter(s => ['1', '2'].includes(s.rating));
  const highSkills = skills.filter(s => ['4', '5'].includes(s.rating));
  
  let analysis = `Based on your assessment, you have ${lowSkills.length} areas that could benefit from focused development in your ${department} role as ${position}. `;
  
  if (highSkills.length > 0) {
    analysis += `You demonstrate strength in ${highSkills.length} areas, which is excellent. `;
  }
  
  if (lowSkills.length > 0) {
    analysis += `We recommend prioritizing training in: ${lowSkills.map(s => s.skill).join(', ')}. `;
  }
  
  if (experienceLevel === 'beginner') {
    analysis += "As you're new to the industry, our recommendations focus on building foundational knowledge while addressing your specific development needs.";
  } else if (experienceLevel === 'intermediate') {
    analysis += "With your intermediate experience level, our recommendations aim to refine your existing skills while addressing specific areas for growth.";
  } else {
    analysis += "Given your advanced experience, our recommendations focus on specialized skills and leadership development to help you excel further in your role.";
  }
  
  return analysis;
}

// Generate learning path text
function generateLearningPathText(
  userProfile: { department: string; position: string; experience_level: string },
  lowSkills: string[],
  mediumSkills: string[]
): string {
  const department = userProfile.department || "hospitality";
  const position = userProfile.position || "staff";
  
  let path = `We recommend a personalized ${department} learning path focusing on `;
  
  if (lowSkills.length > 0) {
    path += `core skills like ${lowSkills.join(', ')}`;
    
    if (mediumSkills.length > 0) {
      path += `, followed by enhancement of ${mediumSkills.join(', ')}`;
    }
  } else if (mediumSkills.length > 0) {
    path += `enhancement of ${mediumSkills.join(', ')}`;
  } else {
    path += `advanced topics relevant to your ${position} role`;
  }
  
  path += `. Complete the recommended courses in order, with approximately 2-3 hours of learning per week. We suggest reviewing each module and practicing skills in your daily work for maximum retention.`;
  
  return path;
}

// Default recommendations in case no courses are available
function getDefaultRecommendations(userProfile: { department: string; position: string; experience_level: string }) {
  const department = userProfile.department || "hospitality";
  
  return {
    analysis: `Based on your assessment, we've identified several areas for focused development in your ${department} role. Your profile indicates opportunities for growth in customer service, operational efficiency, and communication skills.`,
    recommendedCourses: [
      {
        title: `${department} Essentials`,
        description: `Build a strong foundation in ${department} best practices and standards`,
        importance: "High Priority",
        hours: 3
      },
      {
        title: "Customer Service Excellence",
        description: "Master the art of exceptional guest experiences and service recovery",
        importance: "Critical",
        hours: 2
      },
      {
        title: "Effective Communication in Hospitality",
        description: "Develop clear communication skills for guest and team interactions",
        importance: "Recommended",
        hours: 2
      }
    ],
    recommendedLearningPath: `We recommend a personalized ${department} learning path focusing on core guest service skills, followed by operational excellence and communication enhancement. Complete these recommended courses in order, with approximately 2-3 hours of learning per week.`
  };
}

serve(async (req) => {
  // Handle CORS options request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile, assessmentResults } = await req.json();
    
    // Generate recommendations based on user profile and assessment
    const recommendations = await generateRecommendations(userProfile, assessmentResults);
    
    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in AI recommendations function:", error);
    return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
