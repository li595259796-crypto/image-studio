# Leo Image Studio

AI-powered image generation and editing web application.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS 4
- **Auth**: NextAuth.js v5 (Credentials provider + JWT)
- **Database**: Vercel Postgres (Neon) + Drizzle ORM
- **Storage**: Vercel Blob
- **AI**: 147ai.com API (Gemini Flash model)
- **Deployment**: Vercel

## Features

- Text-to-image generation with aspect ratio and quality controls
- Image editing with 1-2 source images + prompt
- Image gallery with pagination, download, delete
- User authentication (email + password)
- Per-user daily/monthly usage quotas

## Getting Started

### Prerequisites

- Node.js 18+
- Vercel account (for Postgres + Blob)

### Setup

```bash
# Clone
git clone https://github.com/li595259796-crypto/image-studio.git
cd image-studio

# Install
npm install

# Environment variables
cp .env.local.example .env.local
# Fill in your values

# Push database schema
npx drizzle-kit push

# Run dev server
npm run dev
```

### Environment Variables

See `.env.local.example` for required variables.

## Project Structure

```text
app/
  (auth)/          # Login, signup pages
  (dashboard)/     # Generate, edit, gallery pages
  actions/         # Server actions
  api/auth/        # NextAuth + signup API
components/        # UI components
lib/
  db/              # Drizzle schema, queries
  auth.ts          # NextAuth config
  image-api.ts     # 147ai.com API client
  storage.ts       # Vercel Blob operations
  quota.ts         # Usage quota logic
```

## Deployment

Push to `master` branch triggers automatic Vercel deployment.

## License

Private
