import { useRef } from 'react'
import { ErrorBanner } from '../../common/units/ErrorBanner.tsx'
import { Skeleton } from '../../common/units/Skeleton.tsx'
import type { DateRange, PlanCall } from '../../domain/price-cache/fetchPlan.ts'
import type { BuildOutcome } from '../../services/PriceCacheService.ts'

export interface ReportRow {
  /** Approval id of the call (`planCallId`). */
  id: string
  call: PlanCall
  name?: string
  /** The request the call sends, without credentials. */
  request: string
  /** Set while or after a build touched this call. */
  outcome?: BuildOutcome
}

interface CacheReportProps {
  loading: boolean
  error?: Error | null
  /** One row per provider call, most recent gap first. */
  rows: readonly ReportRow[]
  /** Oldest day the plan covers, or undefined for all history. */
  planStart?: string
  fromDate: string
  onChangeFromDate: (date: string) => void
  /** Ids of the approved calls. */
  approved: readonly string[]
  onToggleApproved: (id: string) => void
  onToggleAll: () => void
  building: boolean
  onBuild: () => void
}

const rangeLabel = (range: DateRange) =>
  range.from === null ? `All history to ${range.to}` : `${range.from} to ${range.to}`

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function CacheReport({
  loading,
  error,
  rows,
  planStart,
  fromDate,
  onChangeFromDate,
  approved,
  onToggleApproved,
  onToggleAll,
  building,
  onBuild,
}: CacheReportProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const approvedCount = rows.filter((r) => approved.includes(r.id)).length

  return (
    <>
      {rows.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent px-4 py-3 text-sm"
        >
          <span className="text-heading">
            {plural(rows.length, 'API call is', 'API calls are')} needed to fill missing prices
            for the selected tickers.
          </span>
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="rounded-md border border-accent px-3 py-1 text-heading"
          >
            Review and approve
          </button>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="cache-report-title"
        className="m-auto w-[min(60rem,calc(100%-2rem))] rounded-md border border-line bg-page p-0 text-body backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id="cache-report-title" className="text-lg font-medium text-heading">
              Cache report
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-line px-2 py-0.5 text-xs"
            >
              Close
            </button>
          </div>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span>Build from</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onChangeFromDate(e.target.value)}
              className="rounded-md border border-line bg-page px-2 py-0.5 text-heading"
            />
            {fromDate && (
              <button
                type="button"
                onClick={() => onChangeFromDate('')}
                className="rounded-md border border-line px-2 py-0.5 text-xs"
              >
                Use selected range
              </button>
            )}
            <span className="text-xs">
              {fromDate
                ? 'Overrides the range on the dashboard.'
                : planStart
                  ? `Following the range: from ${planStart}.`
                  : 'Following the range: all history.'}
            </span>
          </label>

          {error && <ErrorBanner message={error.message} />}

          {loading ? (
            <Skeleton className="h-24" />
          ) : rows.length === 0 ? (
            <p className="text-sm">Every selected ticker is cached for this period.</p>
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead className="text-xs">
                  <tr>
                    <th className="w-8 py-1">
                      <input
                        type="checkbox"
                        aria-label="Approve all"
                        checked={approvedCount === rows.length}
                        disabled={building}
                        onChange={onToggleAll}
                      />
                    </th>
                    <th>#</th>
                    <th>Ticker</th>
                    <th>API call</th>
                    <th>Range kept</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ id, call, name, request, outcome }, i) => (
                    <tr key={id} className="border-t border-line align-top">
                      <td className="py-1">
                        <input
                          type="checkbox"
                          aria-label={`Approve the ${call.symbol} call`}
                          checked={approved.includes(id)}
                          disabled={building}
                          onChange={() => onToggleApproved(id)}
                        />
                      </td>
                      <td className="py-1">{i + 1}</td>
                      <td title={name} className="py-1 text-heading">
                        {call.symbol}
                      </td>
                      <td className="py-1 font-mono text-xs">{request}</td>
                      <td className="py-1">
                        {call.ranges.map((range) => (
                          <div key={rangeLabel(range)}>{rangeLabel(range)}</div>
                        ))}
                      </td>
                      <td className={`py-1 ${outcome?.status === 'failed' ? 'text-down' : ''}`}>
                        {outcome?.status === 'running' && 'Fetching…'}
                        {outcome?.status === 'failed' && outcome.message}
                        {outcome?.status === 'skipped' && `Skipped: ${outcome.message}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs">
                  {plural(rows.length, 'API call', 'API calls')} in total, one per ticker. The
                  provider cannot send a date range, so a call may return more days than listed;
                  only the days under "Range kept" are stored.
                </span>
                <button
                  type="button"
                  disabled={building || approvedCount === 0}
                  onClick={onBuild}
                  className="rounded-md border border-accent px-3 py-1 text-sm text-heading disabled:opacity-50"
                >
                  {building
                    ? 'Building…'
                    : `Approve and run ${plural(approvedCount, 'API call', 'API calls')}`}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
