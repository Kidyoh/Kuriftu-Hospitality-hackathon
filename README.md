# 🌐 Kuriftu Hospitality L&D Platform

A customized, AI-powered **Learning & Development platform** built for **Kuriftu Hotel** and presented at the **Hospitality Hackathon**. This platform is designed to revolutionize staff training and onboarding in the hospitality sector through intelligent content delivery, AI-generated assessments, and real-time analytics.

---

## 🏨 Project Purpose

Kuriftu is committed to setting new standards in African hospitality. This platform supports that mission by enabling:

- Seamless **onboarding** of new hotel staff
- Continuous **training and upskilling**
- AI-enhanced **learning experiences**
- Centralized **management and review workflows**
- Multilingual support for diverse teams

---

## ✨ Features

### ✅ Core Modules
- **Role-Based Onboarding** – Personalized training flows for receptionists, kitchen staff, housekeeping, and management.
- **Course Management** – Structured learning paths with modular video-based content.
- **Progress Tracking** – Staff can view their progress, while managers get oversight on team performance.

### 🧠 AI Capabilities
- **AI-Generated Quizzes** – Automatically create assessments from training videos using OpenAI.
- *(Coming Soon)* Smart next-lesson recommendations based on user engagement and performance.

### 📹 Video Learning Management
- Upload and control training videos by department or topic.
- Mark lessons as required or optional.

### ↺ Admin Workflows
- Multi-role system: Admins, Instructors, Staff
- Course submission and review approval flows
- Visibility and version control

### 🌍 Multilingual Support
- UI and course content adaptable to multiple languages
- Ideal for multinational teams or teams with diverse linguistic backgrounds

### 📊 Analytics Dashboard
- Completion rates, quiz scores, and time-on-task insights
- Exportable training reports for HR and leadership

---

## 🛠️ Tech Stack

| Layer         | Tech Used                     |
|---------------|-------------------------------|
| Frontend      | React + TypeScript + Vite     |
| Styling       | Tailwind CSS + shadcn/ui      |
| Backend       | Supabase (PostgreSQL, Auth, Storage) |
| AI Services   | OpenAI API (quiz generation)  |
| Hosting       | Lovable (temp); planned cloud/VPS |

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd <your-project-directory>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm run dev
```

### 4. Environment Variables

Create a `.env` file and set your credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

---

## 🧪 Development Status

| Feature                      | Status       |
|-----------------------------|--------------|
| User Onboarding             | ✅ Complete  |
| Course Video Management     | ✅ Complete  |
| AI Quiz Generation          | ➶ In Progress |
| Admin Review Workflow       | ➶ In Progress |
| Multilingual UI             | ➶ In Progress |
| Analytics Dashboard         | ➶ In Progress |

---

## 🤝 Contributing

This project was developed as part of the **Hospitality Hackathon** for **Kuriftu Hotel**. Contributions to improve its scale, design, and capabilities are welcome. Please fork and submit a pull request, or open an issue to discuss enhancements.

---

## 📜 License

MIT License. See the `LICENSE` file for full details.

---

> *"We believe Africa’s hospitality deserves world-class learning solutions. This platform is a step toward that vision."*

Built with ❤️ for Kuriftu Hotel by hospitality innovators and technologists.

