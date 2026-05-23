export function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return toLocalISO(new Date());
}

export function dateAdd(days, base = new Date()) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

export function shiftISODate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

export function studyDayISO(date = new Date()) {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - 6);
  return toLocalISO(shifted);
}

export function studyDayRange(dateString) {
  const start = new Date(`${dateString}T06:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function daysUntil(dateString, base = new Date()) {
  const target = new Date(`${dateString}T00:00:00`);
  const today = new Date(toLocalISO(base));
  return Math.ceil((target - today) / 86400000);
}

export function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function formatShortDay(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
