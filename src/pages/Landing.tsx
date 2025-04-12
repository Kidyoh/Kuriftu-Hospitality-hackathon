import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, BookOpen, GraduationCap, Shield, 
  Users, CheckCircle, Award, BarChart, Globe, ChevronRight
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function Landing() {
  const navigate = useNavigate();
  
  // Animation hooks
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  const [featuresRef, featuresInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  const [stepsRef, stepsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  const [benefitsRef, benefitsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section - Enhanced with animation and better visuals */}
      <motion.div 
        ref={heroRef}
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={staggerContainer}
        className="relative py-16 md:py-32 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/50 to-background z-0" />
        
        {/* Abstract shape decorations */}
        <div className="absolute top-24 right-0 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl opacity-50" />
        <div className="absolute bottom-10 left-10 w-60 h-60 bg-secondary/10 rounded-full filter blur-3xl opacity-50" />
        <div className="absolute top-40 left-1/4 w-40 h-40 bg-accent/10 rounded-full filter blur-3xl opacity-30" />
        
        <div className="container relative z-10 px-4">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
            <motion.div 
              variants={fadeIn}
              className="mb-2 inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              Welcome to Kuriftu Learning Village
            </motion.div>
            
            <motion.h1 
              variants={fadeIn}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-secondary"
            >
              Elevate Your Hospitality Career
            </motion.h1>
            
            <motion.p 
              variants={fadeIn}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl"
            >
              Personalized learning experiences tailored to your role and experience level, helping you excel in the hospitality industry
            </motion.p>
            
            <motion.div 
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" onClick={() => navigate('/auth')} className="group gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started 
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="mt-12 md:mt-16 relative"
            >
              <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 blur-lg opacity-70" />
              <div className="relative rounded-lg border overflow-hidden shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80" 
                  alt="Learning platform dashboard" 
                  className="w-full object-cover rounded-lg"
                  style={{ maxHeight: '500px' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Features Section - Now with animation */}
      <motion.div 
        ref={featuresRef}
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        variants={staggerContainer}
        className="container px-4 py-20"
      >
        <motion.h2 
          variants={fadeIn}
          className="text-3xl md:text-4xl font-bold text-center mb-4"
        >
          Transform Your Skills
        </motion.h2>
        
        <motion.p 
          variants={fadeIn}
          className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          Our platform delivers personalized learning experiences for every role in the hospitality industry
        </motion.p>
        
        <motion.div 
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <motion.div 
            variants={fadeIn}
            className="bg-card p-6 rounded-lg shadow-sm border border-border/50 transition-all hover:shadow-md hover:border-primary/50 group"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Tailored Learning Paths</h3>
            <p className="text-muted-foreground">
              Customized training paths based on your department, role, and experience level
            </p>
          </motion.div>
          
          <motion.div 
            variants={fadeIn}
            className="bg-card p-6 rounded-lg shadow-sm border border-border/50 transition-all hover:shadow-md hover:border-primary/50 group"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Expert-Led Content</h3>
            <p className="text-muted-foreground">
              Courses and materials developed by industry professionals with real-world experience
            </p>
          </motion.div>
          
          <motion.div 
            variants={fadeIn}
            className="bg-card p-6 rounded-lg shadow-sm border border-border/50 transition-all hover:shadow-md hover:border-primary/50 group"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">AI-Powered Recommendations</h3>
            <p className="text-muted-foreground">
              Smart recommendations that identify skill gaps and suggest relevant training
            </p>
          </motion.div>
          
          <motion.div 
            variants={fadeIn}
            className="bg-card p-6 rounded-lg shadow-sm border border-border/50 transition-all hover:shadow-md hover:border-primary/50 group"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <BarChart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Track Your Progress</h3>
            <p className="text-muted-foreground">
              Monitor your learning journey with clear metrics and achievement recognition
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* How It Works Section - Modernized */}
      <motion.div 
        ref={stepsRef}
        initial="hidden"
        animate={stepsInView ? "visible" : "hidden"}
        variants={staggerContainer}
        className="bg-muted/30 py-20 relative overflow-hidden"
      >
        {/* Background pattern decoration */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(0,0,0,0.03) 2px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="container px-4 relative z-10">
          <motion.h2 
            variants={fadeIn}
            className="text-3xl md:text-4xl font-bold text-center mb-4"
          >
            How It Works
          </motion.h2>
          
          <motion.p 
            variants={fadeIn}
            className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            Our simple process helps you get started and grow your hospitality career
          </motion.p>
          
          <motion.div 
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-8 relative"
          >
            {/* Connecting line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 transform -translate-y-1/2 z-0"></div>
            
            <motion.div 
              variants={fadeIn}
              className="text-center relative z-10"
            >
              <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-4 shadow-md">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-lg">
                  1
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Sign Up</h3>
              <p className="text-sm text-muted-foreground">
                Create your account and complete a simple profile
              </p>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="text-center relative z-10"
            >
              <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-4 shadow-md">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-lg">
                  2
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Assessment</h3>
              <p className="text-sm text-muted-foreground">
                Complete a skill assessment to identify your strengths
              </p>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="text-center relative z-10"
            >
              <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-4 shadow-md">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-lg">
                  3
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Personalized Path</h3>
              <p className="text-sm text-muted-foreground">
                Receive AI-tailored learning recommendations
              </p>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="text-center relative z-10"
            >
              <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-4 shadow-md">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-lg">
                  4
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Learn & Grow</h3>
              <p className="text-sm text-muted-foreground">
                Complete courses and track your progress
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Benefits Section */}
      <motion.div 
        ref={benefitsRef}
        initial="hidden"
        animate={benefitsInView ? "visible" : "hidden"}
        variants={staggerContainer}
        className="container px-4 py-20"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div variants={fadeIn}>
            <motion.h2 
              variants={fadeIn}
              className="text-3xl md:text-4xl font-bold mb-6"
            >
              Benefits for Your Career
            </motion.h2>
            
            <motion.p 
              variants={fadeIn}
              className="text-lg text-muted-foreground mb-8"
            >
              Kuriftu Learning Village helps you build the skills you need to excel in the hospitality industry
            </motion.p>
            
            <motion.div 
              variants={staggerContainer}
              className="space-y-4"
            >
              <motion.div 
                variants={fadeIn}
                className="flex gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Accelerate Your Growth</h3>
                  <p className="text-sm text-muted-foreground">Targeted training helps you advance faster in your career</p>
                </div>
              </motion.div>
              
              <motion.div 
                variants={fadeIn}
                className="flex gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Industry Recognition</h3>
                  <p className="text-sm text-muted-foreground">Earn certificates that demonstrate your expertise</p>
                </div>
              </motion.div>
              
              <motion.div 
                variants={fadeIn}
                className="flex gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Flexible Learning</h3>
                  <p className="text-sm text-muted-foreground">Study at your own pace with accessible online courses</p>
                </div>
              </motion.div>
              
              <motion.div 
                variants={fadeIn}
                className="flex gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Community Support</h3>
                  <p className="text-sm text-muted-foreground">Connect with peers and mentors in hospitality</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            variants={fadeIn}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl blur-xl opacity-70"></div>
            <div className="relative rounded-xl overflow-hidden shadow-2xl border">
              <img 
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                alt="Hospitality professionals" 
                className="object-cover w-full h-[500px]"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* CTA Section */}
      <div className="container px-4 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-8 md:p-12 flex flex-col items-center text-center text-white"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Enhance Your Hospitality Skills?
          </h2>
          <p className="text-lg mb-8 max-w-2xl opacity-90">
            Join Kuriftu Learning Village today and start your journey toward professional excellence
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')} 
            variant="secondary" 
            className="group gap-2 hover:bg-white hover:text-primary transition-colors"
          >
            Join Now 
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
      
      {/* Footer */}
      <footer className="bg-muted/30 py-12 mt-auto">
        <div className="container px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Kuriftu Learning Village</h3>
              <p className="text-sm text-muted-foreground">
                Elevating hospitality excellence through personalized learning.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Courses</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Learning Paths</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Certifications</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Partners</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Kuriftu Learning Village. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
