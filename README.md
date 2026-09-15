# Workboard

Shared-truth dashboard for fast-moving teams: parents (e.g. Dell) → packets (reqs) with discussion, asks, issues, references, and timeline — so everyone sees what's planned and happening without the asking chain.

## Stack

- Next.js (App Router)
- MongoDB + Mongoose
- NextAuth (credentials)

## Setup

1. Copy env and set Mongo + secret:

```bash
cp .env.example .env.local
```

2. Install & run:

```bash
npm install
npm run dev
```

3. Optional — seed the Dell demo flow:

```bash
npm run seed
```

Demo logins (password `demo1234`):

- `mgr@demo.local` — Manager  
- `pm@demo.local` — PM  
- `dev@demo.local` — Dev  
- `qa@demo.local` — Tester  

Open [http://localhost:3000](http://localhost:3000).

## What's in this version

- Workspace signup / login (hosted multi-workspace on your Mongo)
- Dashboard: Planned / Happening / Blocked / Done
- Parents → packets
- Discussion, decisions, open questions
- Tag asks: own / check / discuss / approve
- Issues + references (Jira/docs links)
- Timeline of status and events

## Later (not in this build)

- Self-host + customer-owned DB / custom domain
- SSO, AI summaries, Jira two-way sync
