import React, { createContext, useContext, useState, useEffect } from 'react';

// Available languages
export type Language = 'en' | 'am' | 'or';

// Language names for display
export const languageNames = {
  en: 'English',
  am: 'አማርኛ',
  or: 'Oromiffa'
};

// Define the shape of our language context
interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, args?: Record<string, any>) => string;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
});

// Translations for each language
const translations: Record<Language, Record<string, any>> = {
  en: {
    common: {
      welcome: 'Welcome to Learning Village',
      loading: 'Loading...',
      error: 'An error occurred',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      notFound: 'Not Found',
      accessDenied: 'Access Denied',
      success: 'Success',
      failure: 'Failure',
      created: 'Created',
      updated: 'Updated',
      deleted: 'Deleted',
    },
    
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      forgotPassword: 'Forgot Password',
      resetPassword: 'Reset Password',
      emailPlaceholder: 'Enter your email',
      passwordPlaceholder: 'Enter your password',
      confirmPassword: 'Confirm Password',
      fullName: 'Full Name',
      phone: 'Phone Number',
      role: 'Role',
      department: 'Department',
      position: 'Position',
      experience: 'Experience Level',
      verifyEmail: 'Verify Email',
      verifyCode: 'Verification Code',
      newAccount: 'Create New Account',
      hasAccount: 'Already have an account?',
      signInWithEmail: 'Sign In with Email',
      signInWithGoogle: 'Sign In with Google',
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      email: 'Email',
      password: 'Password',
    },
    
    courses: {
      myCourses: 'My Courses',
      allCourses: 'All Courses',
      enrolledCourses: 'Enrolled Courses',
      recommendedCourses: 'Recommended Courses',
      popularCourses: 'Popular Courses',
      newCourses: 'New Courses',
      completedCourses: 'Completed Courses',
      inProgressCourses: 'In Progress Courses',
      courseDetails: 'Course Details',
      courseDescription: 'Course Description',
      courseObjectives: 'Course Objectives',
      courseDuration: 'Course Duration',
      courseLevel: 'Course Level',
      courseInstructor: 'Course Instructor',
      courseRating: 'Course Rating',
      courseReviews: 'Course Reviews',
      courseMaterials: 'Course Materials',
      coursePrerequisites: 'Course Prerequisites',
      courseSyllabus: 'Course Syllabus',
      courseProgress: 'Course Progress',
      courseCompletion: 'Course Completion',
      courseEnroll: 'Enroll Now',
      courseUnenroll: 'Unenroll',
      courseStart: 'Start Course',
      courseResume: 'Resume Course',
      filter: 'Filter',
      sort: 'Sort',
      search: 'Search',
      department: 'Department',
      level: 'Level',
      duration: 'Duration',
      ratings: 'Ratings',
      progress: 'Progress',
      status: 'Status',
      lessons: 'Lessons',
      quizzes: 'Quizzes',
      attachments: 'Attachments',
      noCoursesFound: 'No courses found',
      findCourses: 'Find Courses',
      difficultyLevel: 'Difficulty Level',
      duration_beginner: 'Beginner',
      duration_intermediate: 'Intermediate',
      duration_advanced: 'Advanced',
      available: 'Available',
      notAvailable: 'Not Available',
      enrolled: 'Enrolled',
      notEnrolled: 'Not Enrolled',
      dateEnrolled: 'Date Enrolled',
      dateCompleted: 'Date Completed',
      completed: 'Completed',
      notCompleted: 'Not Completed',
      courseActions: 'Course Actions',
      viewLessons: 'View Lessons',
      viewQuizzes: 'View Quizzes',
      startCourse: 'Start Course',
      continueCourse: 'Continue Course',
      retry: 'Retry',
      title: 'Courses',
      all: 'All Courses',
      my: 'My Courses',
      enroll: 'Enroll Now',
      continue: 'Continue Learning',
      review: 'Review Course',
      inProgress: 'In Progress',
      notStarted: 'Not Started',
      markAsCompleted: 'Mark as Completed',
      markAsIncomplete: 'Mark as Incomplete',
      hours: 'hrs',
      difficulty: 'Est. Time',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
      take: 'Take Quiz',
      notFound: 'Course not found',
      notFoundDescription: 'The course you\'re looking for doesn\'t exist or you don\'t have access to it.',
      backToCourses: 'Back to Courses',
      noLessons: 'No lessons available',
      noLessonsDescription: 'This course doesn\'t have any lessons yet.',
      noQuizzes: 'No quizzes available',
      noQuizzesDescription: 'This course doesn\'t have any quizzes yet.',
    },
    
    dashboard: {
      welcomeBack: 'Welcome Back',
      continueLesson: 'Continue Lesson',
      recentActivity: 'Recent Activity',
      upcomingCourses: 'Upcoming Courses',
      completedCourses: 'Completed Courses',
      achievementEarned: 'Achievement Earned',
      progressSummary: 'Progress Summary',
      todayPlan: 'Today\'s Plan',
      announcements: 'Announcements',
      suggestedCourses: 'Suggested Courses',
    },
    
    notifications: {
      newCourse: 'New Course Available',
      courseUpdated: 'Course Updated',
      courseCompleted: 'Course Completed',
      quizAvailable: 'Quiz Available',
      quizCompleted: 'Quiz Completed',
      systemUpdate: 'System Update',
    },
    
    errors: {
      notFound: 'Not Found',
      accessDenied: 'Access Denied',
      serverError: 'Server Error',
      networkError: 'Network Error',
      loginRequired: 'Login Required',
      invalidCredentials: 'Invalid Credentials',
      emailExists: 'Email Already Exists',
      weakPassword: 'Password Too Weak',
      passwordMismatch: 'Passwords Do Not Match',
      requiredField: 'This Field is Required',
      invalidEmail: 'Invalid Email',
      invalidPhone: 'Invalid Phone Number',
      enrollmentFailed: 'Failed to Enroll',
      courseFetchFailed: 'Failed to Fetch Course',
      lessonFetchFailed: 'Failed to Fetch Lesson',
      progressUpdateFailed: 'Failed to Update Progress',
      failedToLoad: 'Failed to load data',
      failedToUpdate: 'Failed to update',
      failedToStart: 'Failed to start or continue the course',
    },
    
    success: {
      loginSuccess: 'Login Successful',
      accountCreated: 'Account Created',
      profileUpdated: 'Profile Updated',
      passwordReset: 'Password Reset',
      emailVerified: 'Email Verified',
      courseEnrolled: 'Course Enrolled',
      courseCompleted: 'Course Completed',
      quizPassed: 'Quiz Passed',
      feedbackSubmitted: 'Feedback Submitted',
      progressUpdated: 'Progress Updated',
      lessonCompleted: 'Lesson marked as completed',
    },
    
    progress: {
      trackProgress: "Track Your Progress",
      trackProgressDesc: "Update your progress for this lesson",
      currentProgress: "Current Progress",
      updateProgress: "Update Progress",
      saveProgress: "Save Progress",
      markComplete: "Mark Complete",
      markIncomplete: "Mark Incomplete",
      progressUpdated: "Progress Updated",
      progressUpdatedDesc: "Your progress has been updated to {progress}%",
      lessonCompleted: "Lesson Completed",
      lessonCompletedDesc: "Congratulations on completing this lesson!",
      error: "Error",
      errorUpdating: "Failed to update your progress. Please try again."
    },
    
    incentives: {
      title: "Incentives",
      points: "Points",
      achievements: "Achievements",
      yourPoints: "Your Points",
      totalPoints: "Total Points",
      earnedPoints: "Points Earned",
      pointsHistory: "Points History",
      recentPoints: "Recent Points",
      pointsEarned: "Points Earned",
      pointsUsed: "Points Used",
      pointsBalance: "Points Balance",
      achievementsEarned: "Achievements Earned",
      achievementsAvailable: "Available Achievements",
      achievementUnlocked: "Achievement Unlocked!",
      achievementProgress: "Achievement Progress",
      earnedOn: "Earned on",
      lockedAchievement: "Locked Achievement",
      completeToUnlock: "Complete to unlock",
      milestone: "Milestone",
      reward: "Reward",
      noAchievements: "No achievements yet",
      noPoints: "No points earned yet",
      howToEarn: "How to earn points",
      learnMore: "Learn more about incentives"
    },
    
    nav: {
      home: 'Home',
      courses: 'Courses',
      profile: 'Profile',
      dashboard: 'Dashboard',
    },
    
    quiz: {
      start: 'Start Quiz',
      submit: 'Submit Quiz',
      passed: 'Quiz Passed',
      failed: 'Quiz Failed',
      tryAgain: 'Try Again',
      review: 'Review Quiz',
      question: 'Question',
    },
    
    app: {
      title: 'Kuriftu Learning Village',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
    },
  },
  
  am: {
    common: {
      welcome: 'የመማር መንደር እንኳን ደህና መጡ',
      loading: 'በመጫን ላይ...',
      error: 'ስህተት ተፈጥሯል',
      submit: 'አስገባ',
      cancel: 'ይቅር',
      save: 'አስቀምጥ',
      delete: 'ሰርዝ',
      edit: 'አርትዕ',
      view: 'እይታ',
      search: 'ፈልግ',
      filter: 'አጣራ',
      sort: 'መደብ',
      notFound: 'አልተገኘም',
      accessDenied: 'መዳረሻ ተከልክሏል',
      success: 'ተሳክቷል',
      failure: 'አልተሳካም',
      created: 'ተፈጥሯል',
      updated: 'ተዘምኗል',
      deleted: 'ተሰርዟል',
    },
    
    auth: {
      signIn: 'ግባ',
      signUp: 'ይመዝገቡ',
      signOut: 'ውጣ',
      forgotPassword: 'የይለፍ ቃል ረሳኽው?',
      resetPassword: 'የይለፍ ቃል ዳግም አስጀምር',
      emailPlaceholder: 'ኢሜል አድራሻዎን ያስገቡ',
      passwordPlaceholder: 'የይለፍ ቃልዎን ያስገቡ',
      confirmPassword: 'የይለፍ ቃል ያረጋግጡ',
      fullName: 'ሙሉ ስም',
      phone: 'ስልክ ቁጥር',
      role: 'ሚና',
      department: 'ክፍል',
      position: 'ቦታ',
      experience: 'የልምድ ደረጃ',
      verifyEmail: 'ኢሜል ያረጋግጡ',
      verifyCode: 'የማረጋገጫ ኮድ',
      newAccount: 'አዲስ መለያ ይፍጠሩ',
      hasAccount: 'አስቀድመው መለያ አለዎት?',
      signInWithEmail: 'በኢሜል ይግቡ',
      signInWithGoogle: 'በጉግል ይግቡ',
      login: 'ግባ',
      logout: 'ውጣ',
      register: 'ተመዝገብ',
      email: 'ኢሜይል',
      password: 'የይለፍ ቃል',
    },
    
    courses: {
      myCourses: 'የእኔ ኮርሶች',
      allCourses: 'ሁሉም ኮርሶች',
      title: 'ኮርሶች',
      all: 'ሁሉም ኮርሶች',
      my: 'የእኔ ኮርሶች',
      enroll: 'ተመዝገብ',
      continue: 'መማር ይቀጥሉ',
      review: 'ገምግም',
      completed: 'ተጠናቋል',
      inProgress: 'በሂደት ላይ',
      notStarted: 'አልተጀመረም',
      markAsCompleted: 'እንደተጠናቀቀ ምልክት አድርግ',
      markAsIncomplete: 'እንዳልተጠናቀቀ ምልክት አድርግ',
      lessons: 'ትምህርቶች',
      quizzes: 'ፈተናዎች',
      progress: 'እድገት',
      hours: 'ሰዓታት',
      difficulty: 'የሚጠብቀው ጊዜ',
      beginner: 'ጀማሪ',
      intermediate: 'መካከለኛ',
      advanced: 'የላቀ',
      expert: 'ባለሙያ',
      take: 'ፈተና ይውሰዱ',
      notFound: 'ኮርሱ አልተገኘም',
    },
    
    dashboard: {
      welcomeBack: 'እንኳን ደህና መጡ',
      continueLesson: 'ትምህርቱን ይቀጥሉ',
      recentActivity: 'የቅርብ ጊዜ እንቅስቃሴዎች',
      upcomingCourses: 'የሚመጡ ኮርሶች',
      completedCourses: 'የተጠናቀቁ ኮርሶች',
      achievementEarned: 'ያገኙት ውጤት',
      progressSummary: 'የእድገት ማጠቃለያ',
      todayPlan: 'የዛሬ እቅድ',
      announcements: 'ማስታወቂያዎች',
      suggestedCourses: 'የተጠቆሙ ኮርሶች',
    },
    
    progress: {
      trackProgress: "ሂደትዎን ይከታተሉ",
      trackProgressDesc: "ለዚህ ትምህርት ሂደትዎን ያዘምኑ",
      currentProgress: "የአሁኑ ሂደት",
      updateProgress: "ሂደት ያዘምኑ",
      saveProgress: "ሂደት ያስቀምጡ",
      markComplete: "እንደተጠናቀቀ ምልክት ያድርጉ",
      markIncomplete: "እንዳልተጠናቀቀ ምልክት ያድርጉ",
      progressUpdated: "ሂደት ተዘምኗል",
      progressUpdatedDesc: "ሂደትዎ ወደ {progress}% ተዘምኗል",
      lessonCompleted: "ትምህርት ተጠናቋል",
      lessonCompletedDesc: "ይህን ትምህርት በማጠናቀቅዎ እንኳን ደስ አለዎት!",
      error: "ስህተት",
      errorUpdating: "ሂደትዎን ማዘመን አልተሳካም። እባክዎ እንደገና ይሞክሩ።"
    },
    
    incentives: {
      title: "ማበረታቻዎች",
      points: "ነጥቦች",
      achievements: "ስኬቶች",
      yourPoints: "የእርስዎ ነጥቦች",
      totalPoints: "ጠቅላላ ነጥቦች",
      earnedPoints: "ያገኙት ነጥቦች",
      pointsHistory: "የነጥብ ታሪክ",
      recentPoints: "የቅርብ ጊዜ ነጥቦች",
      pointsEarned: "የተገኙ ነጥቦች",
      pointsUsed: "የተጠቀሙባቸው ነጥቦች",
      pointsBalance: "የነጥብ ቀሪ",
      achievementsEarned: "ያገኙት ስኬቶች",
      achievementsAvailable: "የሚገኙ ስኬቶች",
      achievementUnlocked: "ስኬት ተከፍቷል!",
      achievementProgress: "የስኬት እድገት",
      earnedOn: "የተገኘበት ቀን",
      lockedAchievement: "የተቆለፈ ስኬት",
      completeToUnlock: "ለመክፈት ይጨርሱ",
      milestone: "ደረጃ",
      reward: "ሽልማት",
      noAchievements: "እስካሁን ስኬቶች የሉም",
      noPoints: "እስካሁን ነጥቦች አልተገኙም",
      howToEarn: "ነጥቦችን እንዴት ማግኘት ይቻላል",
      learnMore: "ስለ ማበረታቻዎች ተጨማሪ ይወቁ"
    },
    
    app: {
      title: 'የኩሪፍቱ መማሪያ መንደር',
      loading: 'በመጫን ላይ...',
      error: 'ስህተት',
      success: 'ተሳክቷል',
      save: 'አስቀምጥ',
      cancel: 'ሰርዝ',
      delete: 'አጥፋ',
      edit: 'አርትዕ',
      back: 'ተመለስ',
      next: 'ቀጣይ',
      previous: 'ቀዳሚ',
      submit: 'አስገባ',
    },
  },
  
  or: {
    common: {
      welcome: 'Mana Barnootaatti Baga Nagaan Dhuftan',
      loading: 'Fe\'aa jira...',
      error: 'Dogoggora uumameera',
      submit: 'Galchi',
      cancel: 'Haqi',
      save: 'Ol-kaa\'i',
      delete: 'Haqi',
      edit: 'Gulaali',
      view: 'Ilaali',
      search: 'Barbaadi',
      filter: 'Calleessi',
      sort: 'Tarreessi',
      notFound: 'Hin argamne',
      accessDenied: 'Daawwachuuf Mirga Hin qabdu',
      success: 'Milkaa\'e',
      failure: 'Hin milkoofne',
      created: 'Uumameera',
      updated: 'Haaromfameera',
      deleted: 'Haqameera',
    },
    
    auth: {
      signIn: 'Seeni',
      signUp: 'Of Galmaa\'i',
      signOut: 'Ba\'i',
      forgotPassword: 'Jecha Iccitii Irraanfatte?',
      resetPassword: 'Jecha Iccitii Haaromsi',
      emailPlaceholder: 'Imeelii kee galchi',
      passwordPlaceholder: 'Jecha iccitii kee galchi',
      confirmPassword: 'Jecha Iccitii Mirkaneessi',
      fullName: 'Maqaa Guutuu',
      phone: 'Lakkoofsa Bilbilaa',
      role: 'Gahee',
      department: 'Damee',
      position: 'Iddoo',
      experience: 'Sadarkaa Muuxannoo',
      verifyEmail: 'Imeelii Mirkaneessi',
      verifyCode: 'Koodii Mirkaneessaa',
      newAccount: 'Herrega Haaraa Uumi',
      hasAccount: 'Duraan herrega qabda?',
      signInWithEmail: 'Imeeliidhaan Seeni',
      signInWithGoogle: 'Google\'iin Seeni',
      login: 'Seeni',
      logout: 'Ba\'i',
      register: 'Galmaa\'i',
      email: 'Email',
      password: 'Jecha Iccitii',
    },
    
    courses: {
      title: 'Koorsiiwwan',
      all: 'Koorsiiwwan Hunda',
      my: 'Koorsiiwwan Koo',
      enroll: 'Galmaa\'i',
      continue: 'Barachuun Itti fufi',
      review: 'Irra Deebii',
      completed: 'Xumurame',
      inProgress: 'Adeemsarra',
      notStarted: 'Hin Jalqabamne',
      markAsCompleted: 'Akka Xumuramaatti Mallatteessi',
      markAsIncomplete: 'Akka Hin Xumuramin Mallatteessi',
      lessons: 'Barnoota',
      quizzes: 'Qormaata',
      progress: 'Fooyya\'iinsa',
      hours: 'sa\'aatii',
      difficulty: 'Yeroo Tilmaamame',
      beginner: 'Jalqabaa',
      intermediate: 'Giddugaleessa',
      advanced: 'Guddate',
      expert: 'Ogaa',
    },
    
    dashboard: {
      welcomeBack: 'Baga Deebitee',
      continueLesson: 'Barnoota Itti Fufi',
      recentActivity: 'Hojii Dhiyoo',
      upcomingCourses: 'Koorsiiwwan Dhufuu',
      completedCourses: 'Koorsiiwwan Xumuramanii',
      achievementEarned: 'Galata Argatte',
      progressSummary: 'Cuunfaa Fooya\'ina',
      todayPlan: 'Karoora Har\'aa',
      announcements: 'Beeksisawwan',
      suggestedCourses: 'Koorsiiwwan Eeraman',
    },
    
    progress: {
      trackProgress: "Tarkaanfii Keessan Hordofaa",
      trackProgressDesc: "Tarkaanfii barnoota kanaaf jiru haaromsi",
      currentProgress: "Tarkaanfii Ammaa",
      updateProgress: "Tarkaanfii Haaromsi",
      saveProgress: "Tarkaanfii Olkaa'i",
      markComplete: "Akka Xumurame Mallatteessi",
      markIncomplete: "Akka Hinxummuramin Mallatteessi",
      progressUpdated: "Tarkaanfiin Haaromfameera",
      progressUpdatedDesc: "Tarkaanfiin kee {progress}% haaromfameera",
      lessonCompleted: "Barnoonni Xumuramee jira",
      lessonCompletedDesc: "Barnoota kana xumuruuf baga gammadde!",
      error: "Dogoggora",
      errorUpdating: "Tarkaanfii keessan haaromsuu hin dandeenye. Maaloo irra deebi'uun yaalaa."
    },
    
    incentives: {
      title: "Jajjabeessituu",
      points: "Qabxiiwwan",
      achievements: "Galmeewwan",
      yourPoints: "Qabxiiwwan Keessan",
      totalPoints: "Qabxiiwwan Waliigalaa",
      earnedPoints: "Qabxiiwwan Argattan",
      pointsHistory: "Seenaa Qabxiiwwanii",
      recentPoints: "Qabxiiwwan Dhiyeenya",
      pointsEarned: "Qabxiiwwan Argame",
      pointsUsed: "Qabxiiwwan Fayyadame",
      pointsBalance: "Haftee Qabxiiwwanii",
      achievementsEarned: "Galmeewwan Argattan",
      achievementsAvailable: "Galmeewwan Argamuu danda'an",
      achievementUnlocked: "Galmeen bantameera!",
      achievementProgress: "Fooya'iinsa Galmee",
      earnedOn: "Guyyaa Argame",
      lockedAchievement: "Galmee Cufaa",
      completeToUnlock: "Banuf xumurii",
      milestone: "Sadarkaa",
      reward: "Badhaasa",
      noAchievements: "Hanga ammaatti galmeen hin jiru",
      noPoints: "Hanga ammaatti qabxiin hin argamne",
      howToEarn: "Qabxiiwwan akkamitti argachuu akka dandeessan",
      learnMore: "Waa'ee jajjabeessituu caalatti baraa"
    },
    
    app: {
      title: 'Kuriftu Ganda Barnoota',
      loading: 'Fe\'aa jira...',
      error: 'Dogoggora',
      success: 'Milkaa\'e',
      save: 'Olkaa\'i',
      cancel: 'Haqi',
      delete: 'Balleessi',
      edit: 'Gulaali',
      back: 'Duubatti',
      next: 'Itti Aanee',
      previous: 'Kan Duraa',
      submit: 'Galchi',
    },
  }
};

// Language provider component
export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return (saved && (saved === 'en' || saved === 'am' || saved === 'or')) ? saved : 'en';
  });
  
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);
  
  const t = (key: string, args?: Record<string, any>): string => {
    const keys = key.split('.');
    try {
      let value: any = translations[language];
      
      // Navigate through the nested object
      for (const k of keys) {
        if (!value || typeof value !== 'object') return key;
        value = value[k];
      }
      
      if (typeof value !== 'string') return key;
      
      // Replace placeholders
      if (args) {
        return Object.keys(args).reduce((str, argKey) => {
          return str.replace(`{${argKey}}`, String(args[argKey]));
        }, value);
      }
      
      return value;
    } catch (e) {
      // Fallback to English
      try {
        let value: any = translations.en;
        for (const k of keys) {
          if (!value || typeof value !== 'object') return key;
          value = value[k];
        }
        return typeof value === 'string' ? value : key;
      } catch {
        return key;
      }
    }
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext; 