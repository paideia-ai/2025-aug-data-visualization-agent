# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React application demonstrating data visualization with Observable Plot and AI-powered chat features using Anthropic's Claude. The app has multiple modes:

- **Data Analysis Agent**: Interactive data analysis with Observable runtime
- **AI Plot Teacher**: Generates data visualizations on demand with tool-based approach
- **Observable Plot Demo**: Static dashboard with various charts
- **AI Chat**: Basic chat interface with Claude

## Common Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (frontend on port 5173)
pnpm run dev

# Start backend server (API on port 3001)
pnpm run server

# Build for production
pnpm run build
```

## Architecture

### Frontend-Backend Split

- **Frontend**: React app on port 5173 (Vite dev server)
- **Backend**: Express server on port 3001 (handles AI API calls)
- **Proxy**: Vite proxies `/api` requests to backend

### Key API Endpoints

- `POST /api/chat` - Basic chat with Claude Sonnet
- `POST /api/plot-teacher` - Plot generation with `draw_plot` tool (client-side execution)
- `POST /api/data-analysis-agent` - Data analysis with Observable runtime tools

### Tool Execution Pattern (AI Plot Teacher)

1. Server defines tools without execution functions
2. Tool calls stream to client with parameters
3. Client intercepts and executes code in sandboxed iframe
4. Results sent back as tool outputs

### Observable Runtime Pattern

The Observable runtime uses lazy evaluation - variables only compute when observed. Key patterns:

- Add observers to force computation: `module.variable(observer).define(...)`
- Force all computations: `await runtime._compute()`
- Declare dependencies explicitly in define() calls
- See `docs/observable-runtime-patterns.md` for detailed patterns

## Tech Stack

- **React** 19.0.0-rc.1 with React Router
- **Vite** 7.1.0 for build tooling
- **Observable Plot** 0.6.17 for visualizations
- **Arquero** 8.0.3 for data manipulation
- **AI SDK** 5.0.8 with Anthropic provider
- **Express** 5.1.0 for backend server

## Environment Requirements

- `ANTHROPIC_API_KEY` environment variable required for AI features
- Node.js with pnpm package manager
