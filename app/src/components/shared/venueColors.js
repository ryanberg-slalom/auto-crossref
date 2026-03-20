export const VENUE_COLORS = {
  michelin: '#003566',
  zmax: '#C92120',
}

// For Recharts SVG fill/stroke props (the only legitimate use of inline color values)
export const venueColor = (venue) => VENUE_COLORS[venue] ?? VENUE_COLORS.zmax

// For DOM elements — use Tailwind classes derived from @theme vars
export const venueBgClass = (venue) => venue === 'michelin' ? 'bg-michelin' : 'bg-zmax'
export const venueTextClass = (venue) => venue === 'michelin' ? 'text-michelin' : 'text-zmax'
