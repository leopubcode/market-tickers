import type { ReactNode } from 'react'
import { Tooltip } from '../../common/units/Tooltip.tsx'
import {
  GRID_COLUMNS,
  type GridColumns,
  type Range,
  type RangeKey,
  type WatchlistItem,
} from './constants.ts'

interface DashboardProps {
  symbols: readonly WatchlistItem[]
  selected: readonly string[]
  onToggleSymbol: (symbol: string) => void
  onToggleAll: () => void
  columns: GridColumns
  onSelectColumns: (columns: GridColumns) => void
  ranges: readonly Range[]
  range: Range
  onSelectRange: (key: RangeKey) => void
  /** The cache banner and its approval dialog. */
  cacheReport: ReactNode
  split: boolean
  onToggleSplit: () => void
  /** Cards with negative performance; shown on the right when split. */
  negative: ReactNode
  /** All cards, or only the non-negative ones when split. */
  children: ReactNode
}

// Full class names so Tailwind can detect them.
const GRID_CLASS: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  5: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4 min-[1800px]:grid-cols-5',
  6: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4 min-[1800px]:grid-cols-6',
}

export function Dashboard({
  symbols,
  selected,
  onToggleSymbol,
  onToggleAll,
  columns,
  onSelectColumns,
  ranges,
  range,
  onSelectRange,
  cacheReport,
  split,
  onToggleSplit,
  negative,
  children,
}: DashboardProps) {
  // Each side gets half the width, so it gets half the columns.
  const sideColumns = Math.max(1, Math.ceil(columns / 2)) as GridColumns
  return (
    <main className="mx-auto flex max-w-[110rem] flex-col gap-6 p-4 sm:p-8">
      {cacheReport}
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-medium text-heading">Ticker Stocks</h1>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Tickers">
          <button
            type="button"
            aria-pressed={selected.length === symbols.length}
            onClick={onToggleAll}
            className={`rounded-md border px-3 py-1 text-sm ${
              selected.length === symbols.length
                ? 'border-accent text-heading'
                : 'border-line'
            }`}
          >
            All
          </button>
          {symbols.map((s) => (
            <Tooltip key={s.symbol} content={s.name}>
              {(trigger) => (
                <button
                  {...trigger}
                  type="button"
                  aria-pressed={selected.includes(s.symbol)}
                  onClick={() => onToggleSymbol(s.symbol)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    selected.includes(s.symbol)
                      ? 'border-accent text-heading'
                      : 'border-line'
                  }`}
                >
                  {s.symbol}
                </button>
              )}
            </Tooltip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1" role="group" aria-label="Grid style">
            {GRID_COLUMNS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === columns}
                onClick={() => onSelectColumns(c)}
                className={`rounded-md border px-2 py-0.5 text-xs ${
                  c === columns ? 'border-accent text-heading' : 'border-line'
                }`}
              >
                {c}x?
              </button>
            ))}
          </div>
          <button
              type="button"
            aria-pressed={split}
            onClick={onToggleSplit}
            className={`rounded-md border px-2 py-0.5 text-xs ${
              split ? 'border-accent text-heading' : 'border-line'
            }`}
          >
            Split by performance
          </button>
          <div className="flex gap-1" role="group" aria-label="Range">
            {ranges.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={r.key === range.key}
                onClick={() => onSelectRange(r.key)}
                className={`rounded-md border px-2 py-0.5 text-xs ${
                  r.key === range.key ? 'border-accent text-heading' : 'border-line'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {selected.length === 0 ? (
        <p>Select a ticker to add its chart.</p>
      ) : split ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-label="Gainers" className="flex min-w-0 flex-col gap-3">
            <h2 className="text-sm font-medium text-heading">Up</h2>
            <div className={`grid gap-4 ${GRID_CLASS[sideColumns]}`}>{children}</div>
          </section>
          <section aria-label="Losers" className="flex min-w-0 flex-col gap-3">
            <h2 className="text-sm font-medium text-heading">Down</h2>
            <div className={`grid gap-4 ${GRID_CLASS[sideColumns]}`}>{negative}</div>
          </section>
        </div>
      ) : (
        <div className={`grid gap-4 ${GRID_CLASS[columns]}`}>{children}</div>
      )}
    </main>
  )
}
