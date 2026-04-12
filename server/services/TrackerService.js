import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import https from 'node:https'
import { MIN_HOURS } from '../config/constants.js'

const LOCAL_CARDS_PATH = path.resolve('./data/tracker-cards.json')
const EXAMPLE_CARDS_PATH = path.resolve('./data/tracker-cards.example.json')
const BASE_URL = process.env.TRACKER_BASE_URL
const EMAIL = process.env.TRACKER_EMAIL
const TOKEN = process.env.TRACKER_API_TOKEN
const ACCOUNT_ID = process.env.TRACKER_ACCOUNT_ID
const PROJECT_KEY = process.env.TRACKER_PROJECT_KEY
const DEMO_MODE = process.env.DEMO_MODE === 'true'

function authHeader() {
  const credentials = `${EMAIL}:${TOKEN}`
  return `Basic ${Buffer.from(credentials).toString('base64')}`
}

async function searchIssuePage(jql, nextPageToken) {
  const payload = {
    jql,
    maxResults: 100,
    fields: ['summary', 'description', 'labels', 'components', 'issuetype', 'created', 'resolutiondate', 'status', 'timespent', 'timeoriginalestimate', 'comment'],
  }
  if (nextPageToken) payload.nextPageToken = nextPageToken

  const body = JSON.stringify(payload)
  const rawText = await new Promise((resolve, reject) => {
    const urlObj = new URL(`${BASE_URL}/rest/api/3/search/jql`)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Tracker API error: ${res.statusCode} ${data}`))
        else resolve(data)
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
  return JSON.parse(rawText)
}

async function searchIssues(jql) {
  const allIssues = []
  let nextPageToken = null

  do {
    const page = await searchIssuePage(jql, nextPageToken)
    allIssues.push(...(page.issues ?? []))
    nextPageToken = page.nextPageToken ?? null
  } while (nextPageToken)

  return { issues: allIssues }
}

function extractText(adfNode) {
  if (!adfNode) return ''
  if (adfNode.type === 'text') return adfNode.text ?? ''
  if (adfNode.content) return adfNode.content.map(extractText).join(' ')
  return ''
}

async function fetchResolutionComments(issueKey) {
  const rawText = await new Promise((resolve, reject) => {
    const urlObj = new URL(`${BASE_URL}/rest/api/3/issue/${issueKey}/comment?maxResults=50&orderBy=created`)
    const req = https.request({
      hostname: urlObj.hostname,
      path: `${urlObj.pathname}${urlObj.search}`,
      method: 'GET',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Tracker comment error ${res.statusCode} on ${issueKey}`))
        else resolve(data)
      })
    })
    req.on('error', reject)
    req.end()
  })
  const data = JSON.parse(rawText)
  return (data.comments ?? [])
    .map(c => extractText(c.body))
    .filter(Boolean)
    .join(' ')
    .trim()
}


