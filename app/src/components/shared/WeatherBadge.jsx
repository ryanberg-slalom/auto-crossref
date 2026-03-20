function precipCategory(totalIn) {
  if (totalIn === 0) return 'dry'
  if (totalIn < 0.1) return 'trace'
  return 'rainy'
}

const PRECIP_LABEL = { dry: 'Dry', trace: 'Trace', rainy: 'Rainy' }

function WeatherLine({ maxF, minF, precip }) {
  const pLabel = PRECIP_LABEL[precipCategory(precip ?? 0)]
  return (
    <span>
      {minF}–{maxF}°
      <span className="text-fg-subtle mx-1">·</span>
      {pLabel}
    </span>
  )
}

// Props:
//   weather   — event.weather object (null → renders nothing)
//   twoDay    — true for ZMAX dual-run events (shows Day 1 + Day 2)
//   compact   — true for table cells (shows max temp + condition only)
export default function WeatherBadge({ weather, twoDay = false, compact = false }) {
  if (!weather) return null

  if (compact) {
    const pLabel = PRECIP_LABEL[precipCategory(weather.precipitation_in ?? 0)]
    return (
      <span className="text-fg-muted whitespace-nowrap">
        {weather.temp_max_f}°
        <span className="text-fg-subtle mx-1">·</span>
        {pLabel}
      </span>
    )
  }

  if (twoDay) {
    return (
      <span className="flex items-center gap-1.5 text-fg-muted">
        <span className="text-fg-subtle font-medium">Day 1:</span>
        <WeatherLine maxF={weather.temp_max_f} minF={weather.temp_min_f} precip={weather.precipitation_in} />
        <span className="text-fg-subtle mx-0.5">·</span>
        <span className="text-fg-subtle font-medium">Day 2:</span>
        <WeatherLine maxF={weather.day2_temp_max_f} minF={weather.day2_temp_min_f} precip={weather.day2_precipitation_in} />
      </span>
    )
  }

  return (
    <span className="text-fg-muted">
      <WeatherLine maxF={weather.temp_max_f} minF={weather.temp_min_f} precip={weather.precipitation_in} />
    </span>
  )
}
