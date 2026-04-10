#!/usr/bin/env node
// TEMP-DIAGNOSIS: Phase 2C local bench. Delete at teardown (or move to
// scripts/archive/ if kept as a regression tool).
//
// Invocation:
//   node scripts/bench-147ai.mjs <image-path> "<prompt>" [samples]
//
// Reads IMAGE_API_KEY, IMAGE_API_URL, IMAGE_MODEL from .env.local with a
// tiny manual parser — no dotenv dependency. Runs `samples` sequential
// fetch calls to 147ai, times each, prints a min/p50/p95/max summary.

import { readFileSync, statSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import path from 'node:path'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let raw
  try {
    raw = readFileSync(envPath, 'utf8')
  } catch {
    console.error(`could not read ${envPath}`)
    process.exit(1)
  }
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip matching surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function quantile(sortedNums, q) {
  if (sortedNums.length === 0) return NaN
  const idx = Math.min(sortedNums.length - 1, Math.floor((sortedNums.length - 1) * q))
  return sortedNums[idx]
}

function fmt(n) {
  return Number.isFinite(n) ? String(Math.round(n)).padStart(6) : '   N/A'
}

async function main() {
  const [, , imagePath, prompt, samplesArg] = process.argv
  if (!imagePath || !prompt) {
    console.error('usage: node scripts/bench-147ai.mjs <image-path> "<prompt>" [samples]')
    process.exit(1)
  }
  const samples = samplesArg ? Number.parseInt(samplesArg, 10) : 5
  if (!Number.isFinite(samples) || samples < 1 || samples > 50) {
    console.error('samples must be a positive integer <= 50')
    process.exit(1)
  }

  const env = loadEnvLocal()
  const apiKey = env.IMAGE_API_KEY
  const apiUrl = env.IMAGE_API_URL || 'https://147ai.com/v1/chat/completions'
  const model = env.IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
  if (!apiKey) {
    console.error('IMAGE_API_KEY missing from .env.local')
    process.exit(1)
  }

  const absImagePath = path.resolve(process.cwd(), imagePath)
  const fileBytes = statSync(absImagePath).size
  const buf = readFileSync(absImagePath)
  // Encode once outside the loop — encoding cost is not under test here.
  const base64 = buf.toString('base64')
  const dataUrl = `data:image/png;base64,${base64}`

  console.log('')
  console.log(`samples:  ${samples}`)
  console.log(`image:    ${imagePath} (${(fileBytes / (1024 * 1024)).toFixed(2)} MB)`)
  console.log(`prompt:   ${JSON.stringify(prompt)}`)
  console.log(`endpoint: ${new URL(apiUrl).host}`)
  console.log(`model:    ${model}`)
  console.log('')

  const headersMs = []
  const bodyMs = []
  const totalMs = []
  const failures = []

  for (let i = 0; i < samples; i += 1) {
    const body = JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: `Edit this image: ${prompt}` },
          ],
        },
      ],
      max_tokens: 8192,
    })

    const t0 = performance.now()
    let t1 = NaN
    let t2 = NaN
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      })
      t1 = performance.now()
      // Drain the body so bodyMs reflects the full read.
      await resp.text()
      t2 = performance.now()
      if (!resp.ok) {
        failures.push(`sample ${i + 1}: status ${resp.status}`)
        continue
      }
    } catch (err) {
      failures.push(`sample ${i + 1}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    headersMs.push(t1 - t0)
    bodyMs.push(t2 - t1)
    totalMs.push(t2 - t0)
    console.log(
      `sample ${String(i + 1).padStart(2)}: headers=${fmt(t1 - t0)}ms  body=${fmt(t2 - t1)}ms  total=${fmt(t2 - t0)}ms`
    )
  }

  const sortedH = [...headersMs].sort((a, b) => a - b)
  const sortedB = [...bodyMs].sort((a, b) => a - b)
  const sortedT = [...totalMs].sort((a, b) => a - b)

  console.log('')
  console.log(`                 min      p50      p95      max`)
  console.log(
    `headersMs   ${fmt(sortedH[0])}   ${fmt(quantile(sortedH, 0.5))}   ${fmt(quantile(sortedH, 0.95))}   ${fmt(sortedH[sortedH.length - 1])}`
  )
  console.log(
    `bodyMs      ${fmt(sortedB[0])}   ${fmt(quantile(sortedB, 0.5))}   ${fmt(quantile(sortedB, 0.95))}   ${fmt(sortedB[sortedB.length - 1])}`
  )
  console.log(
    `totalMs     ${fmt(sortedT[0])}   ${fmt(quantile(sortedT, 0.5))}   ${fmt(quantile(sortedT, 0.95))}   ${fmt(sortedT[sortedT.length - 1])}`
  )

  if (failures.length > 0) {
    console.log('')
    console.log(`${failures.length} failure(s):`)
    for (const f of failures) console.log(`  - ${f}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
