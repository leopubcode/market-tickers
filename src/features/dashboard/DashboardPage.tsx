import { useQueries } from '@tanstack/react-query'
import { useRef } from 'react'
import { Dashboard } from './Dashboard.tsx'
import {
  GRID_COLUMNS,
  DEFAULT_WATCHLIST,
  RANGES,
  type WatchlistItem,
  type GridColumns,
  type RangeKey,
} from './constants.ts'
import { rangeChange } from './performance.ts'
import { deriveQuote } from '../../domain/price-cache/priceCache.ts'
import { CacheReportContainer } from '../cache-report/CacheReportContainer.tsx'
import { usePriceCache } from '../../session/PriceCacheContext.ts'
import { useSession } from '../../session/SessionContext.tsx'
import { SettingsDialogContainer } from '../vault/SettingsDialogContainer.tsx'
import { cacheQuery, kindOf } from './queries.ts'
import { TickerCard } from './TickerCard.tsx'
import { usePersistedState } from './usePersistedState.ts'
import { addToWatchlist, isWatchlist } from './watchlist.ts'

export default function DashboardPage() {
  const priceCache = usePriceCache()
  const { lock } = useSession()
  const cacheDialog = useRef<HTMLDialogElement>(null)
  const settingsDialog = useRef<HTMLDialogElement>(null)
  const [watchlist, setWatchlist] = usePersistedState<WatchlistItem[]>(
    'ticker-stocks:watchlist',
    [...DEFAULT_WATCHLIST],
    isWatchlist,
  )
  const [storedSelected, setSelected] = usePersistedState<string[]>(
    'ticker-stocks:selected',
    [DEFAULT_WATCHLIST[0].symbol],
    (v): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  )
  // A removed ticker may still be in the stored selection.
  const selected = storedSelected.filter((s) => watchlist.some((w) => w.symbol === s))
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
    queries: selected.map((symbol) => cacheQuery(priceCache, symbol)),
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
    setSelected(selected.length === watchlist.length ? [] : watchlist.map((s) => s.symbol))

  const addSymbol = (input: Parameters<typeof addToWatchlist>[1]) => {
    const next = addToWatchlist(watchlist, input)
    if (next.length === watchlist.length) return
    setWatchlist(next)
    // Show the new ticker right away.
    setSelected([...selected, next[next.length - 1].symbol])
  }

  const removeSymbol = (symbol: string) =>
    setWatchlist(watchlist.filter((w) => w.symbol !== symbol))

  const renderCard = (symbol: string) => (
    <TickerCard
      key={symbol}
      symbol={symbol}
      name={watchlist.find((w) => w.symbol === symbol)?.name}
      kind={kindOf(watchlist, symbol)}
      range={range}
      allStart={allStart}
    />
  )

  return (
    <Dashboard
      symbols={watchlist}
      selected={selected}
      onToggleSymbol={toggleSymbol}
      onToggleAll={toggleAll}
      onAddSymbol={addSymbol}
      onRemoveSymbol={removeSymbol}
      columns={columns}
      onSelectColumns={setColumns}
      ranges={RANGES}
      range={range}
      onSelectRange={setRangeKey}
      cacheReport={
        <CacheReportContainer
          targets={selected.map((symbol) => ({ symbol, kind: kindOf(watchlist, symbol) }))}
          watchlist={watchlist}
          range={range}
          dialogRef={cacheDialog}
        />
      }
      onOpenCacheReport={() => cacheDialog.current?.showModal()}
      settingsDialog={<SettingsDialogContainer dialogRef={settingsDialog} />}
      onOpenSettings={() => settingsDialog.current?.showModal()}
      onLock={lock}
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
