export function calculatePayrollFinancials(item) {
  const round2 = (num) =>
    Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

  const grossPay = Number(item.grossPay || 0);
  const poAmount = Number(item.poAmount || 0);

  //  Employer Tax (7.65%)
  const employerTax = round2(grossPay * 0.0765);

  //  Existing margin
  const margin = round2(poAmount - grossPay);
  //  Final profit after tax
  const netProfit = round2(poAmount - (grossPay + employerTax));

  return {
    employerTax,
    margin,
    netProfit,
  };
}