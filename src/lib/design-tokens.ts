/**
 * Design System Tokens
 * Centralized semantic color and style utilities
 */

export const statusColors = {
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: 'text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    icon: 'text-warning',
  },
  error: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
    icon: 'text-destructive',
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    icon: 'text-info',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: 'text-muted-foreground',
  },
};

export const trustScoreColors = {
  excellent: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  good: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
  fair: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  low: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

export const spacing = {
  section: 'py-12 md:py-20',
  container: 'container mx-auto px-4 sm:px-6 lg:px-8',
  card: 'p-4 sm:p-6',
  cardCompact: 'p-3',
  gap: 'gap-4',
  gapCompact: 'gap-2',
};

export const typography = {
  h1: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl md:text-3xl font-semibold',
  h3: 'text-lg sm:text-xl font-semibold',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
};
