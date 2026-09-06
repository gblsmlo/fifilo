'use client'

import { cn } from '@fifilo/ui/lib/utils'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StateGuard, type StateSurfaceProps, type SurfaceGuardState } from '../state-surface'
import { chartColorAt } from './chart-colors'

export type RankedBarDatum = {
  id: string
  label: string
  value: number
}

export interface RankedBarChartProps {
  className?: string
  data: RankedBarDatum[]
  height?: number
  state: SurfaceGuardState
  surface: Omit<StateSurfaceProps, 'kind'>
  valueFormatter?: (value: number) => string
  valueLabel: string
}

const defaultFormatter = (value: number): string => value.toLocaleString()

/**
 * A ranked breakdown, one bar per row, neutral of what the row is (Fase 05 §
 * Web) - backs spend by category and spend by account alike; both are "a
 * value per label, ranked." The value is printed on the bar itself
 * (`LabelList`) so comparing two bars never depends on color alone.
 */
export function RankedBarChart({
  className,
  data,
  height = 280,
  state,
  surface,
  valueFormatter = defaultFormatter,
  valueLabel,
}: Readonly<RankedBarChartProps>) {
  return (
    <StateGuard state={state} surface={surface}>
      <div
        aria-label={surface.title}
        className={cn('w-full', className)}
        role='img'
        style={{ height }}
      >
        <ResponsiveContainer height='100%' width='100%'>
          <BarChart
            data={data}
            layout='vertical'
            margin={{ bottom: 8, left: 8, right: 24, top: 8 }}
          >
            <CartesianGrid horizontal={false} stroke='var(--color-border)' strokeDasharray='4 4' />
            <XAxis
              stroke='var(--color-muted-foreground)'
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              tickFormatter={valueFormatter}
              type='number'
            />
            <YAxis
              dataKey='label'
              stroke='var(--color-muted-foreground)'
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              type='category'
              width={120}
            />
            <Tooltip formatter={(value) => valueFormatter(Number(value))} />
            <Bar dataKey='value' isAnimationActive={false} name={valueLabel} radius={[0, 4, 4, 0]}>
              {data.map((row, index) => (
                <Cell fill={chartColorAt(index)} key={row.id} />
              ))}
              <LabelList
                dataKey='value'
                fill='var(--color-foreground)'
                fontSize={12}
                formatter={(value) => valueFormatter(Number(value))}
                position='right'
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className='sr-only'>
        <caption>{surface.title}</caption>
        <thead>
          <tr>
            <th scope='col'>Rótulo</th>
            <th scope='col'>{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <th scope='row'>{row.label}</th>
              <td>{valueFormatter(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StateGuard>
  )
}
