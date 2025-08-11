#!/usr/bin/env -S deno run --allow-read --allow-write

import { parse } from 'jsr:@std/csv@1.0.4'

const csvContent = await Deno.readTextFile('scores.csv')
const records = parse(csvContent, {
  skipFirstRow: true,
  columns: [
    'email',
    'team',
    'grade',
    'representation',
    'self_verification',
    'iterative_refinement',
    'world_modeling',
    'discovery',
    'choosing',
    'exploratory',
    'p1_grade',
    'p2_grade',
    'p3_grade',
    'p4_grade',
    'p5_grade',
    'p6_grade',
  ],
})

// Transform column names to match expected format
const transformedRecords = records.map((record: any) => ({
  email: record.email,
  team: record.team,
  grade: record.grade,
  representation: record.representation,
  'self-verification': record.self_verification,
  'iterative-refinement': record.iterative_refinement,
  'world-modeling': record.world_modeling,
  discovery: record.discovery,
  choosing: record.choosing,
  exploratory: record.exploratory,
  'p1.grade': record.p1_grade,
  'p2.grade': record.p2_grade,
  'p3.grade': record.p3_grade,
  'p4.grade': record.p4_grade,
  'p5.grade': record.p5_grade,
  'p6.grade': record.p6_grade,
}))

await Deno.writeTextFile(
  'scores.json',
  JSON.stringify(transformedRecords, null, 2),
)

console.log(`✅ Converted ${transformedRecords.length} scores to scores.json`)
