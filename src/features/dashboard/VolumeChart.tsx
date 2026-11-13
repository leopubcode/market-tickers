import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { DailyPrice } from '../../domain/market-data/marketDataProvider.ts'

export function VolumeChart({ prices }: { prices: DailyPrice[] }) {
  return (
    <div className="h-24" role="img" aria-label="Trading volume chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={prices}>
          <XAxis dataKey="date" hide />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
            }}
            formatter={(v) => [Number(v).toLocaleString(), 'Volume']}
          />
          <Bar dataKey="volume" fill="var(--color-line)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
