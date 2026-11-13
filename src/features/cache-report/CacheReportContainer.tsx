import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { planCallId, type PlanTarget } from '../../domain/price-cache/fetchPlan.ts'
import { priceCache } from '../../priceCache.ts'
import type { BuildOutcome } from '../../services/PriceCacheService.ts'
import { requestedStart, WATCHLIST, type Range } from '../dashboard/constants.ts'
import { usePersistedState } from '../dashboard/usePersistedState.ts'
import { CacheReport } from './CacheReport.tsx'

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function CacheReportContainer({
  targets,
  range,
}: {
  targets: readonly PlanTarget[]
  range: Range
}) {
  const queryClient = useQueryClient()
  const [fromDate, setFromDate] = usePersistedState(
    'ticker-stocks:cache-from',
    '',
    (v): v is string => typeof v === 'string' && (v === '' || DAY.test(v)),
  )
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
  const toggleApproved = (id: string) =>
    setApproved((cur) => (cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id]))

  const toggleAll = () =>
    setApproved((cur) => (cur.length === items.length ? [] : items.map(planCallId)))

  return (
    <CacheReport
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
