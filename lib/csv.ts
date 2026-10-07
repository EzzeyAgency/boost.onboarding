// Prevents spreadsheet formula injection in exported CSV files. Keep exactly as specified in the handoff.
export function toCsvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
