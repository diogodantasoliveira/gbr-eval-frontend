"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"

interface ScorePoint {
  label: string
  score: number
  run_id?: string
}

interface ScoreLineChartProps {
  data: ScorePoint[]
  threshold?: number
  height?: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScorePoint; value: number }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-mono font-semibold">{(p.value * 100).toFixed(1)}%</p>
      {p.payload.run_id && (
        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{p.payload.run_id}</p>
      )}
      <p className="text-xs text-muted-foreground">{p.payload.label}</p>
    </div>
  )
}

export type { ScorePoint }

export function ScoreLineChart({ data, threshold = 0.9, height = 240 }: ScoreLineChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No data available.</p>
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={threshold}
            stroke="oklch(0.75 0.15 85)"
            strokeDasharray="6 3"
            label={{ value: `${(threshold * 100).toFixed(0)}%`, position: "right", fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="oklch(0.65 0.2 160)"
            strokeWidth={2}
            dot={{ r: 3, fill: "oklch(0.65 0.2 160)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
