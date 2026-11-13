import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyPrice } from '../../domain/market-data/marketDataProvider.ts'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** "2026-05-13" as "May 13, 2026". */
const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`))

export function PriceChart({ prices, up }: { prices: DailyPrice[]; up: boolean }) {
  const color = up ? 'var(--color-up)' : 'var(--color-down)'
  const fillId = `priceFill-${useId().replace(/:/g, '')}`
  return (
    <div className="h-64" role="img" aria-label="Closing price chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={prices}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--color-body)', fontSize: 12 }}
            tickFormatter={formatDate}
            minTickGap={48}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--color-body)', fontSize: 12 }}
            tickFormatter={(v: number) => v.toFixed(0)}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
            }}
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Close']}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${fillId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
