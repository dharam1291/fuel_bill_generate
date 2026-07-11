const { MONTH_INDEX } = require("./constants");

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function formatDate(year, month, day) {
  const monthNum = MONTH_INDEX[month];
  if (!monthNum) {
    throw new Error(`Unknown month: ${month}. Use full month name, e.g. April`);
  }
  return `${year}-${monthNum}-${String(day).padStart(2, "0")}`;
}

function resolveFuelValues(entry, index) {
  const rate = entry.rate ?? roundMoney(96.5 + index * 0.3);
  const amount = entry.amount ?? roundMoney((entry.liters ?? 25) * rate);
  const liters = entry.liters ?? roundMoney(amount / rate);

  return {
    rate,
    amount: roundMoney(amount),
    liters: roundMoney(liters),
    time: entry.time ?? ["09:18", "14:42", "18:05"][index % 3],
  };
}

function buildOutputName(year, month, day, company) {
  const { FILE_NAME_SUFFIX } = require("./constants");
  const billDate = formatDate(year, month, day);
  const suffix = FILE_NAME_SUFFIX[company];
  if (!suffix) {
    throw new Error(`Unsupported company: ${company}`);
  }
  return `${billDate}_${suffix}.pdf`;
}

function log(step, message) {
  console.error(`[${step}] ${message}`);
}

module.exports = {
  roundMoney,
  formatDate,
  resolveFuelValues,
  buildOutputName,
  log,
};
