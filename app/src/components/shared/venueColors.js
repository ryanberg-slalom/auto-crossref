export const VENUE_COLORS = {
  michelin: '#003566',
  zmax: '#C92120',
}

export const venueColor = (venue) => VENUE_COLORS[venue] ?? VENUE_COLORS.zmax
