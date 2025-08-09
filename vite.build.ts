import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import { nodeExternals } from 'rollup-plugin-node-externals'

export default defineConfig({
  plugins: [
    reactRouter(),
    nodeExternals({
      deps: false,
      peerDeps: false,
      optDeps: false,
    }),
  ],
  ssr: {
    target: 'webworker',
  },
  build: {
    target: 'esnext',
  },
})
