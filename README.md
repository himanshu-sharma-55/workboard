# Workboard

**One workspace for PM, engineering, and QA — same view, no persona dashboards.**

Workboard is the shared operating layer for an account: work items, ownership, and status in one place. Who owns the work and who it is waiting on is visible on the list. Requests, decisions, and blockers stay on the item, so delivery does not fragment across tools.

This is not a ticket tracker. It is shared visibility for the people already doing the work.

## How it works

1. **Account** — a client, launch, or engagement (for example, Dell).
2. **Work item** — a piece of delivery under that account, with an objective and a status.
3. **Owner** — one person accountable for delivering it.
4. **Requests** — review, discuss, or approve. These are not ownership.
5. **The card** — comments, updates, decisions, questions, issues, and links live here.

Intake → In discussion → Ready → In progress → Blocked → Completed.

## What’s included

- **Overview** — waiting on you, owned by you, unassigned, and filters that match status names on the row
- **Accounts** — work grouped by client or launch, with involved people and waiting/issue signals
- **Work item** — feed, owner, requests, objective, issues, decisions, questions, links
- **Team** — who owns what and what’s waiting on them; open someone’s work in the same overview
- **Mentions & notifications** — `@` on the card, plus alerts for requests and activity
- **Search** — jump to an account or work item (`⌘K`)

Everyone uses the same screens. Filters personalize the list; they do not create a different product per role.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) and React 19
- [MongoDB](https://www.mongodb.com/) with Mongoose
- [NextAuth](https://next-auth.js.org/) (credentials)
- Tailwind CSS 4

## Setup

You need Node.js 20+ and a MongoDB instance (local or Atlas).

```bash
git clone https://github.com/himanshu-sharma-55/workboard.git
cd workboard
cp .env.example .env.local
```

Set `MONGODB_URI` and a real `NEXTAUTH_SECRET` (for example `openssl rand -base64 32`). Keep `NEXTAUTH_URL` as `http://localhost:3000` for local use.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a workspace, or load the demo:

```bash
npm run seed
```

| Email | Role | Password |
| --- | --- | --- |
| `mgr@demo.local` | Manager | `demo1234` |
| `pm@demo.local` | PM | `demo1234` |
| `dev@demo.local` | Engineering | `demo1234` |
| `qa@demo.local` | QA | `demo1234` |

## License

[MIT](LICENSE) © Himanshu Sharma
