
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RecommendedCourse {
  title: string;
  description: string;
  importance: string;
  hours: number;
}

interface AiRecommendationsProps {
  recommendations: {
    analysis: string;
    recommendedCourses: RecommendedCourse[];
    recommendedLearningPath: string;
  } | null;
  isLoading: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export default function AiRecommendations({ recommendations, isLoading, onBack, onContinue }: AiRecommendationsProps) {
  return (
    <div className="space-y-6">
      {isLoading || !recommendations ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your personalized recommendations...</p>
        </div>
      ) : (
        <>
          <div className="bg-secondary/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Analysis</h3>
            <p>{recommendations.analysis}</p>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Recommended Courses</h3>
            <div className="space-y-4">
              {recommendations.recommendedCourses.map((course, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <h4 className="font-medium">{course.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-primary">{course.importance}</span>
                    <span>{course.hours} hours</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Recommended Learning Path</h3>
            <p>{recommendations.recommendedLearningPath}</p>
          </div>
        </>
      )}
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onContinue} disabled={isLoading}>Continue</Button>
      </div>
    </div>
  );
}
