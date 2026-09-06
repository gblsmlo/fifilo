'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { type VariantProps, cva } from 'class-variance-authority'
import type React from 'react'
import { cn } from '../lib/utils'

export const textVariants = cva('', {
  defaultVariants: {
    family: 'sans',
    foreground: 'default',
    size: 'base',
    weight: 'normal',
  },
  variants: {
    align: {
      center: 'text-center',
      end: 'text-end',
      justify: 'text-justify',
      left: 'text-left',
      right: 'text-right',
      start: 'text-start',
    },
    family: {
      heading: 'font-heading',
      mono: 'font-mono',
      sans: 'font-sans',
    },
    foreground: {
      default: 'text-foreground',
      destructive: 'text-destructive-foreground',
      info: 'text-info-foreground',
      inherit: 'text-inherit',
      muted: 'text-muted-foreground',
      success: 'text-success-foreground',
      warning: 'text-warning-foreground',
    },
    leading: {
      loose: 'leading-loose',
      none: 'leading-none',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      snug: 'leading-snug',
      tight: 'leading-tight',
    },
    size: {
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
      '7xl': 'text-7xl',
      '8xl': 'text-8xl',
      '9xl': 'text-9xl',
      base: 'text-base',
      lg: 'text-lg',
      sm: 'text-sm',
      xl: 'text-xl',
      xs: 'text-xs',
    },
    tracking: {
      normal: 'tracking-normal',
      tight: 'tracking-tight',
      tighter: 'tracking-tighter',
      wide: 'tracking-wide',
      wider: 'tracking-wider',
      widest: 'tracking-widest',
    },
    truncate: {
      true: 'truncate',
    },
    weight: {
      black: 'font-black',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
      extralight: 'font-extralight',
      light: 'font-light',
      medium: 'font-medium',
      normal: 'font-normal',
      semibold: 'font-semibold',
      thin: 'font-thin',
    },
  },
})

type TextVariantProps = VariantProps<typeof textVariants>

export interface TextProps extends useRender.ComponentProps<'span'> {
  align?: TextVariantProps['align']
  family?: TextVariantProps['family']
  foreground?: TextVariantProps['foreground']
  leading?: TextVariantProps['leading']
  size?: TextVariantProps['size']
  tracking?: TextVariantProps['tracking']
  truncate?: TextVariantProps['truncate']
  weight?: TextVariantProps['weight']
}

export function Text({
  align,
  className,
  family,
  foreground,
  leading,
  render,
  size,
  tracking,
  truncate,
  weight,
  ...props
}: TextProps): React.ReactElement {
  const defaultProps = {
    className: cn(
      textVariants({
        align,
        family,
        foreground,
        leading,
        size,
        tracking,
        truncate,
        weight,
      }),
      className,
    ),
    'data-slot': 'text',
  }

  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(defaultProps, props),
    render,
  })
}
