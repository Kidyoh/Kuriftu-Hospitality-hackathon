import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Divider,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  Quiz as QuizIcon,
  EmojiEvents as AchievementsIcon,
  AccountCircle as AccountIcon,
  Payment as PaymentIcon,
  Help as HelpIcon,
} from '@mui/icons-material';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Courses',
    question: 'How do I start a course?',
    answer: 'To start a course, navigate to the course catalog, select your desired course, and click "Enroll". Once enrolled, you can access the course content from your dashboard or the "My Courses" section.'
  },
  {
    category: 'Courses',
    question: 'Can I access course content offline?',
    answer: 'Currently, our platform requires an internet connection to access course content. However, you can download certain course materials like PDFs and worksheets for offline use.'
  },
  {
    category: 'Quizzes',
    question: 'What happens if I fail a quiz?',
    answer: 'If you don\'t pass a quiz, don\'t worry! You can retake it after reviewing the material. There\'s no limit to the number of attempts, and only your highest score will be recorded.'
  },
  {
    category: 'Quizzes',
    question: 'How are quiz scores calculated?',
    answer: 'Quiz scores are calculated based on the percentage of correct answers. Most quizzes require a score of 70% or higher to pass. Perfect scores (100%) may earn you bonus achievement points.'
  },
  {
    category: 'Achievements',
    question: 'How do I earn achievements?',
    answer: 'Achievements are earned by completing specific goals, such as finishing courses, maintaining study streaks, or getting perfect quiz scores. Check your achievements page to see all available badges and your progress.'
  },
  {
    category: 'Account',
    question: 'How do I update my profile information?',
    answer: 'You can update your profile information by clicking on your avatar in the top right corner and selecting "Profile Settings". Here you can modify your personal information, notification preferences, and privacy settings.'
  },
  {
    category: 'Account',
    question: 'How do I reset my password?',
    answer: 'To reset your password, click the "Forgot Password" link on the login page. Enter your email address, and we\'ll send you instructions to create a new password.'
  },
  {
    category: 'Payment',
    question: 'What payment methods are accepted?',
    answer: 'We accept major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. All payments are processed securely through our payment partners.'
  },
  {
    category: 'Technical',
    question: 'What are the system requirements?',
    answer: 'Our platform works best with modern web browsers (Chrome, Firefox, Safari, Edge) and a stable internet connection. For video content, we recommend a minimum internet speed of 5 Mbps.'
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Courses: <SchoolIcon />,
  Quizzes: <QuizIcon />,
  Achievements: <AchievementsIcon />,
  Account: <AccountIcon />,
  Payment: <PaymentIcon />,
  Technical: <HelpIcon />,
};

export default function Support() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | false>('Courses');

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFaqs = categories.map(category => ({
    category,
    items: filteredFaqs.filter(faq => faq.category === category)
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header Section */}
      <Box mb={6} textAlign="center">
        <Typography variant="h3" component="h1" gutterBottom>
          Help & Support
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={4}>
          Find answers to common questions about using our learning platform
        </Typography>
        
        {/* Search Bar */}
        <Paper
          component="form"
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: 600,
            mx: 'auto',
            mb: 4
          }}
        >
          <TextField
            fullWidth
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ '& fieldset': { border: 'none' } }}
          />
        </Paper>

        {/* Category Chips */}
        <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mb={4}>
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              icon={categoryIcons[category]}
              onClick={() => setExpandedCategory(expandedCategory === category ? false : category)}
              variant={expandedCategory === category ? "filled" : "outlined"}
              sx={{ m: 0.5 }}
            />
          ))}
        </Box>
      </Box>

      {/* FAQ Sections */}
      <Grid container spacing={3}>
        {groupedFaqs.map(({ category, items }) => (
          items.length > 0 && (
            <Grid item xs={12} key={category}>
              <Accordion
                expanded={expandedCategory === category}
                onChange={() => setExpandedCategory(expandedCategory === category ? false : category)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    backgroundColor: 'background.default',
                    '&.Mui-expanded': {
                      minHeight: 64,
                    },
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    {categoryIcons[category]}
                    <Typography variant="h6">{category}</Typography>
                    <Chip 
                      label={`${items.length} items`} 
                      size="small" 
                      sx={{ ml: 2 }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    {items.map((faq, index) => (
                      <React.Fragment key={faq.question}>
                        <Box py={2}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {faq.question}
                          </Typography>
                          <Typography variant="body1" color="text.secondary">
                            {faq.answer}
                          </Typography>
                        </Box>
                        {index < items.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )
        ))}
      </Grid>

      {/* Contact Support Section */}
      <Box mt={6} textAlign="center">
        <Typography variant="h6" gutterBottom>
          Can't find what you're looking for?
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Contact our support team for additional help
        </Typography>
        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
          support@kuriftu.com
        </Typography>
      </Box>
    </Container>
  );
} 