import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDate, formatNumber } from '../../utils/formatters'
import { ChartLegend, ChartTooltip, useChartTheme } from './chartTheme'

const AXIS = { fontSize: 11, tickLine: false, axisLine: false }

export function ExecutionTrendChart({ data = [], height = 260, onPointClick }) {
  const theme = useChartTheme()

  const shaped = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        label: formatDate(entry.date, 'd MMM'),
        passedCount: entry.passed,
      })),
    [data],
  )

  if (!shaped.length) return <ChartEmpty height={height} message="No executions in this period" />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={shaped} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="passedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.series.pass} stopOpacity={0.28} />
              <stop offset="100%" stopColor={theme.series.pass} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...AXIS} stroke={theme.axis} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...AXIS} stroke={theme.axis} width={44} allowDecimals={false} />
          <Tooltip
            content={<ChartTooltip formatter={(value) => formatNumber(value)} />}
            cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="passed"
            name="Passed"
            stroke={theme.series.pass}
            strokeWidth={2}
            fill="url(#passedFill)"
            activeDot={{ r: 4 }}
            onClick={onPointClick ? (entry) => onPointClick(entry.activePayload) : undefined}
            style={onPointClick ? { cursor: 'pointer' } : undefined}
          />
          <Area
            type="monotone"
            dataKey="failed"
            name="Failed"
            stroke={theme.series.fail}
            strokeWidth={2}
            fill="transparent"
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="blocked"
            name="Blocked"
            stroke={theme.series.blocked}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ResultDistributionChart({ data = [], height = 240, onSegmentClick }) {
  const theme = useChartTheme()

  const total = data.reduce((sum, entry) => sum + entry.value, 0)

  if (!total) return <ChartEmpty height={height} message="No test results recorded yet" />

  return (
    <div className="stack">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip formatter={(value) => `${value} (${((value / total) * 100).toFixed(1)}%)`} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              strokeWidth={2}
              onClick={onSegmentClick ? (entry) => onSegmentClick(entry) : undefined}
              style={onSegmentClick ? { cursor: 'pointer' } : undefined}
            >
              {data.map((entry) => (
                <Cell key={entry.key ?? entry.name} fill={theme.series[entry.key] ?? 'var(--accent)'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={data.map((entry) => ({
          label: entry.name,
          value: `${entry.value} · ${((entry.value / total) * 100).toFixed(0)}%`,
          color: theme.series[entry.key] ?? 'var(--accent)',
        }))}
      />
    </div>
  )
}

export function SeverityBarChart({ data = [], height = 240, onBarClick, valueKey = 'value' }) {
  const theme = useChartTheme()

  if (!data.length) return <ChartEmpty height={height} message="No defects in scope" />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...AXIS} stroke={theme.axis} />
          <YAxis {...AXIS} stroke={theme.axis} width={44} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.grid, opacity: 0.4 }} />
          <Bar
            dataKey={valueKey}
            name="Count"
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
            onClick={onBarClick ? (entry) => onBarClick(entry) : undefined}
            style={onBarClick ? { cursor: 'pointer' } : undefined}
          >
            {data.map((entry) => (
              <Cell key={entry.key ?? entry.label} fill={theme.series[entry.key] ?? 'var(--accent)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ModuleCoverageChart({ data = [], height = 280 }) {
  const theme = useChartTheme()

  if (!data.length) return <ChartEmpty height={height} message="No requirements in scope" />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} {...AXIS} stroke={theme.axis} unit="%" />
          <YAxis type="category" dataKey="module" {...AXIS} stroke={theme.axis} width={116} />
          <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} cursor={{ fill: theme.grid, opacity: 0.4 }} />
          <Bar dataKey="coverage" name="Coverage" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PassRateTrendChart({ data = [], height = 220 }) {
  const theme = useChartTheme()

  if (!data.length) return <ChartEmpty height={height} message="No completed runs" />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...AXIS} stroke={theme.axis} />
          <YAxis domain={[0, 100]} {...AXIS} stroke={theme.axis} width={44} unit="%" />
          <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
          <Line
            type="monotone"
            dataKey="passRate"
            name="Pass rate"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartEmpty({ height, message }) {
  return (
    <div
      style={{
        height,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {message}
    </div>
  )
}
