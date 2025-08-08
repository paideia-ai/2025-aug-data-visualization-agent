# Observable Runtime Patterns and Behavior

## Key Concepts

The Observable runtime implements a reactive programming model where variables are computed lazily and only when observed. This document outlines the critical patterns discovered through debugging and testing.

## The Lazy Evaluation Problem

### Issue
Variables defined in Observable runtime don't automatically compute their values. The `_value` property remains `undefined` until the variable is observed or explicitly computed.

```javascript
// This creates a variable but doesn't compute it
const myVar = module.define('myFunction', [], () => {
  return (x) => x * 2
})

console.log(myVar._value) // undefined! The function hasn't been computed yet
```

### Why This Happens
Observable runtime is designed for efficiency - it only computes values that are being observed or needed by other observed variables. This prevents unnecessary computation in large reactive programs.

## Solutions

### Solution 1: Add an Observer (Recommended)

Variables with observers are automatically computed:

```javascript
// Create an observer
const observer = {
  pending() { console.log('Computing...') },
  fulfilled(value) { console.log('Got value:', value) },
  rejected(error) { console.error('Error:', error) }
}

// Define variable WITH an observer
const myVar = module.variable(observer).define('myFunction', [], () => {
  return (x) => x * 2
})

// The function will be computed automatically
```

### Solution 2: Force Computation with _compute()

For variables without observers, you can force computation:

```javascript
// Define variable without observer
const myVar = module.define('myFunction', [], () => {
  return (x) => x * 2
})

// Force the runtime to compute all variables
await runtime._compute()

// Now the value is available
console.log(myVar._value) // function (x) => x * 2
```

### Solution 3: Create Temporary Observer Nodes

For temporary computations (like evaluate functions), create a node with dependencies:

```javascript
// Create a temporary node that depends on data functions
const tempVar = module.variable(observer).define(
  'tempNode',
  ['dataFunction1', 'dataFunction2'], // Dependencies
  (dataFunction1, dataFunction2) => {
    // These functions are passed as computed values
    return dataFunction1(args)
  }
)

// The dependencies will be computed and passed to your function
```

## Common Patterns

### Pattern 1: Initial Data Setup with Observers

When setting up initial data functions, use observers to ensure they compute:

```javascript
const runtime = new Runtime(new Library())
const module = runtime.module()

// Simple observer for debugging
const observer = {
  fulfilled(value) { /* value is computed */ },
  rejected(error) { console.error(error) }
}

// Define data functions with observers
const dataFunc = module.variable(observer).define('getData', [], () => {
  return (param) => fetchData(param)
})
```

### Pattern 2: Evaluating Code with Dependencies

To evaluate code that uses other variables:

```javascript
// Define a temporary node with the required dependencies
const evalNode = module.variable(observer).define(
  `temp_${Date.now()}`,
  ['dependency1', 'dependency2'],
  (dependency1, dependency2) => {
    // Create context with dependencies
    const context = { dependency1, dependency2 }
    
    // Evaluate user code with context
    const func = new Function(...Object.keys(context), `return (${userCode})`)
    return func(...Object.values(context))
  }
)

// Force computation if needed
await runtime._compute()

// Get the result
const result = evalNode._value

// Clean up
evalNode.delete()
```

### Pattern 3: Creating Reactive Visualizations

For Observable Plot visualizations that update based on data:

```javascript
const plotObserver = {
  fulfilled(plot) {
    // Append the plot to DOM when ready
    if (plot?.tagName) {
      container.appendChild(plot)
    }
  }
}

const plotVar = module.variable(plotObserver).define(
  'myPlot',
  ['dataSource'], // Will recompute when dataSource changes
  (dataSource) => {
    return Plot.plot({
      marks: [Plot.line(dataSource, {x: 'x', y: 'y'})]
    })
  }
)
```

## Debugging Tips

1. **Check if variables have observers**: Variables without observers won't compute automatically
2. **Use console.log in define functions**: This helps verify if computation is happening
3. **Check _value property**: If it's `undefined`, the variable hasn't been computed
4. **Use runtime._compute()**: Forces all pending computations
5. **Look for circular dependencies**: These will cause ReferenceError

## Common Pitfalls

### Pitfall 1: Expecting Immediate Values
```javascript
// WRONG: Value not computed yet
const myVar = module.define('test', [], () => 42)
console.log(myVar._value) // undefined

// RIGHT: Add observer or force computation
const myVar = module.variable(observer).define('test', [], () => 42)
// OR
await runtime._compute()
```

### Pitfall 2: Not Declaring Dependencies
```javascript
// WRONG: Won't have access to otherVar
module.define('myVar', [], () => {
  return otherVar + 1 // ReferenceError!
})

// RIGHT: Declare dependencies
module.define('myVar', ['otherVar'], (otherVar) => {
  return otherVar + 1
})
```

### Pitfall 3: Forgetting to Clean Up Temporary Nodes
```javascript
// Always delete temporary nodes after use
const tempNode = module.define('temp', ...)
// ... use the node ...
tempNode.delete() // Important!
```

## Summary

The Observable runtime's lazy evaluation is a powerful feature for building efficient reactive programs, but it requires understanding these patterns:

1. **Variables need observers to compute automatically**
2. **Use `runtime._compute()` to force computation when needed**
3. **Declare dependencies explicitly in define() calls**
4. **Clean up temporary nodes to prevent memory leaks**
5. **Use observers for real-time updates and DOM manipulation**

Following these patterns ensures your Observable runtime code works reliably and efficiently.