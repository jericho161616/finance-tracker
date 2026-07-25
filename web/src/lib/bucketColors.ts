export const BUCKET_COLORS = [
  { fg: '#e2a53f', soft: 'rgba(226,165,63,0.14)' },
  { fg: '#7c8cf0', soft: 'rgba(124,140,240,0.14)' },
  { fg: '#2fc7c1', soft: 'rgba(47,199,193,0.14)' },
  { fg: '#b478e8', soft: 'rgba(180,120,232,0.14)' },
  { fg: '#ef6f9b', soft: 'rgba(239,111,155,0.14)' },
  { fg: '#f59e0b', soft: 'rgba(245,158,11,0.14)' },
  { fg: '#22c07a', soft: 'rgba(34,192,122,0.14)' },
]

export function bucketColor(index: number) {
  return BUCKET_COLORS[index % BUCKET_COLORS.length]
}
