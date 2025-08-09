# Observable Plot + AI Chat Demo

A React application demonstrating data visualization with Observable Plot and AI-powered chat using Anthropic's Claude.

## Project Structure

### Core Files

```
/
├── index.html                 # Entry HTML file
├── vite.config.js            # Vite configuration with React plugin
├── server.js                 # Express server for AI chat API
└── src/
    ├── main.jsx              # React app entry point
    ├── index.css             # Global styles
    ├── App.jsx               # Main app with routing
    └── App.css               # App navigation styles
```

### Features

#### 1. AI Plot Teacher (`/src/AIPlotTeacher.jsx`) - DEFAULT PAGE

- **Purpose**: Interactive AI teacher that generates data visualizations on demand
- **Components**:
  - `AIPlotTeacher.jsx` - Main component with tool execution
  - `AIPlotTeacher.css` - Split-screen layout styles
- **Features**:
  - Tool-based plot generation using `draw_plot` tool
  - Client-side sandboxed code execution
  - Split view: chat on left, plots on right
  - Automatic synthetic data generation
  - Real-time plot rendering
- **Technical Details**:
  - Tool calls forwarded from server without execution
  - Client interprets and executes `draw_plot` tool calls
  - Sandboxed evaluation using iframes for isolation
  - Each plot execution is isolated (no global pollution)
- **Server Endpoint**: `/api/plot-teacher`
  - System prompt with detailed Observable Plot examples
  - Tool definition without server-side execution

#### 2. Observable Plot Demo (`/src/ObservableDemo.jsx`)

- **Purpose**: Demonstrates data visualization capabilities
- **Components**:
  - `ObservableDemo.jsx` - Main component with charts
  - `ObservableDemo.css` - Styles with purple gradient theme
- **Features**:
  - Sales performance dashboard
  - Product distribution charts
  - Time series analysis
  - Correlation matrix heatmap
  - Data summary statistics table
- **Libraries**: Uses Observable Plot and Arquero for data manipulation

#### 3. AI Chat (`/src/ChatPage.jsx`)

- **Purpose**: Chat interface with Claude Sonnet
- **Components**:
  - `ChatPage.jsx` - Chat UI component
  - `ChatPage.css` - Chat-specific styles
- **Features**:
  - Real-time streaming responses
  - Message history
  - Loading states
  - Error handling
- **API**: Connects to `/api/chat` endpoint

### Server Architecture

**Express Server (`server.js`)**:

- Runs on port 3001
- Endpoints:
  - `POST /api/chat` - Basic chat endpoint
  - `POST /api/plot-teacher` - Plot generation with tool support
- Uses AI SDK v5 with Anthropic provider
- Model: `claude-sonnet-4-20250514`
- Streams responses using `pipeUIMessageStreamToResponse`

### Tool Calling Architecture (AI Plot Teacher)

**How it works**:

1. Server defines `draw_plot` tool without execution function
2. Tool calls are streamed to client with input parameters
3. Client intercepts tool calls and executes code locally
4. Code runs in sandboxed iframe for isolation
5. Result is sent back as tool output
6. Conversation continues with tool results

### Client-Server Communication

- **Transport**: `DefaultChatTransport` from AI SDK
- **Message Format**: UI messages with `parts` array
- **Streaming**: Server-sent events for real-time updates
- **State Management**: `useChat` hook manages message state

## Running the Application

1. Start the backend server:
   ```bash
   pnpm run server
   ```

2. Start the development server:
   ```bash
   pnpm run dev
   ```

3. Open http://localhost:5173

## Dependencies

### Main Libraries

- React 19.0.0-rc.1
- Vite 7.1.0
- Express 5.1.0
- @ai-sdk/anthropic 2.0.1
- @ai-sdk/react 2.0.8
- @observablehq/plot 0.6.17
- arquero 8.0.3
- zod 4.0.15 (for tool schema validation)

## Environment

- Requires `ANTHROPIC_API_KEY` environment variable
- Uses pnpm for package management
