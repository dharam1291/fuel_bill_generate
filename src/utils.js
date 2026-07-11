const path = require("path");
const { MONTH_INDEX } = require("./constants");

const DEFAULT_BILL_TIMES = ["08:18", "21:42", "07:05"];

function defaultOutputFolder() {
  return path.join(process.env.HOME || "", "generated_bills");
}

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

function parseTime(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time format: ${time}. Use HH:MM`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new Error(`Invalid time value: ${time}`);
  }
  return { hour, minute };
}

function isValidBillTime(time) {
  const { hour } = parseTime(time);
  return hour >= 20 || hour <= 10;
}

function resolveBillTime(entry, index) {
  if (entry.time) {
    if (!isValidBillTime(entry.time)) {
      throw new Error(
        `Bill time must be between 8PM and 10AM (20:00-10:00). Got: ${entry.time}`,
      );
    }
    return entry.time;
  }
  return DEFAULT_BILL_TIMES[index % DEFAULT_BILL_TIMES.length];
}

function resolveFuelValues(entry, index) {
  const rate = entry.rate ?? roundMoney(96.5 + index * 0.3);
  const amount = entry.amount ?? roundMoney((entry.liters ?? 25) * rate);
  const liters = entry.liters ?? roundMoney(amount / rate);

  return {
    rate,
    amount: roundMoney(amount),
    liters: roundMoney(liters),
    time: resolveBillTime(entry, index),
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

function resolveReceiptAndTxn(entry, config, index, billDate) {
  const useTxnNo = entry.enableTxnNo ?? config.enableTxnNo ?? true;
  const txnNo =
    entry.txnNo ??
    config.txnNo ??
    `TXN${billDate.replace(/-/g, "")}${String(index + 1).padStart(2, "0")}`;

  let receiptNumber =
    entry.receiptNumber ??
    config.receiptNumber ??
    String(4000 + index * 137 + Number(billDate.slice(-2)));

  if (String(receiptNumber) === String(txnNo)) {
    receiptNumber = String(Number(receiptNumber) + 1);
  }

  if (String(receiptNumber) === String(txnNo)) {
    throw new Error("Receipt number and TXN NO must not be the same");
  }

  return {
    receiptNumber: String(receiptNumber),
    txnNo: String(txnNo),
    useTxnNo,
  };
}

function log(step, message) {
  console.error(`[${step}] ${message}`);
}

module.exports = {
  defaultOutputFolder,
  roundMoney,
  formatDate,
  parseTime,
  isValidBillTime,
  resolveBillTime,
  resolveFuelValues,
  buildOutputName,
  resolveReceiptAndTxn,
  log,
};
