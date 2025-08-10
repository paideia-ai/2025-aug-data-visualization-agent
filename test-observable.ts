// Test Observable runtime + stdlib in Deno directly
import { Runtime } from '@observablehq/runtime'
import { Library } from '@observablehq/stdlib'

console.log('🚀 Testing Observable runtime with stdlib in Deno...')

try {
  // Create library and runtime
  const library = new Library()
  console.log('✅ Library created successfully')

  const runtime = new Runtime(library)
  console.log('✅ Runtime created successfully')

  // Create a module
  const module = runtime.module()
  console.log('✅ Module created successfully')

  // Define a simple variable
  const simpleVar = module.variable()
  simpleVar.define('test', [], () => {
    return 'Hello from Observable!'
  })
  console.log('✅ Simple variable defined')

  // Define a variable that uses stdlib's require
  const requireVar = module.variable()
  requireVar.define('testRequire', ['require'], (require) => {
    console.log('✅ Require function available:', typeof require)
    return 'Require is working'
  })
  console.log('✅ Variable with require dependency defined')

  // Test data manipulation
  const dataVar = module.variable()
  dataVar.define('data', [], () => {
    return [
      { name: 'Alice', value: 10 },
      { name: 'Bob', value: 20 },
      { name: 'Charlie', value: 15 },
    ]
  })
  console.log('✅ Data variable defined')

  // Test computed variable
  const computedVar = module.variable()
  computedVar.define('sum', ['data'], (data) => {
    return data.reduce((sum, d) => sum + d.value, 0)
  })
  console.log('✅ Computed variable defined')

  // Force evaluation by adding observers
  const observer = {
    pending() {
      console.log('⏳ Computing...')
    },
    fulfilled(value) {
      console.log('✅ Result:', value)
    },
    rejected(error) {
      console.error('❌ Error:', error)
    },
  }

  module.variable(observer).define('result', ['test', 'sum'], (test, sum) => {
    return `${test} - Total: ${sum}`
  })

  console.log('\n✅ All tests passed! Observable runtime works in Deno.')
} catch (error) {
  console.error('❌ Error:', error)
  console.error('Stack:', error.stack)
}
