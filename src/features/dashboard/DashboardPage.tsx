import { useQueries } from '@tanstack/react-query'
import { useRef } from 'react'
import { Dashboard } from './Dashboard.tsx'
import {
  GRID_COLUMNS,
  RANGES,
  WATCHLIST,
  type GridColumns,
  type RangeKey,
} from './constants.ts'
import { rangeChange } from './performance.ts'
import { deriveQuote } from '../../domain/price-cache/priceCache.ts'
import { CacheReportContainer } from '../cache-report/CacheReportContainer.tsx'
import { cacheQuery, kindOf } from './queries.ts'
import { TickerCard } from './TickerCard.tsx'
import { usePersistedState } from './usePersistedState.ts'

export default function DashboardPage() {
  const cacheDialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = usePersistedState<string[]>(
    'ticker-stocks:selected',
    [WATCHLIST[0].symbol],
    (v): v is string[] =>
      Array.isArray(v) &&
      v.every((s) => WATCHLIST.some((w) => w.symbol === s)),
  )
  const [columns, setColumns] = usePersistedState<GridColumns>(
    'ticker-stocks:columns',
    2,
    (v): v is GridColumns => GRID_COLUMNS.some((c) => c === v),
  )
  const [split, setSplit] = usePersistedState(
    'ticker-stocks:split',
    false,
    (v): v is boolean => typeof v === 'boolean',
  )
  const [rangeKey, setRangeKey] = usePersistedState<RangeKey>(
    'ticker-stocks:range',
    '3M',
    (v): v is RangeKey => RANGES.some((r) => r.key === v),
  )

  // Same cache as the cards; used to give every chart the same All scale.
  const histories = useQueries({
    queries: selected.map(cacheQuery),
    combine: (results) => results.map((r) => r.data?.prices),
  })
  const allStart = histories
    .map((h) => h?.at(-1)?.date)
    .filter((d): d is string => d !== undefined)
    .sort()[0]

  const range = RANGES.find((r) => r.key === rangeKey)!

  // Decides which side each chart lands on.
  const losers = new Set(
    selected.filter((symbol, i) => {
      const history = histories[i]
      const price = history && deriveQuote(symbol, history)?.price
      return (rangeChange(price, history, range, allStart)?.change ?? 0) < 0
    }),
  )

  const toggleSymbol = (symbol: string) =>
    setSelected((cur) =>
      cur.includes(symbol) ? cur.filter((s) => s !== symbol) : [...cur, symbol],
    )

  const toggleAll = () =>
    setSelected((cur) =>
      cur.length === WATCHLIST.length ? [] : WATCHLIST.map((s) => s.symbol),
    )

  const renderCard = (symbol: string) => (
    <TickerCard key={symbol} symbol={symbol} range={range} allStart={allStart} />
  )

  return (
    <Dashboard
      symbols={WATCHLIST}
      selected={selected}
      onToggleSymbol={toggleSymbol}
      onToggleAll={toggleAll}
      columns={columns}
      onSelectColumns={setColumns}
      ranges={RANGES}
      range={range}
      onSelectRange={setRangeKey}
      cacheReport={
        <CacheReportContainer
          targets={selected.map((symbol) => ({ symbol, kind: kindOf(symbol) }))}
          range={range}
          dialogRef={cacheDialog}
        />
      }
      onOpenCacheReport={() => cacheDialog.current?.showModal()}
      split={split}
      onToggleSplit={() => setSplit((v) => !v)}
      negative={selected
        .filter((s) => losers.has(s))
        .map(renderCard)}
    >
      {selected.filter((s) => !split || !losers.has(s)).map(renderCard)}
    </Dashboard>
  )
}
