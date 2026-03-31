# KidoLearn Platform

A fully-featured kids' educational learning platform with JWT authentication, facial recognition login, interactive experiments, AI-powered quizzes, and course progress tracking.

## Architecture

### Monorepo Structure

```
artifacts/
  api-server/     - Express REST API server (port 8080)
  kido-learn/     - React + Vite frontend (port 20858, preview at /)
  flask-hands/    - Python Flask + MediaPipe hand detection backend (port 5000)
lib/
  api-spec/       - OpenAPI spec + Orval codegen
  db/             - Drizzle ORM + PostgreSQL schema
```

### Tech Stack

**Frontend (artifacts/kido-learn)**
- React + Vite + TypeScript
- wouter for routing
- @tanstack/react-query for data fetching
- framer-motion for animations
- face-api.js for facial recognition
- canvas-confetti for celebration effects
- shadcn/ui components
- Tailwind CSS with custom kid-friendly theme
- All 6 camera games use **browser-side MediaPipe** (`@mediapipe/tasks-vision` CDN) — no Flask dependency for gesture detection

**Hand Detection (Browser-Side)**
- `@mediapipe/tasks-vision` loaded dynamically from jsDelivr CDN
- `useGestureDetection` hook: starts camera, runs `HandLandmarker.detectForVideo()` in rAF loop
- Gesture classification: pointing, open_palm, peace, fist, thumbs_up, none
- Sounds: `sounds.ts` (Web Audio API), TTS: `tts.ts` (SpeechSynthesis)
- Components: `GestureOverlay` (camera PiP), `GestureCursor` (hand cursor), `GestureTutorial` (modal)

**Hand Detection Backend (artifacts/flask-hands) — Legacy**
- Python Flask + Flask-CORS (port 5000) — still running but no longer used for camera games
- MediaPipe Tasks API v0.10 with `hand_landmarker.task` model

**Backend (artifacts/api-server)**
- Express.js + TypeScript
- JWT authentication (jsonwebtoken + bcryptjs)
- Drizzle ORM with PostgreSQL
- OpenAI API for AI-powered quizzes and recommendations
- Built with esbuild

**Database**
- PostgreSQL via Replit's built-in DB
- Tables: users, courses, lessons, user_progress, sessions

### Key Features

1. **Authentication**: Username/password login + JWT tokens
2. **Face Login**: face-api.js (TinyFaceDetector + FaceLandmark68Tiny + FaceRecognitionNet)
   - Face models stored at `artifacts/kido-learn/public/models/`
3. **Random Experiments**: Every lesson visit shows a randomly-selected interactive experiment from a pool of 7 types (number line, patterns, memory, counting, word match, anagram, sorting)
4. **AI Quizzes**: OpenAI gpt-4o-mini generates age-appropriate multiple choice quizzes per topic
5. **Progress Tracking**: Lesson completion stored per user per course

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT signing secret
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI Integrations key (auto-set)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI Integrations base URL (auto-set)
- `PORT` - Server port (auto-set)

### API Routes

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (authenticated)
- `POST /api/face/register` - Register face descriptor (authenticated)
- `POST /api/face/verify` - Verify face (returns matched user)
- `GET /api/courses` - List all courses
- `GET /api/courses/:id` - Get course with lessons
- `GET /api/progress` - Get user progress (authenticated)
- `POST /api/progress/:courseId` - Update lesson progress (authenticated)
- `POST /api/ai/quiz` - Generate AI quiz (authenticated)
- `GET /api/ai/recommend` - Get AI course recommendations (authenticated)

### Database Schema

- **users**: id, username, email, password_hash, first_name, last_name, role, face_descriptor (jsonb), has_face
- **courses**: id, title, description, subject, grade_level, thumbnail, total_lessons, duration_minutes, difficulty
- **lessons**: id, course_id, title, content, order, duration_minutes, video_url
- **user_progress**: id, user_id, course_id, lesson_id, completed, completed_at

### Frontend Pages

- `/auth` - Login / Register / Face Login
- `/` - Home dashboard with progress overview
- `/courses` - Course browser with search and filter
- `/courses/:id` - Course detail with lesson list
- `/courses/:courseId/lessons/:lessonId` - Lesson page with experiment + AI quiz
- `/profile` - User stats + face login setup

### Seeded Courses

1. Math Adventures (Grade 3-5, beginner)
2. Science Explorer (Grade 4-6, intermediate)
3. Reading & Writing Stars (Grade 2-4, beginner)
4. World Geography Quest (Grade 5-7, intermediate)
5. Coding for Kids (Grade 4-7, beginner)
6. Art & Creativity (Grade 1-5, beginner)
