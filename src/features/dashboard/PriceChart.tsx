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

export function PriceChart({ prices }: { prices: DailyPrice[] }) {
  return (
    <div className="h-72" role="img" aria-label="Closing price chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={prices}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text)', fontSize: 12 }}
            tickFormatter={(d: string) => d.slice(5)}
            minTickGap={32}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text)', fontSize: 12 }}
            tickFormatter={(v: number) => v.toFixed(0)}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Close']}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#priceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
