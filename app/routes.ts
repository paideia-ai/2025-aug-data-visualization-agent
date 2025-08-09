import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('api/data-analysis-agent', 'routes/api.data-analysis-agent.tsx'),
] satisfies RouteConfig
