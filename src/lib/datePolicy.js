export const BUSINESS_TIME_ZONE = "America/Chicago";

function partsInTimeZone(date, timeZone = BUSINESS_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((parts, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});
}

export function getBusinessDate(date = new Date()) {
  const { year, month, day } = partsInTimeZone(date);
  return `${year}-${month}-${day}`;
}

export function getBusinessMonth(date = new Date()) {
  const { year, month } = partsInTimeZone(date);
  return `${year}-${month}`;
}

export function isPastValidTo(leavingDate, now = new Date()) {
  if (!leavingDate) return false;
  const validTo = new Date(leavingDate).toISOString().slice(0, 10);
  return getBusinessDate(now) > validTo;
}

export function isValidDateOnly(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
