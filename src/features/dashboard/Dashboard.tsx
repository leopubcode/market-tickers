import { useState, type ReactNode } from 'react'
import type { AssetKind } from '../../domain/market-data/marketDataProvider.ts'
import { Tooltip } from '../../common/units/Tooltip.tsx'
import { ASSET_KINDS } from './watchlist.ts'
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
  onAddSymbol: (input: { symbol: string; name: string; kind: AssetKind }) => void
  onRemoveSymbol: (symbol: string) => void
  columns: GridColumns
  onSelectColumns: (columns: GridColumns) => void
  ranges: readonly Range[]
  range: Range
  onSelectRange: (key: RangeKey) => void
  /** The cache banner and its approval dialog. */
  cacheReport: ReactNode
  onOpenCacheReport: () => void
  /** The settings dialog. */
  settingsDialog: ReactNode
  onOpenSettings: () => void
  /** Discards the decrypted settings and asks for the password again. */
  onLock: () => void
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

const menuItemClass =
  'flex h-10 items-center gap-3 rounded-md border border-line px-2.5 hover:border-accent md:w-full'

function MenuIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}

export function Dashboard({
  symbols,
  selected,
  onToggleSymbol,
  onToggleAll,
  onAddSymbol,
  onRemoveSymbol,
  columns,
  onSelectColumns,
  ranges,
  range,
  onSelectRange,
  cacheReport,
  onOpenCacheReport,
  settingsDialog,
  onOpenSettings,
  onLock,
  split,
  onToggleSplit,
  negative,
  children,
}: DashboardProps) {
  // Interaction state of the menu alone; nothing outside needs to know it.
  const [menuOpen, setMenuOpen] = useState(false)
  // Each side gets half the width, so it gets half the columns.
  const sideColumns = Math.max(1, Math.ceil(columns / 2)) as GridColumns
  return (
    <div className="flex flex-col md:flex-row">
      <aside
        className={`shrink-0 border-b border-line p-2 md:border-r md:border-b-0 ${
          menuOpen ? 'md:w-52' : 'md:w-14'
        }`}
      >
        <nav aria-label="Menu" className="flex gap-1 md:sticky md:top-12 md:flex-col">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Collapse menu' : 'Expand menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className={menuItemClass}
          >
            <MenuIcon path="M4 6h16M4 12h16M4 18h16" />
          </button>
          <button
            type="button"
            title="Cache report"
            aria-label="Cache report"
            onClick={onOpenCacheReport}
            className={menuItemClass}
          >
            <MenuIcon path="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            {menuOpen && <span className="text-sm">Cache report</span>}
          </button>
          <button
            type="button"
            title="Settings"
            aria-label="Settings"
            onClick={onOpenSettings}
            className={menuItemClass}
          >
            <MenuIcon path="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
            {menuOpen && <span className="text-sm">Settings</span>}
          </button>
          <button
            type="button"
            title="Lock"
            aria-label="Lock"
            onClick={onLock}
            className={menuItemClass}
          >
            <MenuIcon path="M6 11h12v9H6zM8 11V8a4 4 0 118 0v3" />
            {menuOpen && <span className="text-sm">Lock</span>}
          </button>
        </nav>
      </aside>
      <main className="mx-auto flex min-w-0 max-w-[110rem] flex-1 flex-col gap-6 p-4 sm:p-8">
        {cacheReport}
        {settingsDialog}
        <header className="flex flex-col gap-4">
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
              <span key={s.symbol} className="inline-flex">
                <Tooltip content={s.name}>
                  {(trigger) => (
                    <button
                      {...trigger}
                      type="button"
                      aria-pressed={selected.includes(s.symbol)}
                      onClick={() => onToggleSymbol(s.symbol)}
                      className={`rounded-l-md border px-3 py-1 text-sm ${
                        selected.includes(s.symbol)
                          ? 'border-accent text-heading'
                          : 'border-line'
                      }`}
                    >
                      {s.symbol}
                    </button>
                  )}
                </Tooltip>
                <button
                  type="button"
                  aria-label={`Remove ${s.symbol}`}
                  onClick={() => onRemoveSymbol(s.symbol)}
                  className="rounded-r-md border border-l-0 border-line px-1.5 py-1 text-sm hover:border-accent"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form
            className="flex flex-wrap gap-2"
            aria-label="Add ticker"
            onSubmit={(e) => {
              e.preventDefault()
              const data = new FormData(e.currentTarget)
              onAddSymbol({
                symbol: String(data.get('symbol')),
                name: String(data.get('name')),
                kind: ASSET_KINDS.find((k) => k === data.get('kind')) ?? 'stock',
              })
              e.currentTarget.reset()
            }}
          >
            <input
              name="symbol"
              required
              placeholder="Symbol"
              aria-label="Symbol"
              className="w-28 rounded-md border border-line bg-transparent px-2 py-1 text-sm uppercase"
            />
            <input
              name="name"
              placeholder="Name (optional)"
              aria-label="Name"
              className="w-56 rounded-md border border-line bg-transparent px-2 py-1 text-sm"
            />
            <select
              name="kind"
              aria-label="Kind"
              className="rounded-md border border-line bg-transparent px-2 py-1 text-sm"
            >
              {ASSET_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-line px-3 py-1 text-sm hover:border-accent">
              Add ticker
            </button>
          </form>
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
    </div>
  )
}
