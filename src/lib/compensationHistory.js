const COMPENSATION_FIELDS = [
  "payType",
  "perDayRate",
  "perHourRate",
  "otRatePerHour",
  "annualGrossSalary",
  "monthlyGrossSalary",
  "clientPerDayRate",
  "clientPerHourRate",
  "clientOtRatePerHour",
];

export function compensationSnapshot(source, effectiveFrom) {
  const annualGrossSalary = Number(source.annualGrossSalary || 0);
  return {
    effectiveFrom,
    payType: source.payType || "daily",
    perDayRate: Number(source.perDayRate || 0),
    perHourRate: Number(source.perHourRate || 0),
    otRatePerHour: Number(source.otRatePerHour || 0),
    annualGrossSalary,
    monthlyGrossSalary: annualGrossSalary > 0
      ? Number((annualGrossSalary / 12).toFixed(2))
      : Number(source.monthlyGrossSalary || 0),
    clientPerDayRate: Number(source.clientPerDayRate || 0),
    clientPerHourRate: Number(source.clientPerHourRate || 0),
    clientOtRatePerHour: Number(source.clientOtRatePerHour || 0),
  };
}

export function hasCompensationChanged(current, next) {
  if (current.payType !== next.payType) return true;
  return COMPENSATION_FIELDS
    .filter((field) => field !== "payType")
    .some((field) => Number(current[field] || 0) !== Number(next[field] || 0));
}

export function compensationForMonth(user, month, existingPayroll = null) {
  const monthStart = `${month}-01`;
  const history = Array.isArray(user.compensationHistory)
    ? [...user.compensationHistory]
        .filter((entry) => entry.effectiveFrom <= monthStart)
        .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom))
    : [];

  if (history.length) {
    return compensationSnapshot(history[history.length - 1], history[history.length - 1].effectiveFrom);
  }

  // Existing payroll rows are snapshots. Preserve their original rate when an
  // old draft is regenerated before an employee has compensation history.
  return compensationSnapshot(existingPayroll || user, monthStart);
}

export function payrollSnapshotAsCompensation(payroll) {
  return compensationSnapshot(payroll, `${payroll.month}-01`);
}
