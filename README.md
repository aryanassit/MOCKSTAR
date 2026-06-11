
<div align="center">

# 🎙️ AI Mock Interview Platform

**Resume-driven, voice-controlled mock interviews with real-time body language analysis**

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

---

## What This Does

Upload your resume. The system reads it, generates 5 personalized interview questions, and conducts a live session — no clicking "Submit", just talking. When you pause for 4–5 seconds, it knows you're done. After the session, it grades both **what you said** (via LLM) and **how you presented yourself** (posture, eye contact via computer vision).

---

## Tech Stack

### Frontend
| Tool | Role |
|---|---|
| **React.js** | UI framework |
| **Hark.js** | Voice Activity Detection (VAD) — detects 4–5 sec silence to auto-submit |
| **MediaRecorder API** | Captures audio + video in-browser |
| **Tailwind CSS** | Styling |

### Backend
| Tool | Role |
|---|---|
| **FastAPI (Python)** | REST API server |
| **PyPDF2** | Extracts raw text from uploaded PDF resumes |
| **Gemini API** | Generates interview questions from resume context; grades verbal answers |
| **OpenAI Whisper API** | Transcribes audio responses to text |
| **OpenCV** | Frame-by-frame video processing |
| **Google MediaPipe** | Detects shoulder alignment, gaze, and posture |

### Auth & Database
| Tool | Role |
|---|---|
| **Supabase** | Managed PostgreSQL — stores user profiles, auth sessions, interview logs |
| **Google OAuth** | Authentication |

### Hosting
| Service | What runs on it |
|---|---|
| **AWS EC2 / GCP Compute Engine** | Python backend (FastAPI + CV processing) |
| **Free Tier** | Both platforms — $0 hosting cost |

---

## Architecture

This project uses a **"Fake Real-Time" post-processing pattern** — the key design decision that makes CV analysis work on low-end hardware.

```
User Browser (React)
│
├── Loads resume PDF → sends to backend
├── Receives 5 AI-generated questions
├── Records audio + video via MediaRecorder
├── Hark.js monitors mic → detects 4–5 sec silence → auto-submits answer
│
└── After session ends:
        │
        ▼
FastAPI Backend (AWS/GCP)
│
├── Whisper API → transcribes audio to text
├── Gemini API → grades transcription against question
├── OpenCV + MediaPipe → analyzes video frames for:
│       ├── Shoulder alignment (posture)
│       └── Gaze direction (eye contact)
│
└── Synthesizes feedback metric card → saves to Supabase
```

**Why post-processing instead of real-time CV?**  
Running MediaPipe frame-by-frame live would crash standard laptop hardware. Instead, the frontend gives the illusion of a live session (VAD handles the conversational flow), and the heavy CV work only runs server-side after the call ends.

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project (free tier)
- Gemini API key
- OpenAI API key (for Whisper)

### 1. Clone

```bash
git clone https://github.com/your-username/ai-mock-interview.git
cd ai-mock-interview
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `/backend`:

```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `/frontend`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

---

## Deployment

### Backend — AWS EC2 (Free Tier)

```bash
# On your EC2 instance (Ubuntu 22.04 recommended)
sudo apt update && sudo apt install python3.11 python3-pip -y

git clone https://github.com/your-username/ai-mock-interview.git
cd ai-mock-interview/backend

pip install -r requirements.txt

# Run with gunicorn for production
pip install gunicorn
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Set environment variables on EC2 via `.env` or AWS Systems Manager Parameter Store.

Open port `8000` in your EC2 Security Group inbound rules.

---

### Backend — Google Cloud Compute Engine (Free Tier)

```bash
# On your GCE instance (e2-micro, us-central1 or us-west1 for free tier)
sudo apt update && sudo apt install python3.11 python3-pip -y

git clone https://github.com/your-username/ai-mock-interview.git
cd ai-mock-interview/backend

pip install -r requirements.txt
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Allow port `8000` via GCP Firewall Rules (`VPC Network > Firewall`).

---

### Frontend — Vercel (Recommended)

```bash
npm install -g vercel
cd frontend
vercel
```

Set these environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL` → your EC2/GCE public IP or domain

---

### Database — Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the schema migrations in `/supabase/migrations/`
3. Enable Google OAuth under `Authentication > Providers`
4. Set redirect URL to your frontend domain

---

## Constraints & Known Limits

- Sessions capped at **10 per user** to stay within Supabase free-tier row limits
- CV analysis runs **post-session only** — no live feedback during the interview
- Resume input is **PDF only**
- Fixed at **5 questions per session**
- Free-tier EC2/GCE instances have limited RAM — avoid running multiple concurrent sessions on a single instance

---

## Project Team

| Name | Roll No. | Phase |
|---|---|---|
| Aman | 2401010141 | Auth, DB schema, PDF extraction, FastAPI backend, CV integration |
| Aryan | 2401010005 | Auth, React UI, MediaRecorder, VAD tuning |
| Gaurav | 2401010009 | Gemini feedback synthesis, testing, deployment |

**Faculty Mentor:** Ms. Neetu Chauhan

---

## Roadmap

- [ ] Real-time CV feedback (requires server-grade hardware)
- [ ] Support for more resume formats (DOCX, LinkedIn PDF)
- [ ] Multi-round interview simulation
- [ ] Peer comparison analytics
