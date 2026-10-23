const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const compiled = ts.transpileModule(
  fs.readFileSync(require.resolve('../src/lib/paymentMilestones.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { reconcilePaymentMilestones, getConfiguredPaymentMilestones } = context.exports;
const schedule = (count) => Array.from({ length: count }, (_, i) => ({
  id: `payment-${i + 1}`, project_id: 'project', installment_number: i + 1,
  title: `Payment ${i + 1}`, percentage: count === 3 ? [40, 40, 20][i] : 100 / count,
  amount: 0, status: 'pending',
}));

for (const count of [2, 3]) {
  test(`reopening a duplicated ${count}-payment schedule matches the selected count`, () => {
    const defaults = schedule(count);
    const saved = defaults.flatMap((item) => [
      { ...item, status: 'paid', paid_at: '2026-10-24', title: 'Custom title' },
      { ...item, id: `${item.id}-duplicate` },
    ]);
    const result = reconcilePaymentMilestones(saved, defaults, 5800);
    assert.equal(result.length, count);
    assert.equal(result.reduce((sum, item) => sum + item.percentage, 0), 100);
    assert.equal(result.reduce((sum, item) => sum + item.amount, 0), 5800);
    assert.equal(result[0].status, 'paid');
    assert.equal(result[0].paid_at, '2026-10-24');
    assert.equal(result[0].title, 'Custom title');
  });
}

test('drops obsolete rows and fills missing installments by number', () => {
  const saved = schedule(6).filter((item) => item.installment_number !== 2);
  const result = reconcilePaymentMilestones(saved, schedule(2), 1000);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'payment-1');
  assert.equal(result[1].installment_number, 2);
  assert.equal(result[1].percentage, 50);
});

test('preserves custom percentages, including zero', () => {
  const saved = schedule(2);
  saved[0].percentage = 0;
  saved[1].percentage = 100;
  const result = reconcilePaymentMilestones(saved, schedule(2), 1000);
  assert.equal(result[0].amount, 0);
  assert.equal(result[1].amount, 1000);
});

for (const [count, percentages, total] of [[2, [50, 50], 1000], [3, [40, 40, 20], 5800]]) {
  test(`billing totals use the configured ${count} milestones instead of duplicate saved rows`, () => {
    const saved = schedule(count).flatMap((item, index) => [
      { ...item, percentage: percentages[index], status: index < 2 ? 'paid' : 'pending' },
      { ...item, id: `${item.id}-duplicate`, percentage: percentages[index], status: index < 2 ? 'paid' : 'pending' },
    ]);
    saved.push({ ...saved[0], id: 'obsolete', installment_number: count + 1, status: 'paid' });
    const result = getConfiguredPaymentMilestones({
      id: 'project', payment_installments_count: count, fixed_price_amount: total, installments: saved,
    });
    const paid = result.filter((item) => item.status === 'paid');
    assert.equal(result.length, count);
    assert.equal(paid.length, 2);
    assert.equal(paid.reduce((sum, item) => sum + item.amount, 0), count === 2 ? 1000 : 4640);
    assert.equal(result.find((item) => item.status !== 'paid')?.installment_number, count === 2 ? undefined : 3);
  });
}
