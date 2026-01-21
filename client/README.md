# 🚀 AI Website Builder

An AI-powered web app that lets users generate, edit, preview, version, and publish websites using natural language prompts.

Built with **React + TypeScript + Vite** on the frontend and **Node.js + Express + Prisma + PostgreSQL** on the backend.

---

## ✨ Features
- AI-generated websites from text prompts  
- Prompt-based revisions & live preview  
- Version history with rollback  
- Device preview (desktop/tablet/mobile)  
- Credit-based usage system  
- Publicly published projects  

---

## 🛠 Tech Stack
**Frontend:** React, TypeScript, Vite, Tailwind CSS  
**Backend:** Node.js, Express, Prisma, PostgreSQL  
**AI:** OpenAI-compatible models  

---

## 🚀 Setup

### Backend
```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run server

### Frontend
```bash
cd client
npm install
npm run dev

ENVIRONMENT VARIABLES
server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
OPENAI_API_KEY=your_api_key

client/.env
VITE_API_BASE_URL=http://localhost:3000
