import { ArrowLeft, Check, Crown, LogOut, Play, RotateCcw, Timer, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import {
  bestTime,
  DIFFICULTIES,
  fmtClock,
  fmtTime,
  loadScores,
  TIME_LIMIT,
  type ScoreEntry,
} from './leaderboard'
import { useGame } from './store'

const scrim =
  'pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-[#0b1216]/70 p-4 backdrop-blur-[3px]'
const card =
  'w-full max-w-[26rem] rounded-2xl border border-[#f2b23c]/35 bg-[#101418]/95 p-6 shadow-[0_2rem_5rem_rgba(0,0,0,0.5)]'
const primary =
  'flex items-center justify-center gap-2 rounded-xl bg-[#f2b23c] px-4 py-3 text-sm font-black text-[#101418] shadow-lg transition hover:bg-[#e0a22c] focus-visible:outline-2 focus-visible:outline-white'
const ghost =
  'flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/70'

/** live challenge clock in the top-bar info card; freezes when held or finished */
export function RunTimer() {
  const { t } = useI18n()
  const difficulty = useGame((s) => s.difficulty)
  const finished = useGame((s) => s.finished)
  const remaining = useGame((s) => s.remaining)
  const result = useGame((s) => s.result)

  if (!difficulty) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/45">
        <Timer size={11} />
        {t.play.run.timerFree}
      </p>
    )
  }

  const limit = TIME_LIMIT[difficulty]
  const low = !finished && remaining <= 10
  const frac = finished ? 1 : Math.max(0, Math.min(1, remaining / limit))
  const clock = finished ? fmtTime(result?.time ?? limit - remaining) : fmtClock(remaining)

  return (
    <div
      data-run-timer
      className={`mt-2 rounded-lg border px-2.5 py-1.5 ${
        low ? 'border-[#ff6b5e]/60 bg-[#a12f22]/20' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.55rem] font-black uppercase tracking-[0.2em] text-[#f2b23c]">
          {t.play.run.diff[difficulty].name}
        </span>
        <span
          className={`font-mono text-sm font-black tabular-nums ${
            low ? 'animate-pulse text-[#ff6b5e]' : 'text-white'
          }`}
        >
          {finished ? `${t.play.run.timerDone} · ${clock}` : clock}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${
            low ? 'bg-[#ff6b5e]' : 'bg-gradient-to-r from-[#408fb4] to-[#f2b23c]'
          }`}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      {low && (
        <p className="mt-1 text-[0.55rem] font-black uppercase tracking-[0.18em] text-[#ff6b5e]">
          {t.play.run.lowTime}
        </p>
      )}
    </div>
  )
}