async function fetchMyWorklogHours(issueKey) {
  const rawText = await new Promise((resolve, reject) => {
    const urlObj = new URL(`${BASE_URL}/rest/api/3/issue/${issueKey}/worklog`)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'GET',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Tracker worklog error ${res.statusCode} on ${issueKey}`))
        else resolve(data)
      })
    })
    req.on('error', reject)
    req.end()
  })
  const data = JSON.parse(rawText)
  const myLogs = (data.worklogs ?? []).filter(w => w.author?.accountId === ACCOUNT_ID)
  const totalSeconds = myLogs.reduce((sum, w) => sum + (w.timeSpentSeconds ?? 0), 0)
  return totalSeconds > 0 ? totalSeconds / 3600 : null
}

function processCard(issue) {
  const summary = issue.fields.summary ?? ''
  const description = extractText(issue.fields.description)

  return {
    id: issue.key,
    summary,
    description,
    labels: issue.fields.labels ?? [],
    components: (issue.fields.components ?? []).map((c) => c.name),
    type: issue.fields.issuetype?.name ?? 'Task',
    fullText: `${summary} ${description}`.trim(),
    hoursToResolve: null,
    resolvedAt: issue.fields.resolutiondate ?? null,
  }
}

export async function listProjects() {
  const meRes = await fetch(`${BASE_URL}/rest/api/3/myself`, {
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
  })
  if (!meRes.ok) throw new Error(`Tracker auth failed: ${meRes.status}`)
}

export async function fetchAllTrainingCards(onProgress) {
  console.log('[fetchAllTrainingCards] Verificando acesso ao tracker...')
  await listProjects()
  const jql = `project = ${PROJECT_KEY} AND "Ajustado por[Short text]" ~ "${ACCOUNT_ID}" AND status = Done ORDER BY created DESC`
  const data = await searchIssues(jql)
  const cards = []
  const BATCH_SIZE = 10
  for (let i = 0; i < data.issues.length; i += BATCH_SIZE) {
    const batch = data.issues.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (issue) => {
        const card = processCard(issue)
        card.hoursToResolve = await fetchMyWorklogHours(issue.key)
        const resolutionText = await fetchResolutionComments(issue.key).catch(() => '')
        if (resolutionText) card.fullText = `${card.fullText} ${resolutionText}`.trim()
        return card
      })
    )
    cards.push(...results)
    onProgress?.({ fetched: cards.length, total: data.issues.length })
    await new Promise((r) => setImmediate(r))
    if (i + BATCH_SIZE < data.issues.length) await new Promise(r => setTimeout(r, 500))
  }
  return cards
}

function loadExampleCards() {
  return JSON.parse(fs.readFileSync(EXAMPLE_CARDS_PATH, 'utf8'))
}

function demoOpenCards(labels) {
  const cards = loadExampleCards()
  const filtered = labels ? cards.filter((c) => c.labels.includes(labels)) : cards
  // Remove hoursToResolve para simular cards ainda não resolvidos
  return filtered.map(({ hoursToResolve: _h, ...card }) => ({ commentCount: 0, ...card }))
}

export async function getTrainingCards() {
  const localPath = DEMO_MODE ? EXAMPLE_CARDS_PATH : LOCAL_CARDS_PATH
  const raw = fs.existsSync(localPath)
    ? JSON.parse(fs.readFileSync(localPath, 'utf8'))
    : await fetchAllTrainingCards()
  return raw.map((c) => ({
    ...c,
    hoursToResolve: Math.max(c.hoursToResolve ?? 0, MIN_HOURS),
  }))
}

function buildLabelClause(labels) {
  if (!labels) return ''
  const list = labels.split(',').map((l) => l.trim()).filter(Boolean)
  if (list.length === 0) return ''
  if (list.length === 1) return ` AND labels = "${list[0]}"`
  return ` AND labels in (${list.map((l) => `"${l}"`).join(', ')})`
}

export async function getOpenCards(epicKey, labels) {
  if (DEMO_MODE) return demoOpenCards(labels)
  const labelClause = buildLabelClause(labels)
  const jql = `parentEpic = ${epicKey}${labelClause} AND statusCategory = "To Do" ORDER BY created DESC`
  console.log('[getOpenCards] JQL:', jql)
  const data = await searchIssues(jql)
  console.log('[getOpenCards] issues retornados:', data.issues?.length ?? 0)
  return data.issues.map((issue) => {
    const card = processCard(issue)
    card.commentCount = issue.fields.comment?.total ?? 0
    return card
  })
}

export async function getLabels(maxResults = 500) {
  const localPath = DEMO_MODE ? EXAMPLE_CARDS_PATH : LOCAL_CARDS_PATH
  if (fs.existsSync(localPath)) {
    const cards = JSON.parse(fs.readFileSync(localPath, 'utf8'))
    const all = cards.flatMap((c) => c.labels ?? []).filter(Boolean)
    const unique = [...new Set(all)].sort((a, b) => a.localeCompare(b))
    if (unique.length > 0) return unique
  }

  if (DEMO_MODE) return []

  // Fallback: API do tracker com timeout de 8s
  const urlObj = new URL(`${BASE_URL}/rest/api/3/label?maxResults=${maxResults}`)
  const rawText = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlObj.hostname,
      path: `${urlObj.pathname}${urlObj.search}`,
      method: 'GET',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      timeout: 8000,
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Tracker API ${res.statusCode}`))
        else resolve(data)
      })
    })
    req.on('timeout', () => { req.destroy(new Error('Timeout ao buscar labels do tracker')) })
    req.on('error', reject)
    req.end()
  })
  const data = JSON.parse(rawText)
  return (data.values ?? []).filter((v) => typeof v === 'string').sort()
}

export async function getOpenCardsByStory(parentKey, labels) {
  if (DEMO_MODE) return demoOpenCards(labels)
  const labelClause = buildLabelClause(labels)
  const jql = `parent = ${parentKey}${labelClause} AND statusCategory = "To Do" ORDER BY created DESC`
  console.log('[getOpenCardsByStory] JQL:', jql)
  const data = await searchIssues(jql)
  console.log('[getOpenCardsByStory] issues retornados:', data.issues?.length ?? 0)
  return data.issues.map((issue) => {
    const card = processCard(issue)
    card.commentCount = issue.fields.comment?.total ?? 0
    return card
  })
}
