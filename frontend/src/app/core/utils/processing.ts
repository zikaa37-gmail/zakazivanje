export interface WithProcessing {
  starts_at: string;
  ends_at: string;
  status?: string;
  processing_offset?: number | null;
  processing_minutes?: number | null;
}

export interface WaitWindow {
  from: number;
  to: number;
}

const minutesOf = (dateTime: string) => Number(dateTime.slice(11, 13)) * 60 + Number(dateTime.slice(14, 16));

export function minutesLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function waitWindow(appointment: WithProcessing): WaitWindow | null {
  if (!appointment.processing_offset || !appointment.processing_minutes) return null;
  if (appointment.status === 'cancelled' || appointment.status === 'no_show') return null;
  const start = minutesOf(appointment.starts_at);
  const from = start + appointment.processing_offset;
  const to = from + appointment.processing_minutes;
  return to < minutesOf(appointment.ends_at) ? { from, to } : null;
}

export function waitLabel(appointment: WithProcessing): string | null {
  const wait = waitWindow(appointment);
  return wait ? `${minutesLabel(wait.from)} – ${minutesLabel(wait.to)}` : null;
}

export interface ProcessingParts {
  first: number;
  wait: number;
  last: number;
}

export function processingParts(duration: number, first: number | null, wait: number | null): ProcessingParts | null {
  if (!first || !wait) return null;
  return { first, wait, last: duration - first - wait };
}

export const PROCESSING_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90, 105, 120];
