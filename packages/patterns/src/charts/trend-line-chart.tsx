'use client'

import { cn } from '@fifilo/ui/lib/utils'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StateGuard, type StateSurfaceProps, type SurfaceGuardState } from '../state-surface'
import { chartColorAt, dashPatternAt } from './chart-colors'

export type TrendLineSeries = {
  key: string
  label: string
}

export type TrendLinePoint = Record<string, number | string> & { x: string }

export interface TrendLineChartProps {
  className?: string
  data: TrendLinePoint[]
  height?: number
  series: TrendLineSeries[]
  state: SurfaceGuardState
  surface: Omit<StateSurfaceProps, 'kind'>
  valueFormatter?: (value: number) => string
  xAxisLabel: string
}

const defaultFormatter = (value: number): string => value.toLocaleString()

/**
 * A time series over one or more series, neutral of what each series means
 * (Fase 05 § Web: "o gráfico não sabe o que é uma categoria") - the feature
 * passes already-projected points and the label each series gets in the
 * legend. Backs monthly cashflow and balance evolution alike; both are "a
 * value per period, one or more lines."
 */
export function TrendLineChart({
  className,
  data,
  height = 280,
  series,
  state,
  surface,
  valueFormatter = defaultFormatter,
  xAxisLabel,
}: Readonly<TrendLineChartProps>) {
  return (
    <StateGuard state={state} surface={surface}>
      <div
        aria-label={surface.title}
        className={cn('w-full', className)}
        role='img'
        style={{ height }}
      >
        <ResponsiveContainer height='100%' width='100%'>
          <LineChart data={data} margin={{ bottom: 8, left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke='var(--color-border)' strokeDasharray='4 4' vertical={false} />
            <XAxis
              dataKey='x'
              label={{ position: 'insideBottom', value: xAxisLabel }}
              stroke='var(--color-muted-foreground)'
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              stroke='var(--color-muted-foreground)'
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              tickFormatter={valueFormatter}
            />
            <Tooltip formatter={(value) => valueFormatter(Number(value))} />
            <Legend />
            {series.map((line, index) => (
              <Line
                dataKey={line.key}
                dot={false}
                isAnimationActive={false}
                key={line.key}
                name={line.label}
                stroke={chartColorAt(index)}
                strokeDasharray={dashPatternAt(index)}
                strokeWidth={2}
                type='monotone'
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className='sr-only'>
        <caption>{surface.title}</caption>
        <thead>
          <tr>
            <th scope='col'>{xAxisLabel}</th>
            {series.map((line) => (
              <th key={line.key} scope='col'>
                {line.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.x}>
              <th scope='row'>{point.x}</th>
              {series.map((line) => (
                <td key={line.key}>{valueFormatter(Number(point[line.key] ?? 0))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </StateGuard>
  )
}
