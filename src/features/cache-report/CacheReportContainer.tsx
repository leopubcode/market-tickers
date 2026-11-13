import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type RefObject } from 'react'
import { planCallId, type PlanTarget } from '../../domain/price-cache/fetchPlan.ts'
import { priceCache } from '../../priceCache.ts'
import { downloadText } from '../../common/download.ts'
import type { BuildOutcome } from '../../services/PriceCacheService.ts'
import { requestedStart, WATCHLIST, type Range } from '../dashboard/constants.ts'
import { CacheReport } from './CacheReport.tsx'

export function CacheReportContainer({
  targets,
  range,
  dialogRef,
}: {
  targets: readonly PlanTarget[]
  range: Range
  /** The dialog element, so a menu elsewhere can open it. */
  dialogRef: RefObject<HTMLDialogElement | null>
}) {
  const queryClient = useQueryClient()
  // Not persisted: a forgotten override would silently shrink every later range.
  const [fromDate, setFromDate] = useState('')
  const [approved, setApproved] = useState<string[]>([])
  const [outcomes, setOutcomes] = useState<Record<string, BuildOutcome>>({})

  // A from date set in the report wins over the dashboard range.
  const start = fromDate || requestedStart(range, priceCache.today())

  const plan = useQuery({
    queryKey: ['cache-plan', targets, start],
    queryFn: () => priceCache.plan(targets, start),
    staleTime: 0,
  })
  const items = plan.data ?? []

  const build = useMutation({
    mutationFn: (approvedItems: typeof items) =>
      priceCache.build(approvedItems, (outcome) => {
        setOutcomes((cur) => ({ ...cur, [outcome.symbol]: outcome }))
        if (outcome.status === 'done') {
          void queryClient.invalidateQueries({ queryKey: ['cache', outcome.symbol] })
        }
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cache-plan'] }),
  })

  // Approvals name an exact symbol and its date ranges, so a new range always needs a new one.
  const exportCache = useMutation({
    mutationFn: () => priceCache.export(),
    onSuccess: ({ filename, text }) => downloadText(filename, text),
  })
  const importCache = useMutation({
    mutationFn: async (file: File) => priceCache.import(await file.text()),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cache'] })
      void queryClient.invalidateQueries({ queryKey: ['cache-plan'] })
    },
  })

  const transferResult = importCache.isError
    ? { kind: 'error' as const, message: importCache.error.message }
    : exportCache.isError
      ? { kind: 'error' as const, message: exportCache.error.message }
      : importCache.isSuccess
        ? {
            kind: 'success' as const,
            message: `Imported ${importCache.data.symbols} tickers, ${importCache.data.addedPrices} new price rows.`,
          }
        : undefined

  const toggleApproved = (id: string) =>
    setApproved((cur) => (cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id]))

  const toggleAll = () =>
    setApproved((cur) => (cur.length === items.length ? [] : items.map(planCallId)))

  return (
    <CacheReport
      dialogRef={dialogRef}
      loading={plan.isPending}
      error={plan.error ?? build.error}
      rows={items.map((call) => ({
        id: planCallId(call),
        call,
        name: WATCHLIST.find((w) => w.symbol === call.symbol)?.name,
        request: priceCache.describe(call),
        outcome: outcomes[call.symbol],
      }))}
      planStart={start ?? undefined}
      fromDate={fromDate}
      onChangeFromDate={setFromDate}
      approved={approved}
      onToggleApproved={toggleApproved}
      onToggleAll={toggleAll}
      building={build.isPending}
      transferring={exportCache.isPending || importCache.isPending}
      transferResult={transferResult}
      onExport={() => {
        importCache.reset()
        exportCache.mutate()
      }}
      onImport={(file) => {
        exportCache.reset()
        importCache.mutate(file)
      }}
      onBuild={() => {
        // Ask the browser not to evict the cache under storage pressure.
        void navigator.storage?.persist?.()
        const run = items.filter((call) => approved.includes(planCallId(call)))
        setApproved([])
        setOutcomes({})
        build.mutate(run)
      }}
    />
  )
}
