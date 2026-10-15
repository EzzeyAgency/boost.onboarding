"use client";

import { useEffect, useState } from "react";

// dateStyle/timeStyle can't be combined with timeZoneName (throws "Invalid option"), so spell the parts out.
export const withZone = (date: Date, dateOnly: boolean, timeZone?: string) =>
  dateOnly
    ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone })
    : date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone });

/**
 * A timestamp in the viewer's own time zone, always labeled (e.g. "Oct 14, 2026, 9:05 AM MST").
 * The server can't know the viewer's zone, so it renders UTC with a "UTC" label, and the browser swaps in local time.
 */
export default function LocalDate({ value, dateOnly = false }: { value: Date | string; dateOnly?: boolean }) {
  const date = new Date(value);
  const [text, setText] = useState(() => withZone(date, dateOnly, "UTC"));
  useEffect(() => { setText(withZone(new Date(value), dateOnly)); }, [value, dateOnly]);
  return <time dateTime={date.toISOString()}>{text}</time>;
}
