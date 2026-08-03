/** Fecha (YYYY-MM-DD) de un instante visto desde una zona horaria IANA. */
export function dayInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Resta días a una fecha YYYY-MM-DD (aritmética de calendario, sin zona). */
export function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function todayInTz(timeZone: string): string {
  return dayInTz(new Date(), timeZone);
}

export function yesterdayInTz(timeZone: string): string {
  return shiftDay(todayInTz(timeZone), -1);
}
