"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

interface PassFailPoint {
  label: string
  passed: number
  failed: number
  total: number
}

interface PassFailBarChartProps {
  data: PassFailPoint[]
  height?: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs">
          <span className={p.dataKey === "passed" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {p.dataKey}: {p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export type { PassFailPoint }

export function PassFailBarChart({ data, height = 240 }: PassFailBarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No data available.</p>
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="passed" stackId="a" fill="oklch(0.65 0.2 160)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="failed" stackId="a" fill="oklch(0.65 0.2 25)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
