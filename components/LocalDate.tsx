"use client";

/** Renders a timestamp in the viewer's own time zone (server components would otherwise use UTC). */
export default function LocalDate({ value, dateOnly = false }: { value: Date | string; dateOnly?: boolean }) {
  const date = new Date(value);
  return <time dateTime={date.toISOString()} suppressHydrationWarning>{dateOnly ? date.toLocaleDateString() : date.toLocaleString()}</time>;
}