function EntryGate() {
  const { t } = useI18n()
  const continueRun = useGame((s) => s.continueRun)
  const startFresh = useGame((s) => s.startFresh)
  const saved = useGame((s) => s.blocks.length)
  const difficulty = useGame((s) => s.difficulty)
  const finished = useGame((s) => s.finished)
  const remaining = useGame((s) => s.remaining)
  const resumable = difficulty != null && !finished && remaining > 0
  const best = bestTime()

  return (
    <div className={scrim}>
      <div role="dialog" aria-modal="true" aria-labelledby="run-entry-title" className={card}>
        <p className="text-[0.58rem] font-black uppercase tracking-[0.3em] text-[#f2b23c]">
          {t.play.gameTitle}
        </p>
        <h2 id="run-entry-title" className="mt-1 text-2xl font-black tracking-tight text-white">
          {t.play.run.entryTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{t.play.run.entryLead}</p>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <span className="font-semibold text-white/55">{t.play.run.entrySaved}</span>
          <span className="font-black text-white">{saved}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-white/55">
            <Trophy size={12} className="text-[#f2b23c]" />
            {t.play.run.entryBest}
          </span>
          <span className="font-mono font-black text-[#f2b23c]">
            {best == null ? t.play.run.entryNoBest : fmtTime(best)}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button autoFocus onClick={continueRun} className={primary}>
            <Play size={15} fill="currentColor" />
            {resumable ? t.play.run.resumeChallenge : t.play.run.enterFree}
          </button>
          <button onClick={startFresh} className={ghost}>
            <RotateCcw size={15} />
            {t.play.run.startFresh}
          </button>
        </div>
      </div>
    </div>
  )
}

function DifficultyGate() {
  const { t } = useI18n()
  const chooseDifficulty = useGame((s) => s.chooseDifficulty)

  return (
    <div className={scrim}>
      <div role="dialog" aria-modal="true" aria-labelledby="run-diff-title" className={card}>
        <button
          onClick={() => useGame.setState({ gate: 'entry' })}
          className="flex items-center gap-1.5 text-[0.65rem] font-bold text-white/55 transition hover:text-white"
        >
          <ArrowLeft size={13} />
          {t.play.run.back}
        </button>
        <h2 id="run-diff-title" className="mt-2 text-2xl font-black tracking-tight text-white">
          {t.play.run.diffTitle}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-white/65">{t.play.run.diffLead}</p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => chooseDifficulty(d)}
              className="group rounded-xl border border-white/15 bg-white/5 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#f2b23c]/60 hover:bg-[#f2b23c]/10 focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-white">{t.play.run.diff[d].name}</span>
                <span className="font-mono text-xs font-black tabular-nums text-[#f2b23c]">
                  {fmtClock(TIME_LIMIT[d])}
                </span>
              </span>
              <span className="mt-1 block text-[0.65rem] leading-relaxed text-white/55">
                {t.play.run.diff[d].desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimeoutPanel() {
  const { t } = useI18n()
  const restart = useGame((s) => s.restartAfterTimeout)
  const difficulty = useGame((s) => s.difficulty)

  useEffect(() => {
    const id = window.setTimeout(restart, 1800)
    return () => window.clearTimeout(id)
  }, [restart])

  return (
    <div className={scrim}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="run-timeout-title" className={card}>
        <p className="flex items-center gap-2 text-[0.58rem] font-black uppercase tracking-[0.3em] text-[#ff6b5e]">
          <Timer size={13} />
          {difficulty ? t.play.run.diff[difficulty].name : ''}
        </p>
        <h2 id="run-timeout-title" className="mt-1 text-3xl font-black tracking-tight text-white">
          {t.play.run.timeoutTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{t.play.run.timeoutBody}</p>
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/55">
          <RotateCcw size={14} className="animate-spin text-[#f2b23c]" />
          {t.play.run.restarting}
        </div>
      </div>
    </div>
  )
}

function ScoreList({ entries, limit }: { entries: ScoreEntry[]; limit: number }) {
  const { t } = useI18n()
  if (entries.length === 0) {
    return <p className="mt-2 text-xs leading-relaxed text-white/45">{t.play.run.boardEmpty}</p>
  }
  return (
    <ol className="renungan-scroll mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
      {entries.slice(0, limit).map((e, i) => (
        <li
          key={`${e.at}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
        >
          <span
            className={`w-5 shrink-0 font-mono font-black ${
              i === 0 ? 'text-[#f2b23c]' : 'text-white/40'
            }`}
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-bold text-white/85">{e.name}</span>
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-white/55">
            {t.play.run.diff[e.difficulty].name}
          </span>
          <span className="shrink-0 font-mono font-black tabular-nums text-[#f2b23c]">
            {fmtTime(e.time)}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ResultPanel() {
  const { t } = useI18n()
  const result = useGame((s) => s.result)
  const saveResult = useGame((s) => s.saveResult)
  const dismissResult = useGame((s) => s.dismissResult)
  const chooseDifficulty = useGame((s) => s.chooseDifficulty)
  const exit = useGame((s) => s.exit)
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null)

  if (!result) return null

  const submit = () => {
    saveResult(name.trim() || t.play.run.nameDefault)
    setEntries(loadScores())
  }

  return (
    <div className={scrim}>
      <div role="dialog" aria-modal="true" aria-labelledby="run-result-title" className={card}>
        <p className="text-[0.58rem] font-black uppercase tracking-[0.3em] text-[#f2b23c]">
          {t.play.meaning.objective}
        </p>
        <h2 id="run-result-title" className="mt-1 text-2xl font-black tracking-tight text-white">
          {t.play.run.resultTitle}
        </h2>

        {result.record && (
          <p className="mt-2 flex items-center gap-2 rounded-lg border border-[#f2b23c]/50 bg-[#f2b23c]/15 px-3 py-2 text-xs font-black text-[#f2b23c]">
            <Crown size={14} />
            {t.play.run.resultRecord}
          </p>
        )}

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
          <p className="text-[0.55rem] font-black uppercase tracking-[0.24em] text-white/45">
            {t.play.run.resultTime}
          </p>
          <p className="mt-1 font-mono text-4xl font-black tabular-nums text-white">
            {fmtTime(result.time)}
          </p>
          <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#f2b23c]">
            {t.play.run.diff[result.difficulty].name}
          </p>
        </div>

        {result.saved ? (
          <>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#5aa66f]">
              <Check size={13} />
              {t.play.run.savedNote}
            </p>
            <ScoreList entries={entries ?? loadScores()} limit={5} />
          </>
        ) : (
          <div className="mt-4">
            <label
              htmlFor="run-name"
              className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-white/50"
            >
              {t.play.run.nameLabel}
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="run-name"
                autoFocus
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                }}
                placeholder={t.play.run.namePlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/30 focus:border-[#f2b23c] focus:outline-none"
              />
              <button onClick={submit} className={`${primary} shrink-0 px-4`}>
                {t.play.run.save}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => chooseDifficulty(result.difficulty)} className={`${primary} flex-1`}>
            <RotateCcw size={15} />
            {t.play.run.playAgain}
          </button>
          <button onClick={dismissResult} className={`${ghost} flex-1`}>
            {t.play.run.continueFree}
          </button>
          <button onClick={exit} className={`${ghost} flex-1`}>
            <LogOut size={15} />
            {t.play.run.exit}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScoreBoard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className={scrim}>
      <div role="dialog" aria-modal="true" aria-labelledby="run-board-title" className={card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[0.58rem] font-black uppercase tracking-[0.3em] text-[#f2b23c]">
              <Trophy size={13} />
              {t.play.gameTitle}
            </p>
            <h2 id="run-board-title" className="mt-1 text-2xl font-black tracking-tight text-white">
              {t.play.run.boardTitle}
            </h2>
          </div>
          <button onClick={onClose} className={ghost} autoFocus>
            {t.play.run.close}
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{t.play.run.boardLead}</p>
        <ScoreList entries={loadScores()} limit={10} />
      </div>
    </div>
  )
}

export function RunPanels() {
  const gate = useGame((s) => s.gate)
  const result = useGame((s) => s.result)
  return (
    <>
      {gate === 'entry' && <EntryGate />}
      {gate === 'difficulty' && <DifficultyGate />}
      {gate === 'timeout' && <TimeoutPanel />}
      {result && <ResultPanel />}
    </>
  )
}