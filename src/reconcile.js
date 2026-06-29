// Mockup-level reconciliation logic. Deliberately simple — no fuzzy-matching
// library. Just exact matric matching plus a one-character-difference check
// with name equality to surface typo candidates.

const normName = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase()

// Parse "matric, name[, score]" lines into objects, skipping blank lines.
export function parseRegister(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [matric, name] = line.split(',').map((p) => (p || '').trim())
      return { matric, name: name || '' }
    })
    .filter((r) => r.matric)
}

export function parseMarked(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [matric, name, score] = line.split(',').map((p) => (p || '').trim())
      return { matric, name: name || '', score: score === '' || score == null ? null : Number(score) }
    })
    .filter((r) => r.matric)
}

// True when two strings differ by exactly one character (same length).
// Good enough for "handwritten A misread as 6" style typos.
function oneCharDiff(a, b) {
  if (a === b) return false
  if (a.length !== b.length) return false
  let diffs = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++
    if (diffs > 1) return false
  }
  return diffs === 1
}

// Run reconciliation. `resolved` is a Set of typo-candidate ids that the user
// has merged; those pairs are promoted into the matched bucket.
export function reconcile(registerText, markedText, resolved = new Set()) {
  const register = parseRegister(registerText)
  const marked = parseMarked(markedText)

  const markedByMatric = new Map(marked.map((m) => [m.matric, m]))
  const registerByMatric = new Map(register.map((r) => [r.matric, r]))

  const matched = []
  const missingScript = [] // signed register, no marked paper
  const unregistered = [] // marked paper, never signed

  // 1. Exact matric match → Matched.
  for (const r of register) {
    const m = markedByMatric.get(r.matric)
    if (m) {
      matched.push({ matric: r.matric, name: m.name || r.name, score: m.score })
    } else {
      missingScript.push({ ...r })
    }
  }
  for (const m of marked) {
    if (!registerByMatric.has(m.matric)) {
      unregistered.push({ ...m })
    }
  }

  // 4. Scan leftovers for typo candidates: matrics differing by one char with
  //    matching names. Pull matched pairs out of the anomaly buckets.
  const typoCandidates = []
  const usedReg = new Set()
  const usedMarked = new Set()

  for (const reg of missingScript) {
    for (const mk of unregistered) {
      if (usedMarked.has(mk.matric)) continue
      if (oneCharDiff(reg.matric, mk.matric) && normName(reg.name) === normName(mk.name)) {
        typoCandidates.push({
          id: `${reg.matric}__${mk.matric}`,
          register: reg,
          marked: mk,
          name: mk.name || reg.name,
          score: mk.score,
        })
        usedReg.add(reg.matric)
        usedMarked.add(mk.matric)
        break
      }
    }
  }

  const remainingMissing = missingScript.filter((r) => !usedReg.has(r.matric))
  const remainingUnregistered = unregistered.filter((m) => !usedMarked.has(m.matric))

  // 5. Promote any resolved typo candidates into Matched.
  const pendingTypos = []
  for (const c of typoCandidates) {
    if (resolved.has(c.id)) {
      matched.push({
        matric: c.marked.matric,
        name: c.name,
        score: c.score,
        mergedFrom: c.register.matric,
      })
    } else {
      pendingTypos.push(c)
    }
  }

  return {
    matched,
    missingScript: remainingMissing,
    unregistered: remainingUnregistered,
    typoCandidates: pendingTypos,
    totals: {
      signed: register.length,
      marked: marked.length,
      matched: matched.length,
      anomalies: remainingMissing.length + remainingUnregistered.length + pendingTypos.length,
    },
  }
}

// Look up a single matric against a reconciled report.
// Returns { status: 'matched' | 'flagged' | 'unknown', ... }
export function lookup(report, rawMatric) {
  const matric = (rawMatric || '').trim()
  if (!matric) return { status: 'empty' }

  const hit = report.matched.find((m) => m.matric === matric || m.mergedFrom === matric)
  if (hit) return { status: 'matched', name: hit.name, score: hit.score, matric: hit.matric }

  const miss = report.missingScript.find((m) => m.matric === matric)
  if (miss) {
    return {
      status: 'flagged',
      name: miss.name,
      reason: 'Missing script — you signed the register but no marked paper was found',
    }
  }

  const unreg = report.unregistered.find((m) => m.matric === matric)
  if (unreg) {
    return {
      status: 'flagged',
      name: unreg.name,
      reason: 'Unregistered paper — a paper was marked but no sign-in was recorded',
    }
  }

  const typo = report.typoCandidates.find(
    (c) => c.register.matric === matric || c.marked.matric === matric,
  )
  if (typo) {
    return {
      status: 'flagged',
      name: typo.name,
      reason: 'Possible ID typo — pending review at the admin desk',
    }
  }

  return { status: 'unknown', matric }
}
