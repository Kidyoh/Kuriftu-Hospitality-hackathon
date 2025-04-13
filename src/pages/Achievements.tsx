import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, ChevronLeft, Trophy, BookOpen, Star, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAchievements, getUserAchievementSummary, Achievement } from '@/utils/incentivesUtils';
import LoginStreakCard from '@/components/incentives/LoginStreakCard';

// Categories with their icons
const categories = {
  general: <Trophy className="h-5 w-5" />,
  courses: <BookOpen className="h-5 w-5" />,
  quizzes: <Star className="h-5 w-5" />,
  streak: <Clock className="h-5 w-5" />,
  social: <User className="h-5 w-5" />,
};

interface AchievementItemProps {
  achievement: Achievement;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

const AchievementItem: React.FC<AchievementItemProps> = ({ 
  achievement, 
  progress, 
  completed,
  completedAt
}) => {
  return (
    <Card className={`transition-all ${completed ? 'border-primary/30' : 'border-muted'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant={completed ? "default" : "outline"}
            className={`${completed ? 'bg-primary/20 hover:bg-primary/30 text-primary-foreground' : ''}`}
          >
            {completed ? 'Unlocked' : `${Math.min(Math.round(progress), 100)}%`}
          </Badge>
          
          <div className={`p-1 rounded-full ${completed ? 'bg-primary/20' : 'bg-muted'}`}>
            {(() => {
              // Choose icon based on category
              const categoryKey = achievement.category as keyof typeof categories;
              return categories[categoryKey] || <Award className="h-5 w-5" />;
            })()}
          </div>
        </div>
        
        <CardTitle className="text-lg mt-3">{achievement.title || achievement.name}</CardTitle>
        <CardDescription>{achievement.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="mb-4">
          <Progress value={progress} max={100} className="h-2" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{progress} / {achievement.required_progress}</span>
            <span className="text-xs text-muted-foreground">
              {completed && completedAt && `Earned ${new Date(completedAt).toLocaleDateString()}`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Trophy className="h-4 w-4 mr-1 text-amber-500" />
            <span>{achievement.points} points</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Achievements: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // Fetch achievements and summary
        const [achievementsResult, summaryResult] = await Promise.all([
          getUserAchievements(user.id),
          getUserAchievementSummary(user.id)
        ]);
        
        if (achievementsResult.data) {
          setUserAchievements(achievementsResult.data);
        }
        
        if (summaryResult.data) {
          setSummary(summaryResult.data);
        }
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAchievements();
  }, [user?.id]);
  
  // Filter achievements by category
  const getFilteredAchievements = () => {
    if (activeTab === "all") return userAchievements;
    return userAchievements.filter(
      (a) => a.achievement.category === activeTab
    );
  };
  
  // Get categories from achievements
  const getCategories = () => {
    const cats = new Set<string>();
    cats.add("all");
    
    userAchievements.forEach((a) => {
      if (a.achievement.category) {
        cats.add(a.achievement.category);
      }
    });
    
    return Array.from(cats);
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">
            Track your learning milestones
          </p>
        </div>
      </div>
      
      {/* Summary and Streak Section */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Summary Cards */}
        <div className="md:col-span-8 space-y-6">
          {!loading && summary ? (
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 p-2 bg-muted rounded-full">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total Achievements</div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 p-2 bg-green-50 rounded-full">
                    <Award className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{summary.completed}</div>
                  <div className="text-xs text-muted-foreground">Unlocked</div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 p-2 bg-amber-50 rounded-full">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold">{summary.in_progress}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 p-2 bg-purple-50 rounded-full">
                    <Star className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">{summary.total_points_earned}</div>
                  <div className="text-xs text-muted-foreground">Points Earned</div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Skeleton className="w-10 h-10 rounded-full mb-2" />
                    <Skeleton className="w-10 h-6 mb-1" />
                    <Skeleton className="w-20 h-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {!loading && summary && (
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Achievement Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {summary.completion_percentage}% Complete
                    </p>
                  </div>
                  <Badge variant="outline">
                    {summary.completed}/{summary.total}
                  </Badge>
                </div>
                
                <Progress 
                  value={summary.completion_percentage} 
                  className="h-2" 
                />
              </div>
            </Card>
          )}
        </div>
        
        {/* Login Streak */}
        <div className="md:col-span-4">
          <LoginStreakCard />
        </div>
      </div>
      
      {/* Achievements List */}
      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4">
          {!loading && getCategories().map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeTab}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-2 w-full mb-4" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredAchievements().map((item) => (
                <AchievementItem
                  key={item.id}
                  achievement={item.achievement}
                  progress={item.progress}
                  completed={item.completed}
                  completedAt={item.completed_at}
                />
              ))}
              
              {getFilteredAchievements().length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No achievements found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "all" 
                      ? "You haven't started any achievements yet." 
                      : `You have no ${activeTab} achievements yet.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Achievements; 