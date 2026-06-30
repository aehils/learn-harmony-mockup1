import { useMemo, useState } from 'react'
import { MAX_SCORE, REGISTER_SEED, MARKED_SEED } from './data'
import { reconcile, lookup } from './reconcile'

const TABS = [
  { id: 'reconcile', label: '1 · Reconcile' },
  { id: 'report', label: '2 · Report' },
  { id: 'lookup', label: '3 · Student Lookup' },
]

export default function App() {
  const [tab, setTab] = useState('reconcile')
  const [registerText, setRegisterText] = useState(REGISTER_SEED)
  const [markedText, setMarkedText] = useState(MARKED_SEED)
  const [resolved, setResolved] = useState(() => new Set())
  const [hasReconciled, setHasReconciled] = useState(false)

  // Report is derived live so resolving a typo updates counts instantly.
  const report = useMemo(
    () => reconcile(registerText, markedText, resolved),
    [registerText, markedText, resolved],
  )

  const handleReconcile = () => {
    setHasReconciled(true)
    setTab('report')
  }

  const handleResolve = (id) => {
    setResolved((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Course Admin Desk</h1>
            <p className="text-sm text-slate-500">Reconcile a class in seconds, not days.</p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'reconcile' && (
          <ReconcileScreen
            registerText={registerText}
            setRegisterText={setRegisterText}
            markedText={markedText}
            setMarkedText={setMarkedText}
            onReconcile={handleReconcile}
          />
        )}
        {tab === 'report' && (
          <ReportScreen
            report={report}
            hasReconciled={hasReconciled}
            onReconcile={handleReconcile}
            onResolve={handleResolve}
          />
        )}
        {tab === 'lookup' && <LookupScreen report={report} />}
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Screen 1 — Reconcile Workspace                                      */
/* ------------------------------------------------------------------ */
function ReconcileScreen({ registerText, setRegisterText, markedText, setMarkedText, onReconcile }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <Pane
          title="Sign-in Register (from Class Rep)"
          hint="matric, name"
          value={registerText}
          onChange={setRegisterText}
        />
        <Pane
          title="Marked Scores (from Lecturer)"
          hint="matric, name, score"
          value={markedText}
          onChange={setMarkedText}
        />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onReconcile}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Reconcile
        </button>
        <span className="text-sm text-slate-500">
          Both lists are pre-filled — just click Reconcile.
        </span>
      </div>
    </div>
  )
}

function Pane({ title, hint, value, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="font-mono text-xs text-slate-400">{hint}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="h-72 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Screen 2 — Reconciliation Report (the hero)                         */
/* ------------------------------------------------------------------ */
function ReportScreen({ report, hasReconciled, onReconcile, onResolve }) {
  if (!hasReconciled) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-slate-600">Nothing reconciled yet.</p>
        <button
          onClick={onReconcile}
          className="mt-4 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Run Reconcile
        </button>
      </div>
    )
  }

  const { totals, matched, missingScript, unregistered, typoCandidates } = report

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Signed in" value={totals.signed} />
        <Stat label="Marked" value={totals.marked} />
        <Stat label="Matched" value={totals.matched} tone="green" />
        <Stat label="Anomalies" value={totals.anomalies} tone="amber" />
      </div>

      {/* Anomalies first — that's the value */}
      {totals.anomalies > 0 ? (
        <div className="space-y-4">
          <AnomalyBucket
            title="ID Typo Candidate"
            count={typoCandidates.length}
            color="amber"
            description="A matric on one list is one character off another, and the names match. Review and merge."
          >
            {typoCandidates.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <Chip>register: {c.register.matric}</Chip>
                  <span className="text-slate-400">↔</span>
                  <Chip>marked: {c.marked.matric}</Chip>
                  <span className="text-slate-500">score {c.score}/{MAX_SCORE}</span>
                </div>
                <button
                  onClick={() => onResolve(c.id)}
                  className="shrink-0 rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Resolve → merge
                </button>
              </div>
            ))}
          </AnomalyBucket>

          <AnomalyBucket
            title="Missing Script"
            count={missingScript.length}
            color="rose"
            description="Signed the register, but no marked paper was found."
          >
            {missingScript.map((r) => (
              <Row key={r.matric}>
                <span className="font-mono text-slate-500">{r.matric}</span>
                <span className="font-medium text-slate-800">{r.name}</span>
                <span className="ml-auto text-sm text-rose-600">no marked paper</span>
              </Row>
            ))}
          </AnomalyBucket>

          <AnomalyBucket
            title="Unregistered Paper"
            count={unregistered.length}
            color="sky"
            description="A paper was marked, but the student never signed in."
          >
            {unregistered.map((m) => (
              <Row key={m.matric}>
                <span className="font-mono text-slate-500">{m.matric}</span>
                <span className="font-medium text-slate-800">{m.name}</span>
                <span className="ml-auto text-sm text-sky-600">score {m.score}/{MAX_SCORE} · no sign-in</span>
              </Row>
            ))}
          </AnomalyBucket>
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          All anomalies resolved — every record is matched. ✅
        </div>
      )}

      {/* Matched */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Matched</h3>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            {matched.length}
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {matched.map((m) => (
            <div key={m.matric} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-mono text-slate-500">{m.matric}</span>
              <span className="font-medium text-slate-800">{m.name}</span>
              {m.mergedFrom && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  merged
                </span>
              )}
              <span className="ml-auto font-semibold text-slate-900">
                {m.score}/{MAX_SCORE}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, tone }) {
  const toneMap = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    default: 'text-slate-900',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${toneMap[tone] || toneMap.default}`}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

function AnomalyBucket({ title, count, color, description, children }) {
  if (count === 0) return null
  const colorMap = {
    amber: 'border-amber-200 bg-amber-50',
    rose: 'border-rose-200 bg-rose-50',
    sky: 'border-sky-200 bg-sky-50',
  }
  const badgeMap = {
    amber: 'bg-amber-200 text-amber-800',
    rose: 'bg-rose-200 text-rose-800',
    sky: 'bg-sky-200 text-sky-800',
  }
  return (
    <section className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeMap[color]}`}>
          {count}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">{description}</p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({ children }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/60 bg-white px-3 py-2 text-sm">
      {children}
    </div>
  )
}

