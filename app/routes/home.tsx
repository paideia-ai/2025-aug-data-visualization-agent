import { useEffect, useState } from 'react'
import '../../src/App.css'

export default function Home() {
  const [Component, setComponent] = useState(null)

  useEffect(() => {
    // Dynamic import only on client side
    import('../../src/DataAnalysisAgent').then((module) => {
      setComponent(() => module.default)
    })
  }, [])

  if (!Component) {
    return <div>Loading Data Analysis Agent...</div>
  }

  return <Component />
}
