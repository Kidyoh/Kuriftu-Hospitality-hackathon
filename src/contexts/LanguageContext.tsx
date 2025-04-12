import React, { createContext, useContext, useState, useEffect } from 'react';

// Available languages
export type Language = 'en' | 'am' | 'or';

// Language names for display
export const languageNames = {
  en: 'English',
  am: 'አማርኛ',
  or: 'Oromiffa'
};

// Interface for the context value
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

// Translations for each language
const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    'app.title': 'Kuriftu Learning Village',
    'app.loading': 'Loading...',
    'app.error': 'Error',
    'app.success': 'Success',
    'app.save': 'Save',
    'app.cancel': 'Cancel',
    'app.delete': 'Delete',
    'app.edit': 'Edit',
    'app.back': 'Back',
    'app.next': 'Next',
    'app.previous': 'Previous',
    'app.submit': 'Submit',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    
    // Navigation
    'nav.home': 'Home',
    'nav.courses': 'Courses',
    'nav.profile': 'Profile',
    'nav.dashboard': 'Dashboard',
    
    // Courses
    'courses.title': 'Courses',
    'courses.all': 'All Courses',
    'courses.my': 'My Courses',
    'courses.enroll': 'Enroll Now',
    'courses.continue': 'Continue Learning',
    'courses.review': 'Review Course',
    'courses.completed': 'Completed',
    'courses.inProgress': 'In Progress',
    'courses.notStarted': 'Not Started',
    'courses.markAsCompleted': 'Mark as Completed',
    'courses.markAsIncomplete': 'Mark as Incomplete',
    'courses.lessons': 'Lessons',
    'courses.quizzes': 'Quizzes',
    'courses.progress': 'Progress',
    'courses.hours': 'hrs',
    'courses.difficulty': 'Est. Time',
    'courses.beginner': 'Beginner',
    'courses.intermediate': 'Intermediate',
    'courses.advanced': 'Advanced',
    'courses.expert': 'Expert',
    'courses.take': 'Take Quiz',
    'courses.notFound': 'Course not found',
    'courses.notFoundDescription': 'The course you\'re looking for doesn\'t exist or you don\'t have access to it.',
    'courses.backToCourses': 'Back to Courses',
    'courses.noLessons': 'No lessons available',
    'courses.noLessonsDescription': 'This course doesn\'t have any lessons yet.',
    'courses.noQuizzes': 'No quizzes available',
    'courses.noQuizzesDescription': 'This course doesn\'t have any quizzes yet.',
    
    // Quiz-related
    'quiz.start': 'Start Quiz',
    'quiz.submit': 'Submit Quiz',
    'quiz.passed': 'Quiz Passed',
    'quiz.failed': 'Quiz Failed',
    'quiz.tryAgain': 'Try Again',
    'quiz.review': 'Review Quiz',
    'quiz.question': 'Question',
    
    // Errors
    'error.failedToLoad': 'Failed to load data',
    'error.failedToUpdate': 'Failed to update',
    'error.loginRequired': 'You must be logged in',
    'error.failedToStart': 'Failed to start or continue the course',
    
    // Success messages
    'success.lessonCompleted': 'Lesson marked as completed',
    'success.courseCompleted': 'Congratulations! You\'ve completed this course!',
    'success.progressUpdated': 'Progress has been updated',
  },
  
  am: {
    // General
    'app.title': 'ኩሪፍቱ የመማሪያ መንደር',
    'app.loading': 'በመጫን ላይ...',
    'app.error': 'ስህተት',
    'app.success': 'ተሳክቷል',
    'app.save': 'አስቀምጥ',
    'app.cancel': 'ሰርዝ',
    'app.delete': 'አጥፋ',
    'app.edit': 'አርትዕ',
    'app.back': 'ተመለስ',
    'app.next': 'ቀጣይ',
    'app.previous': 'ቀዳሚ',
    'app.submit': 'አስገባ',
    
    // Auth
    'auth.login': 'ግባ',
    'auth.logout': 'ውጣ',
    'auth.register': 'ተመዝገብ',
    'auth.email': 'ኢሜይል',
    'auth.password': 'የይለፍ ቃል',
    
    // Navigation
    'nav.home': 'መነሻ',
    'nav.courses': 'ኮርሶች',
    'nav.profile': 'መገለጫ',
    'nav.dashboard': 'ዳሽቦርድ',
    
    // Courses
    'courses.title': 'ኮርሶች',
    'courses.all': 'ሁሉም ኮርሶች',
    'courses.my': 'የእኔ ኮርሶች',
    'courses.enroll': 'ተመዝገብ',
    'courses.continue': 'መማር ይቀጥሉ',
    'courses.review': 'ገምግም',
    'courses.completed': 'ተጠናቋል',
    'courses.inProgress': 'በሂደት ላይ',
    'courses.notStarted': 'አልተጀመረም',
    'courses.markAsCompleted': 'እንደተጠናቀቀ ምልክት አድርግ',
    'courses.markAsIncomplete': 'እንዳልተጠናቀቀ ምልክት አድርግ',
    'courses.lessons': 'ትምህርቶች',
    'courses.quizzes': 'ፈተናዎች',
    'courses.progress': 'እድገት',
    'courses.hours': 'ሰዓታት',
    'courses.difficulty': 'የሚጠብቀው ጊዜ',
    'courses.beginner': 'ጀማሪ',
    'courses.intermediate': 'መካከለኛ',
    'courses.advanced': 'የላቀ',
    'courses.expert': 'ባለሙያ',
    'courses.take': 'ፈተና ይውሰዱ',
    'courses.notFound': 'ኮርሱ አልተገኘም',
    'courses.notFoundDescription': 'እየፈለጉት ያለው ኮርስ የለም ወይም ለመድረስ ፈቃድ የለዎትም',
    'courses.backToCourses': 'ወደ ኮርሶች ተመለስ',
    'courses.noLessons': 'ምንም ትምህርቶች የሉም',
    'courses.noLessonsDescription': 'ይህ ኮርስ እስካሁን ምንም ትምህርቶች የሉትም',
    'courses.noQuizzes': 'ምንም ፈተናዎች የሉም',
    'courses.noQuizzesDescription': 'ይህ ኮርስ እስካሁን ምንም ፈተናዎች የሉትም',
    
    // Quiz-related
    'quiz.start': 'ፈተና ጀምር',
    'quiz.submit': 'ፈተና አስገባ',
    'quiz.passed': 'ፈተና አልፏል',
    'quiz.failed': 'ፈተና አልተሳካም',
    'quiz.tryAgain': 'እንደገና ሞክር',
    'quiz.review': 'ፈተና ገምግም',
    'quiz.question': 'ጥያቄ',
    
    // Errors
    'error.failedToLoad': 'ውሂብ መጫን አልተቻለም',
    'error.failedToUpdate': 'ማዘመን አልተቻለም',
    'error.loginRequired': 'መግባት አለብህ',
    'error.failedToStart': 'ኮርሱን መጀመር ወይም መቀጠል አልተቻለም',
    
    // Success messages
    'success.lessonCompleted': 'ትምህርቱ እንደተጠናቀቀ ተመልክቷል',
    'success.courseCompleted': 'እንኳን ደስ አለህ! ይህንን ኮርስ አጠናቀሃል!',
    'success.progressUpdated': 'እድገትህ ተዘምኗል',
  },
  
  or: {
    // General
    'app.title': 'Kuriftu Ganda Barnoota',
    'app.loading': 'Fe\'aa jira...',
    'app.error': 'Dogoggora',
    'app.success': 'Milkaa\'e',
    'app.save': 'Olkaa\'i',
    'app.cancel': 'Haqi',
    'app.delete': 'Balleessi',
    'app.edit': 'Gulaali',
    'app.back': 'Duubatti',
    'app.next': 'Itti Aanee',
    'app.previous': 'Kan Duraa',
    'app.submit': 'Galchi',
    
    // Auth
    'auth.login': 'Seeni',
    'auth.logout': 'Ba\'i',
    'auth.register': 'Galmaa\'i',
    'auth.email': 'Email',
    'auth.password': 'Jecha Iccitii',
    
    // Navigation
    'nav.home': 'Mana',
    'nav.courses': 'Koorsiiwwan',
    'nav.profile': 'Profaayilii',
    'nav.dashboard': 'Daashboordii',
    
    // Courses
    'courses.title': 'Koorsiiwwan',
    'courses.all': 'Koorsiiwwan Hunda',
    'courses.my': 'Koorsiiwwan Koo',
    'courses.enroll': 'Galmaa\'i',
    'courses.continue': 'Barachuun Itti fufi',
    'courses.review': 'Irra Deebii',
    'courses.completed': 'Xumurame',
    'courses.inProgress': 'Adeemsarra',
    'courses.notStarted': 'Hin Jalqabamne',
    'courses.markAsCompleted': 'Akka Xumuramaatti Mallatteessi',
    'courses.markAsIncomplete': 'Akka Hin Xumuramin Mallatteessi',
    'courses.lessons': 'Barnoota',
    'courses.quizzes': 'Qormaata',
    'courses.progress': 'Fooyya\'iinsa',
    'courses.hours': 'sa\'aatii',
    'courses.difficulty': 'Yeroo Tilmaamame',
    'courses.beginner': 'Jalqabaa',
    'courses.intermediate': 'Giddugaleessa',
    'courses.advanced': 'Guddate',
    'courses.expert': 'Ogaa',
    'courses.take': 'Qormaata fudhachuu',
    'courses.notFound': 'Koorsiin hin argamne',
    'courses.notFoundDescription': 'Koorsiin ati barbaaddu hin jiru yookiin gahaa hin qabdu',
    'courses.backToCourses': 'Gara Koorsiiwwan deebi\'i',
    'courses.noLessons': 'Barnooti hin jiru',
    'courses.noLessonsDescription': 'Koorsiin kun ammatti barnoota hin qabu',
    'courses.noQuizzes': 'Qormaanni hin jiru',
    'courses.noQuizzesDescription': 'Koorsiin kun ammatti qormaata hin qabu',
    
    // Quiz-related
    'quiz.start': 'Qormaata Jalqabi',
    'quiz.submit': 'Qormaata Galchi',
    'quiz.passed': 'Qormaata Darbe',
    'quiz.failed': 'Qormaata Hin Darbin',
    'quiz.tryAgain': 'Ammas Yaali',
    'quiz.review': 'Qormaata Ilaalii',
    'quiz.question': 'Gaaffii',
    
    // Errors
    'error.failedToLoad': 'Ragaa baasuu hin dandeenye',
    'error.failedToUpdate': 'Haaromsuun hin danda\'amne',
    'error.loginRequired': 'Seenuu qabda',
    'error.failedToStart': 'Koorsii jalqabuu ykn itti fufuu hin danda\'amne',
    
    // Success messages
    'success.lessonCompleted': 'Barnoonni xumuramee mallatteeffame',
    'success.courseCompleted': 'Baga gammadde! Koorsii kana xumuratee!',
    'success.progressUpdated': 'Fooyya\'iinsi haaromfameera',
  }
};

// Language provider component
export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Get saved language preference or default to 'en'
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'en';
  });
  
  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);
  
  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for using the language context
export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext; 