function Chip({ children }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Screen 3 — Student Lookup                                           */
/* ------------------------------------------------------------------ */
function LookupScreen({ report }) {
  const [matric, setMatric] = useState('')
  const [result, setResult] = useState(null)

  const handleCheck = () => setResult(lookup(report, matric))

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Check my result</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your matric number. You only ever see your own result.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCheck()
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            placeholder="e.g. CSC/20/0423"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Check
          </button>
        </form>
      </div>

      {result && <ResultCard result={result} />}
    </div>
  )
}

function ResultCard({ result }) {
  if (result.status === 'empty') {
    return (
      <Card className="border-slate-200 bg-white text-slate-500">
        Enter a matric number above.
      </Card>
    )
  }
  if (result.status === 'matched') {
    return (
      <Card className="border-green-200 bg-green-50">
        <div className="text-sm text-green-700">{result.name}</div>
        <div className="mt-1 text-3xl font-bold text-green-800">
          Score: {result.score} / {MAX_SCORE}
        </div>
      </Card>
    )
  }
  if (result.status === 'flagged') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <div className="text-sm font-medium text-amber-800">Flagged</div>
        <div className="mt-1 text-sm text-amber-700">{result.reason}.</div>
        <div className="mt-2 font-medium text-amber-900">
          Proceed to Room 104 with your submission ticket.
        </div>
      </Card>
    )
  }
  return (
    <Card className="border-rose-200 bg-rose-50">
      <div className="text-sm text-rose-700">
        No record found for this matric number.
      </div>
    </Card>
  )
}

function Card({ className = '', children }) {
  return <div className={`mt-4 rounded-xl border p-5 shadow-sm ${className}`}>{children}</div>
}
