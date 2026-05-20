export const appTimeZone = 'America/Santiago'

const dateKeyFormatter = new Intl.DateTimeFormat('fr-CA', {
  timeZone: appTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeInputFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: appTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
})

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: appTimeZone,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function normalizeIntlText(value: string) {
  return value.replace(/[\u00a0\u202f]/g, ' ')
}

function toDate(value: string | Date) {
  return typeof value === 'string' ? new Date(value) : value
}

function invalidDate() {
  return new Date(Number.NaN)
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function parseTimeInput(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)

  if (!match) return null

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  }
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = offsetFormatter.formatToParts(date)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  )
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  )

  return asUtc - date.getTime()
}

export function zonedDateTime(fecha: string, hora: string) {
  const dateParts = parseDateInput(fecha)
  const timeParts = parseTimeInput(hora)

  if (!dateParts || !timeParts) return invalidDate()

  const utcGuess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    0,
    0
  )
  let date = new Date(utcGuess)

  for (let index = 0; index < 2; index += 1) {
    date = new Date(utcGuess - getTimeZoneOffsetMs(date))
  }

  return date
}

export function zonedDateKey(value: string | Date = new Date()) {
  return dateKeyFormatter.format(toDate(value))
}

export function zonedTimeInput(value: string | Date) {
  return normalizeIntlText(timeInputFormatter.format(toDate(value)))
}

export function zonedHour(value: string | Date) {
  return Number(zonedTimeInput(value).slice(0, 2))
}
