// Espejo del cálculo de descuentos de ley que hace el backend
// (backEnd/src/utils/users/payrollUtils.js), para poder mostrarle al admin
// el salario neto en vivo mientras escribe el salario base, sin tener que
// pedírselo al servidor. El backend vuelve a calcular todo por su cuenta al
// guardar: esto es solo para la vista previa.
const AFP_RATE = 0.0725;
const ISSS_RATE = 0.03;
const ISSS_MAX_BASE = 1000;

const ISR_BRACKETS = [
  { upTo: 550, rate: 0, base: 0, over: 0 },
  { upTo: 895.24, rate: 0.10, base: 17.67, over: 550 },
  { upTo: 2038.10, rate: 0.20, base: 60.0, over: 895.24 },
  { upTo: Infinity, rate: 0.30, base: 288.57, over: 2038.10 },
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// SOLO sobre el salario base. Los bonos se suman después, íntegros, en la
// planilla: son un pago discrecional del dueño, no salario cotizable (ver el
// mismo comentario en backEnd/src/utils/users/payrollUtils.js).
export const calculatePayrollDeductions = (grossSalary) => {
  const salary = Number(grossSalary);

  if (!salary || salary <= 0 || Number.isNaN(salary)) {
    return { grossSalary: 0, afp: 0, isss: 0, isr: 0, taxableBase: 0, netSalary: 0 };
  }

  const afp = round2(salary * AFP_RATE);
  const isss = round2(Math.min(salary, ISSS_MAX_BASE) * ISSS_RATE);
  const taxableBase = salary - afp - isss;

  const bracket = ISR_BRACKETS.find((b) => taxableBase <= b.upTo);
  const isr = round2(bracket.rate === 0 ? 0 : (taxableBase - bracket.over) * bracket.rate + bracket.base);

  const netSalary = round2(salary - afp - isss - isr);

  return {
    grossSalary: round2(salary),
    afp,
    isss,
    isr,
    taxableBase: round2(taxableBase),
    netSalary,
  };
};

export default { calculatePayrollDeductions };
