(function () {
  'use strict';
  const form = document.querySelector('#bond-calculator');
  if (!form) return;
  const result = form.querySelector('output');
  function calculate() {
    const fields = ['face', 'coupon', 'yield', 'years'].map(name => form.elements.namedItem(name));
    if (fields.some(field => field.value === '' || !field.checkValidity())) {
      result.textContent = '请填写有效数值：面值须大于0，利率为0至100%，期限为1至50的整数。';
      return;
    }
    const [face, couponPercent, yieldPercent, years] = fields.map(field => Number(field.value));
    const coupon = face * couponPercent / 100;
    const rate = yieldPercent / 100;
    let price = 0;
    for (let year = 1; year <= years; year++) price += coupon / Math.pow(1 + rate, year);
    price += face / Math.pow(1 + rate, years);
    const relation = Math.abs(price - face) < 0.005 ? '平价' : price > face ? '溢价' : '折价';
    result.textContent = `理论价格 ${price.toFixed(2)} 元（${relation}）；每年票息 ${coupon.toFixed(2)} 元。市场收益率${yieldPercent > couponPercent ? '高于' : yieldPercent < couponPercent ? '低于' : '等于'}票面利率。`;
  }
  form.addEventListener('input', calculate);
  form.addEventListener('submit', event => event.preventDefault());
  calculate();
}());
