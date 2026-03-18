export const VENUE_COLORS = {
  michelin: '#003566',
  zmax: '#dc2626',
}

export const venueColor = (venue) => VENUE_COLORS[venue] ?? VENUE_COLORS.zmax
