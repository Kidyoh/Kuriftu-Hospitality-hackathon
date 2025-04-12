
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Clock, Book, Video
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  description: string;
  estimated_hours: number | null;
  difficulty_level: string | null;
  created_at: string;
  status: string;
  category: string | null;
  related_skill: string | null;
}

export default function AdminCourseManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Form state for new/edit course
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Partial<Course>>({
    title: '',
    description: '',
    estimated_hours: null,
    difficulty_level: 'Beginner',
    status: 'Draft',
    category: '',
    related_skill: ''
  });
  
  useEffect(() => {
    if (profile && profile.role === 'admin') {
      loadCourses();
    } else {
      navigate('/dashboard');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
    }
  }, [profile, navigate]);
  
  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load courses. Please try again.",
          variant: "destructive"
        });
        console.error('Error fetching courses:', error);
        return;
      }
      
      setCourses(data || []);
    } catch (error) {
      console.error('Unexpected error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setCurrentCourse({
      title: '',
      description: '',
      estimated_hours: null,
      difficulty_level: 'Beginner',
      status: 'Draft',
      category: '',
      related_skill: ''
    });
  };
  
  const handleEditCourse = (course: Course) => {
    setCurrentCourse(course);
    setIsEditing(true);
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentCourse.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a course title.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let result;
      
      if (isEditing && currentCourse.id) {
        // Update existing course
        result = await supabase
          .from('courses')
          .update({
            title: currentCourse.title,
            description: currentCourse.description,
            estimated_hours: currentCourse.estimated_hours,
            difficulty_level: currentCourse.difficulty_level,
            status: currentCourse.status,
            category: currentCourse.category,
            related_skill: currentCourse.related_skill
          })
          .eq('id', currentCourse.id)
          .select();
          
        toast({
          title: "Course Updated",
          description: "The course has been successfully updated."
        });
      } else {
        // Create new course
        result = await supabase
          .from('courses')
          .insert({
            title: currentCourse.title,
            description: currentCourse.description,
            estimated_hours: currentCourse.estimated_hours,
            difficulty_level: currentCourse.difficulty_level,
            status: currentCourse.status,
            category: currentCourse.category,
            related_skill: currentCourse.related_skill
          })
          .select();
          
        toast({
          title: "Course Created",
          description: "A new course has been successfully created."
        });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Reload courses
      loadCourses();
      handleDialogClose();
      
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Error",
        description: "Failed to save course. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCourse = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this course? This action cannot be undone.");
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Course Deleted",
        description: "The course has been successfully deleted."
      });
      
      // Reload courses
      loadCourses();
      
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. It may have related content.",
        variant: "destructive"
      });
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return "bg-gray-200 text-gray-800";
      case 'Published':
        return "bg-green-100 text-green-800";
      case 'Archived':
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleManageLessons = (courseId: string) => {
    navigate(`/admin/courses/${courseId}/lessons`);
  };
  
  const handleManageQuizzes = (courseId: string) => {
    navigate(`/admin/courses/${courseId}/quizzes`);
  };
  
  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter ? course.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
          <p className="text-muted-foreground mt-2">Create and manage courses for the learning platform</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-10 w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select
            value={statusFilter || ""}
            onValueChange={(value) => setStatusFilter(value || null)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Edit Course" : "Create New Course"}</DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? "Update the course details below."
                    : "Fill in the details below to create a new course."}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="title" className="text-right">
                      Course Title*
                    </label>
                    <Input
                      id="title"
                      value={currentCourse.title}
                      onChange={(e) => setCurrentCourse({...currentCourse, title: e.target.value})}
                      className="col-span-3"
                      placeholder="Introduction to React"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="description" className="text-right">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={currentCourse.description || ''}
                      onChange={(e) => setCurrentCourse({...currentCourse, description: e.target.value})}
                      className="col-span-3"
                      placeholder="A comprehensive introduction to React.js..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="status" className="text-right">
                      Status
                    </label>
                    <Select
                      value={currentCourse.status || 'Draft'}
                      onValueChange={(value) => setCurrentCourse({...currentCourse, status: value})}
                    >
                      <SelectTrigger id="status" className="col-span-3">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Published">Published</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="difficulty" className="text-right">
                      Difficulty Level
                    </label>
                    <Select
                      value={currentCourse.difficulty_level || 'Beginner'}
                      onValueChange={(value) => setCurrentCourse({...currentCourse, difficulty_level: value})}
                    >
                      <SelectTrigger id="difficulty" className="col-span-3">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="hours" className="text-right">
                      Estimated Hours
                    </label>
                    <Input
                      id="hours"
                      type="number"
                      value={currentCourse.estimated_hours?.toString() || ''}
                      onChange={(e) => setCurrentCourse({
                        ...currentCourse, 
                        estimated_hours: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="col-span-3"
                      placeholder="8"
                      min="0"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="category" className="text-right">
                      Category
                    </label>
                    <Input
                      id="category"
                      value={currentCourse.category || ''}
                      onChange={(e) => setCurrentCourse({...currentCourse, category: e.target.value})}
                      className="col-span-3"
                      placeholder="Frontend Development"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="skill" className="text-right">
                      Related Skill
                    </label>
                    <Input
                      id="skill"
                      value={currentCourse.related_skill || ''}
                      onChange={(e) => setCurrentCourse({...currentCourse, related_skill: e.target.value})}
                      className="col-span-3"
                      placeholder="React.js"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditing ? 'Save Changes' : 'Create Course'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Est. Hours</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(course.status)}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.category || '—'}</TableCell>
                      <TableCell>{course.difficulty_level || '—'}</TableCell>
                      <TableCell>{course.estimated_hours || '—'} hrs</TableCell>
                      <TableCell>{new Date(course.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditCourse(course)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Course
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageLessons(course.id)}>
                              <Video className="h-4 w-4 mr-2" />
                              Manage Lessons
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageQuizzes(course.id)}>
                              <Book className="h-4 w-4 mr-2" />
                              Manage Quizzes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCourse(course.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No courses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
