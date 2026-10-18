# CaseJourney — GlobalAI Hackathon Submission (POC Edition)

> **CaseJourney** is an AI-powered case interview simulator that mirrors top-tier management consulting interviews  with real-time bidirectional voice interaction, dynamic progressive exhibits, automated multidimensional scoring, and post-session **MindFlow** reasoning tree analysis.

This repository is a self-contained, turnkey Proof-of-Concept (POC) built specifically for the **GlobalAI Hackathon**.

---

## 💡 The Core Problem & Our Solution

Traditional case interview preparation has two major flaws:
1. **Static casebooks** (reading answers in PDF books) cannot replicate the pressure, spontaneity, and back-and-forth dialogue of an MBB partner interview.
2. **Standard mock prep tools** reveal the solution only after a candidate fails. They don't capture *where* and *why* the candidate's reasoning diverged from the optimal path.

**CaseJourney solves this:**
- **Live Voice Partner (Alex Park)**: An empathetic yet rigorous AI interviewer who listens, probes, clarifies, and guides you through 5 structured case phases.
- **Progressive Exhibit Canvas**: Dynamic charts and tables unlock only when you formulate hypotheses and ask for specific data.
- **MindFlow & Solution Architecture**: Traces the candidate's exact train of thought and overlays it side-by-side against the optimal McKinsey solution tree, exposing every explored hypothesis, dead end, and missed insight.

---

## 🎯 What's Included in this Submission

### 1. Instant Role Switcher (Zero-friction evaluation)
- **Candidate Mode (Aditya)**:
  - Full candidate experience: select consulting cases (including the flagship *EV Charging Infrastructure in Gurgaon*).
  - Practice with live audio conversation and interactive exhibits.
  - Review the post-interview **MindFlow** reasoning tree, dimensional scoring breakdown, and coach feedback.
- **Admin Mode (Admin)**:
  - Case Authoring Workbench: create custom cases, set multi-phase interview rules, build framework trees with parent-child links, and configure evaluation rubrics.
- **Floating Role Bar**: Seamlessly toggle between **Aditya** (Candidate) and **Admin** modes from the top bar with no login or authentication walls.

### 2. Core Platform Capabilities
- 🎙️ **Live Voice Agent**: Speech synthesis & recognition turn-taking with live acoustic pulse visualizations and natural pause tolerance.
- 📊 **Progressive Canvas**: Data exhibits (market segmentation, fleet distributions, financial models) reveal contextually based on candidate questions.
- 🧠 **MindFlow & Solution Architecture Map**: Interactive visual graph displaying the full solution framework, highlighting:
  - Strong explored logic
  - Visited vs. missed branches
  - Optimal consulting path comparison
- 📈 **Performance Debrief**: Spider radar chart, pillar score breakdown (Structure, Quant, Clarity, Synthesis), and tactical consulting coaching tips.
- 🛠️ **Case Creation Studio**: Visual authoring suite to define case prompts, clarifying questions, exhibit triggers, and rubric criteria.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Installation
Clone or open this repository folder and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
The repository includes a ready-to-run `.env` file pre-configured with test database and Claude API access.

If you wish to configure your own credentials:
```bash
cp .env.example .env
```
Key variables:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase client anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase server service-role key
- `VITE_ANTHROPIC_API_KEY`: Anthropic Claude API key
- `VITE_CLAUDE_MODEL`: Default model (`claude-sonnet-4-6`)
- `ADMIN_SECRET` / `VITE_ADMIN_SECRET`: Secret token for admin workbench actions

### 3. Launch Development Server
```bash
npm run dev
```

This starts both services concurrently:
- **Frontend (Vite + React)**: [http://localhost:5173](http://localhost:5173)
- **API Server (Express)**: [http://localhost:3001](http://localhost:3001)

---

## 🧭 Step-by-Step Demo Walkthrough

### Candidate Journey (Alex Park Interview)
1. Open [http://localhost:5173](http://localhost:5173).
2. Select **Aditya** on the role picker or top switcher bar.
3. On the dashboard, select the **EV Charging Infrastructure in Gurgaon** case.
4. Review the briefing (objective, background, target firm) and click **Start Case Interview**.
5. Choose your session parameters (difficulty, time limit) and start:
   - Alex Park greets you via voice and presents the initial business problem.
   - Speak your response naturally using your microphone, or type in the bottom text bar.
   - State your hypotheses (e.g. asking for population, vehicle count, or dwell time data) to trigger dynamic canvas exhibits.
6. Conclude the interview or hit End Session:
   - Inspect the **MindFlow** reasoning map and **Solution Architecture** debrief.
   - Toggle between **Your Path** and **Optimal Path** to analyze where your analysis matched MBB standards.

### Admin Journey (Case Studio)
1. Click **"Switch to Admin"** on the top switcher bar.
2. In the Admin Dashboard, click **Create Case** or edit an existing case.
3. Define the prompt, industry, difficulty, framework nodes, clarifying questions, and scoring criteria.
4. Save the case to have it immediately available in the candidate case catalog.

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Candidate & Admin Frontend                  │
│       React 19 · TypeScript · Vite · Tailwind CSS · Motion   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐       ┌──────────────────────┐
│     Express Backend API      │       │       Supabase       │
│  Case simulation & synthesis │       │  PostgreSQL + Auth   │
│  Dynamic canvas state engine │       │  Case & turn records │
└──────────────┬───────────────┘       └──────────────────────┘
               ▼
┌──────────────────────────────┐
│ Gemini Messages API.         │
│  Interviewer personality &   │
│  dynamic reasoning analysis  │
└──────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts.
- **Backend**: Node.js & Express REST API managing case orchestration, prompt injection, and canvas triggers.
- **AI Engine**: Gemini Model with tailored prompts modeling elite MBB interview standards.
- **Database**: Supabase PostgreSQL for case metadata, framework graphs, and session logs.

