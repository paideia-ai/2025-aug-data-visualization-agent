# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React application for interactive data analysis and visualization using Observable Plot and Anthropic's Claude.

- **Data Analysis Agent**: Interactive data analysis with Observable runtime, pre-loaded datasets, and AI-powered assistance
  - System prompt location: `/app/ai/config.ts:11-104`

## Common Development Commands

**This project exclusively uses Deno runtime.**

```bash
# Install dependencies
deno install

# Start development server (frontend on port 5173)
deno task dev


# Build for production
deno task build

# Preview production build
deno task preview

# Format code (auto-runs in pre-commit hook)
deno fmt

# Lint code
deno lint
```

## Architecture

### Frontend-Backend Split

- **Frontend**: React app on port 5173 (Vite dev server)
- **Backend**: API routes handled by React Router framework mode
- **Proxy**: Vite proxies `/api` requests to backend

### Key API Endpoints

- `POST /api/data-analysis-agent` - Data analysis with Observable runtime tools

### Observable Runtime Pattern

The Observable runtime uses lazy evaluation - variables only compute when observed. Key patterns:

- Add observers to force computation: `module.variable(observer).define(...)`
- Force all computations: `await runtime._compute()`
- Declare dependencies explicitly in define() calls
- See `docs/observable-runtime-patterns.md` for detailed patterns

### Pre-loaded Sample Data Functions

Sample data generators are defined in `/src/DataAnalysisAgent.jsx:96-198`. Available functions:

1. **getVisitorCountByHourRange(hourStart, hourEnd)**
   - Website visitor analytics for specified hour range (0-23)
   - Returns: Array of `{hour, visitors, uniqueVisitors, pageViews}`
   - Traffic peaks at 10am and 3pm

2. **getProductSalesByCategory(category)**
   - Product sales data, optionally filtered by category
   - Categories: 'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'
   - Returns: Array of `{category, product, unitsSold, revenue, profit, rating}`

3. **getCustomerDemographics(ageMin, ageMax)**
   - Customer demographic data for age range
   - Returns: Array of `{ageGroup, segment, region, customerCount, avgSpending, retentionRate}`
   - Segments: 'Budget', 'Standard', 'Premium'
   - Regions: 'North', 'South', 'East', 'West', 'Central'

4. **getMonthlySalesData(startMonth, endMonth, year)**
   - Monthly sales time series data
   - Returns: Array of `{month, monthNumber, year, sales, orders, averageOrderValue, newCustomers}`
   - Includes seasonal variations (holiday peaks in Nov/Dec)

## Tech Stack

- **React** 19.0.0
- **Vite** 7.1.0 for build tooling
- **Observable Plot** 0.6.17 for visualizations
- **Arquero** 8.0.3 for data manipulation
- **AI SDK** 5.0.8 with Anthropic provider 2.0.1
- **Deno** 2.x runtime with TypeScript 5.8.3

## Environment Requirements

- **Deno 2.x runtime** (required)
- **API Keys**: Most AI provider API keys are typically already configured in the environment. Use `echo $ANTHROPIC_API_KEY` to verify if needed.
- Git hooks configured for `deno fmt` and `deno task build` on pre-commit

- upstream/, which is gitignored, contain useful big sdk/framework/library's clone, so you should search them when understanding latest api, or debug. if needed, you could also git clone repos there yourself. prefer this over web search
