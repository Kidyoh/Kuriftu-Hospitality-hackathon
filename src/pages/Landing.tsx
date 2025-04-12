
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, GraduationCap, Shield, Users } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container px-4 py-16 md:py-32 flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-bold text-center mb-6">
            Kuriftu Learning Village
          </h1>
          <p className="text-lg md:text-xl text-center text-muted-foreground mb-8 max-w-2xl">
            Elevate hospitality excellence through personalized learning experiences tailored to your role and experience level
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="container px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Personalized Learning for Hospitality Excellence
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Tailored Learning Paths</h3>
            <p className="text-muted-foreground">
              Customized training paths based on your department, role, and experience level
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Expert-Led Content</h3>
            <p className="text-muted-foreground">
              Courses and materials developed by industry professionals with real-world experience
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">AI-Powered Recommendations</h3>
            <p className="text-muted-foreground">
              Smart recommendations that identify skill gaps and suggest relevant training
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Track Your Progress</h3>
            <p className="text-muted-foreground">
              Monitor your learning journey with clear metrics and achievement recognition
            </p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="container px-4 py-16">
        <div className="bg-primary/10 rounded-lg p-8 md:p-12 flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Enhance Your Hospitality Skills?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Join Kuriftu Learning Village today and start your journey toward professional excellence.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
            Join Now <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-muted/30 py-12">
        <div className="container px-4 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} Kuriftu Learning Village. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
