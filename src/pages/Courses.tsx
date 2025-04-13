import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Clock, 
  Filter, 
  Search, 
  Star, 
  CheckCircle2, 
  LucideBarChart2, 
  GraduationCap,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';

interface Course {
  id: string;
  title: string;
  description: string;
  estimated_hours: number | null;
  difficulty_level: string | null;
  created_at: string;
  progress?: number;
  started_at?: string;
  completed?: boolean;
  status?: string;
  category?: string;
  related_skill?: string;
  thumbnail_url?: string;
  total_lessons?: number;
}

export default function Courses() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("newest");
  
  useEffect(() => {
    if (profile) {
      loadCourses();
    }
  }, [profile]);
  
  const loadCourses = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      // First try to fetch only published courses
      let { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*, course_lessons(count)')
        .order('created_at', { ascending: false });
        
      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        return;
      }

      // If no courses are found, try fetching all courses regardless of status
      if (!coursesData || coursesData.length === 0) {
        console.log('No published courses found, fetching all courses');
        const { data: allCoursesData, error: allCoursesError } = await supabase
          .from('courses')
          .select('*, course_lessons(count)')
          .order('created_at', { ascending: false });
          
        if (!allCoursesError && allCoursesData && allCoursesData.length > 0) {
          coursesData = allCoursesData;
        }
      }

      console.log('Fetched courses:', coursesData?.length, coursesData);
      
      // Fetch user's courses with progress
      const { data: userCoursesData, error: userCoursesError } = await supabase
        .from('user_courses')
        .select('*, course:course_id(*)')
        .eq('user_id', profile.id);
        
      if (userCoursesError) {
        console.error('Error fetching user courses:', userCoursesError);
      }
      
      // Extract unique categories
      const categories = coursesData
        ?.map(course => course.category)
        .filter((category): category is string => !!category)
        .filter((value, index, self) => self.indexOf(value) === index);
      
      setUniqueCategories(categories || []);
      
      // Process course data to include total lessons
      const processedCourses = coursesData?.map(course => ({
        ...course,
        total_lessons: course.course_lessons?.[0]?.count || 0
      })) || [];
      
      setAllCourses(processedCourses);
      
      // Transform user courses into the right format
      const transformedUserCourses = userCoursesData?.map(userCourse => ({
        ...userCourse.course,
        progress: userCourse.progress,
        started_at: userCourse.started_at,
        completed: userCourse.completed,
        total_lessons: 0 // We'll need to fetch this separately if needed
      })) || [];
      
      setMyCourses(transformedUserCourses);
      
    } catch (error) {
      console.error('Unexpected error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const enrollInCourse = async (courseId: string) => {
    if (!profile) return;
    
    try {
      // Check if already enrolled first
      if (isEnrolled(courseId)) {
        navigate(`/courses/${courseId}`);
        return;
      }
      
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: profile.id,
          course_id: courseId,
          progress: 0,
          started_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error enrolling in course:', error);
        return;
      }
      
      // Reload courses after enrollment
      loadCourses();
      
      // Navigate to the course directly after enrollment
      navigate(`/courses/${courseId}`);
      
    } catch (error) {
      console.error('Unexpected error enrolling in course:', error);
    }
  };
  
  const isEnrolled = (courseId: string) => {
    return myCourses.some(course => course.id === courseId);
  };
  
  const filterCourses = (courses: Course[]) => {
    return courses.filter(course => {
      // Filter by search query
      const matchesSearch = 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by difficulty level
      const matchesDifficulty = 
        !difficultyFilter || 
        (course.difficulty_level && course.difficulty_level.toLowerCase() === difficultyFilter.toLowerCase());
      
      // Filter by category
      const matchesCategory = 
        !categoryFilter || 
        (course.category && course.category === categoryFilter);
      
      return matchesSearch && matchesDifficulty && matchesCategory;
    });
  };
  
  const sortCourses = (courses: Course[]) => {
    return [...courses].sort((a, b) => {
      switch(sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'hours-asc':
          return (a.estimated_hours || 0) - (b.estimated_hours || 0);
        case 'hours-desc':
          return (b.estimated_hours || 0) - (a.estimated_hours || 0);
        default:
          return 0;
      }
    });
  };
  
  const filteredAllCourses = sortCourses(filterCourses(allCourses));
  const filteredMyCourses = sortCourses(filterCourses(myCourses));
  
  const getDifficultyColor = (level: string | null) => {
    if (!level) return "bg-gray-500/20 text-gray-500";
    
    switch(level.toLowerCase()) {
      case 'beginner':
        return "bg-green-500/20 text-green-500";
      case 'intermediate':
        return "bg-blue-500/20 text-blue-500";
      case 'advanced':
        return "bg-orange-500/20 text-orange-500";
      case 'expert':
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };
  
  const switchToAllCoursesTab = () => {
    const allTabTrigger = document.querySelector('button[value="all"]');
    if (allTabTrigger instanceof HTMLButtonElement) {
      allTabTrigger.click();
    }
  };
  
  const resetFilters = () => {
    setSearchQuery('');
    setDifficultyFilter(null);
    setCategoryFilter(null);
  };
  
  // Function to create test courses for development
  const createTestCourses = async () => {
    if (!profile || profile.role !== 'admin') return;
    
    setIsLoading(true);
    
    try {
      // Create 5 sample courses
      for (let i = 1; i <= 5; i++) {
        const { error } = await supabase
          .from('courses')
          .insert({
            title: `Test Course ${i}`,
            description: `This is a sample test course ${i} created for development purposes.`,
            estimated_hours: Math.floor(Math.random() * 10) + 1,
            difficulty_level: ['Beginner', 'Intermediate', 'Advanced', 'Expert'][Math.floor(Math.random() * 4)],
            status: 'Published',
            category: ['Development', 'Design', 'Business', 'Marketing', 'Photography'][Math.floor(Math.random() * 5)],
            related_skill: ['Coding', 'UI/UX', 'Management', 'Communication', 'Creativity'][Math.floor(Math.random() * 5)],
          });
          
        if (error) {
          console.error(`Error creating test course ${i}:`, error);
        }
      }
      
      // Reload courses
      loadCourses();
    } catch (error) {
      console.error('Error creating test courses:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const CourseCard = ({ course, isEnrolled, getDifficultyColor, navigate, enrollInCourse, myCourses }) => (
    <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        {course.thumbnail_url ? (
          <div className="h-40 w-full rounded-md overflow-hidden mb-4">
            <img 
              src={course.thumbnail_url} 
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ) : (
          <div className="h-40 w-full rounded-md overflow-hidden mb-4 bg-gradient-to-r from-primary/10 to-primary/30 flex items-center justify-center">
            <GraduationCap className="h-16 w-16 text-primary/50" />
          </div>
        )}
        
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
          {course.difficulty_level && (
            <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
              {course.difficulty_level}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">{course.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>{course.estimated_hours || 'Unknown'} hours</span>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 mr-1" />
            <span>{course.total_lessons || 0} lessons</span>
          </div>
        </div>
        
        {course.category && (
          <Badge variant="secondary" className="mt-2">
            {course.category}
          </Badge>
        )}
        
        {course.related_skill && (
          <div className="mt-2 text-xs text-muted-foreground">
            Related skill: {course.related_skill}
          </div>
        )}
        
        {isEnrolled(course.id) && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Progress</span>
              <span className="text-xs">{myCourses.find(c => c.id === course.id)?.progress || 0}%</span>
            </div>
            <Progress 
              value={myCourses.find(c => c.id === course.id)?.progress || 0} 
              className="h-2"
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button 
          className="w-full"
          variant={isEnrolled(course.id) ? "secondary" : "default"}
          onClick={() => isEnrolled(course.id) ? 
            navigate(`/courses/${course.id}`) : 
            enrollInCourse(course.id)
          }
        >
          {isEnrolled(course.id) ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Continue Learning
            </>
          ) : (
            <>
              <GraduationCap className="mr-2 h-4 w-4" /> Enroll Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
  
  const LoadingCourseCards = () => (
    <>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="overflow-hidden h-full">
          <CardHeader className="pb-2">
            <Skeleton className="h-40 w-full rounded-md mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-20 mt-2" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </>
  );
  
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">Explore available courses or continue your enrolled courses</p>
          <p className="text-xs text-muted-foreground mt-1">
            Found {allCourses.length} course{allCourses.length !== 1 ? 's' : ''} 
            {filteredAllCourses.length !== allCourses.length && ` (${filteredAllCourses.length} filtered)`}
          </p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-10 w-full md:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="my">My Courses</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  Difficulty
                  {difficultyFilter && <Badge variant="secondary" className="ml-2">{difficultyFilter}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDifficultyFilter(null)}>
                  All Levels
                  {difficultyFilter === null && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('Beginner')}>
                  Beginner
                  {difficultyFilter === 'Beginner' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('Intermediate')}>
                  Intermediate
                  {difficultyFilter === 'Intermediate' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('Advanced')}>
                  Advanced
                  {difficultyFilter === 'Advanced' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficultyFilter('Expert')}>
                  Expert
                  {difficultyFilter === 'Expert' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {uniqueCategories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Category
                    {categoryFilter && <Badge variant="secondary" className="ml-2">{categoryFilter}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                    All Categories
                    {categoryFilter === null && <CheckCircle2 className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                  {uniqueCategories.map(category => (
                    <DropdownMenuItem key={category} onClick={() => setCategoryFilter(category)}>
                      {category}
                      {categoryFilter === category && <CheckCircle2 className="ml-2 h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort Courses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  Newest First
                  {sortBy === 'newest' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                  Oldest First
                  {sortBy === 'oldest' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
                  Alphabetical
                  {sortBy === 'alphabetical' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('hours-asc')}>
                  Duration (Low to High)
                  {sortBy === 'hours-asc' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('hours-desc')}>
                  Duration (High to Low)
                  {sortBy === 'hours-desc' && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {(searchQuery || difficultyFilter || categoryFilter) && (
              <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        
        <TabsContent value="all" className="pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LoadingCourseCards />
            </div>
          ) : filteredAllCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAllCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  isEnrolled={isEnrolled} 
                  getDifficultyColor={getDifficultyColor} 
                  navigate={navigate} 
                  enrollInCourse={enrollInCourse} 
                  myCourses={myCourses} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No courses found</h3>
              <p className="text-muted-foreground mb-4">{searchQuery || difficultyFilter || categoryFilter ? 'No courses match your search criteria' : 'No courses are available at the moment'}</p>
              <div className="flex flex-col items-center gap-2">
                {(searchQuery || difficultyFilter || categoryFilter) && (
                  <Button onClick={resetFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
                {profile?.role === 'admin' && allCourses.length === 0 && (
                  <Button onClick={createTestCourses} variant="secondary" className="mt-2">
                    Create Test Courses (Admin Only)
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my" className="pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LoadingCourseCards />
            </div>
          ) : filteredMyCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  isEnrolled={isEnrolled} 
                  getDifficultyColor={getDifficultyColor} 
                  navigate={navigate} 
                  enrollInCourse={enrollInCourse} 
                  myCourses={myCourses} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No enrolled courses</h3>
              <p className="text-muted-foreground mb-6">{searchQuery || difficultyFilter || categoryFilter ? 'No enrolled courses match your criteria' : "You haven't enrolled in any courses yet"}</p>
              <Button onClick={switchToAllCoursesTab}>
                Browse All Courses
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Featured categories section */}
      {uniqueCategories.length > 0 && filteredAllCourses.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {uniqueCategories.slice(0, 3).map(category => {
              const categoryCount = allCourses.filter(c => c.category === category).length;
              return (
                <Card key={category} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" 
                      onClick={() => { setCategoryFilter(category); switchToAllCoursesTab(); }}>
                  <CardHeader className="pb-2">
                    <CardTitle>{category}</CardTitle>
                    <CardDescription>{categoryCount} course{categoryCount !== 1 ? 's' : ''}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 flex-wrap">
                      {allCourses
                        .filter(c => c.category === category)
                        .slice(0, 3)
                        .map(course => (
                          <Badge key={course.id} variant="outline" className="mb-1">
                            {course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title}
                          </Badge>
                        ))
                      }
                      {categoryCount > 3 && <Badge variant="outline">+{categoryCount - 3} more</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Debug section for admin users */}
      {profile?.role === 'admin' && (
        <div className="mt-16 border-t pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Developer Tools</h3>
            <Button onClick={createTestCourses} variant="outline" size="sm">
              Create Test Courses
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Raw Database Courses Data</CardTitle>
              <CardDescription>
                Showing {allCourses.length} course(s) from the database
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-auto">
              <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-md">
                {JSON.stringify(allCourses, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
