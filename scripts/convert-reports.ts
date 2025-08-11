#!/usr/bin/env -S deno run --allow-read --allow-write

import { walk } from 'jsr:@std/fs@1.0.8'

const reports: any[] = []

for await (
  const entry of walk('reports', {
    exts: ['.json'],
    maxDepth: 1,
  })
) {
  if (entry.isFile) {
    const content = await Deno.readTextFile(entry.path)
    const data = JSON.parse(content)

    // Extract username from filename (remove .json extension)
    const filename = entry.name.replace('.json', '')

    reports.push({
      username: filename,
      email: `${filename}@lenovo.com`,
      ...data,
    })
  }
}

// Sort by username for consistency
reports.sort((a, b) => a.username.localeCompare(b.username))

await Deno.writeTextFile(
  'reports.json',
  JSON.stringify(reports, null, 2),
)

console.log(`✅ Converted ${reports.length} reports to reports.json`)
