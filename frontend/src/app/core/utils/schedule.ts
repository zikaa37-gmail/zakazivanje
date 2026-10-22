import { OpeningHour, ShiftTemplate } from '../models/business-setting.model';
import { StaffMember, WorkingHour } from '../models/staff.model';
import { parseDate } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;

function mondayOf(date: string): number {
  const d = parseDate(date);
  const weekday = (d.getDay() + 6) % 7;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - weekday);
}

export function isoWeekday(date: string): number {
  return ((parseDate(date).getDay() + 6) % 7) + 1;
}

export function weekIndex(member: Pick<StaffMember, 'rotation_weeks' | 'rotation_starts_on'>, date: string): number {
  const weeks = Math.max(1, member.rotation_weeks ?? 1);
  if (weeks === 1 || !member.rotation_starts_on) return 0;
  const diff = Math.round((mondayOf(date) - mondayOf(member.rotation_starts_on)) / (7 * DAY_MS));
  return ((diff % weeks) + weeks) % weeks;
}

export function hoursOn(member: StaffMember, date: string, openingHours: OpeningHour[] | undefined): WorkingHour[] {
  const weekday = isoWeekday(date);
  const opening = openingHours?.find((h) => h.weekday === weekday);
  if (openingHours && (!opening?.opens_at || !opening.closes_at)) return [];
  const week = weekIndex(member, date);
  return member.working_hours
    .filter((h) => h.weekday === weekday && (h.week ?? 0) === week)
    .map((h) => ({
      ...h,
      starts_at: opening?.opens_at && opening.opens_at > h.starts_at ? opening.opens_at : h.starts_at,
      ends_at: opening?.closes_at && opening.closes_at < h.ends_at ? opening.closes_at : h.ends_at,
    }))
    .filter((h) => h.starts_at < h.ends_at)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function shiftName(hours: Pick<WorkingHour, 'starts_at' | 'ends_at'>[], shifts: ShiftTemplate[]): string {
  if (!hours.length) return 'Ne radi';
  if (hours.length === 1) {
    const match = shifts.find((s) => s.starts_at === hours[0].starts_at && s.ends_at === hours[0].ends_at);
    if (match) return match.name;
  }
  return hours.map((h) => `${h.starts_at}–${h.ends_at}`).join(', ');
}
