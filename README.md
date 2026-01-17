# FocalFlow

RSVP speed reading app that displays one word at a time, allowing you to read at 300-900+ words per minute.

**Live at [focalflow.dev](https://focalflow.dev)**

## What is RSVP?

Rapid Serial Visual Presentation (RSVP) is a speed reading technique where words are displayed one at a time at a fixed focal point. This eliminates eye movement, allowing your brain to process text faster.

## Features

- **Speed control** - Read from 100 to 1200 WPM
- **Focal point highlighting** - Colored anchor letter helps your eye lock onto the optimal recognition point
- **Smart timing** - Longer words and punctuation get extra display time for better comprehension
- **Catch Me Up** - AI-generated summaries of what you've read (speed read or paragraph format)
- **Progress sync** - Pick up where you left off across devices
- **PWA support** - Install as an app on mobile or desktop
- **Dark mode** - Easy on the eyes
- **File support** - Upload PDF, TXT, or Markdown files

## Tech Stack

- **Next.js 16** with App Router
- **Supabase** for auth and database
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Mistral AI** for summaries

## Getting Started

1. Clone the repo
   ```bash
   git clone https://github.com/villagaiaimpacthub/focal-flow.git
   cd focal-flow
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `MISTRAL_API_KEY` - For AI summaries (optional)

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Setup

Run the migrations in `supabase/migrations/` to set up your database schema.

## License

MIT
