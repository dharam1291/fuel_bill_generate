const path = require("path");
const { MONTH_INDEX } = require("./constants");

const DEFAULT_BILL_TIMES = ["08:18", "21:42", "07:05"];
const RECEIPT_NUMBER_PATTERN = /^[A-Za-z0-9]{10,12}$/;

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

function isValidReceiptNumber(value) {
  return RECEIPT_NUMBER_PATTERN.test(String(value));
}

function generateReceiptNumber(billDate, index) {
  const compactDate = billDate.replace(/-/g, "").slice(2);
  const receiptNumber = `RCPT${compactDate}${String(index + 1).padStart(2, "0")}`;
  if (!isValidReceiptNumber(receiptNumber)) {
    throw new Error(`Failed to generate valid receipt number: ${receiptNumber}`);
  }
  return receiptNumber;
}

function ensureDistinctReceipt(receiptNumber, txnNo, billDate, index) {
  let receipt = String(receiptNumber);
  let attempt = 0;

  while (receipt === String(txnNo)) {
    attempt += 1;
    receipt = generateReceiptNumber(billDate, index + attempt * 10);
  }

  return receipt;
}

function resolveReceiptAndTxn(entry, config, index, billDate) {
  const useTxnNo = entry.enableTxnNo ?? config.enableTxnNo ?? true;
  const txnNo =
    entry.txnNo ??
    config.txnNo ??
    `TXN${billDate.replace(/-/g, "")}${String(index + 1).padStart(2, "0")}`;

  const providedReceipt = entry.receiptNumber ?? config.receiptNumber;
  if (providedReceipt && !isValidReceiptNumber(providedReceipt)) {
    throw new Error(
      `Receipt number must be 10-12 alphanumeric characters. Got: ${providedReceipt}`,
    );
  }

  let receiptNumber = providedReceipt ?? generateReceiptNumber(billDate, index);
  receiptNumber = ensureDistinctReceipt(receiptNumber, txnNo, billDate, index);

  if (receiptNumber === String(txnNo)) {
    throw new Error("Receipt number and TXN NO must not be the same");
  }

  return {
    receiptNumber,
    txnNo: String(txnNo),
    useTxnNo,
  };
}

function isValidIndianTelNo(value) {
  return /^[6-9]\d{9}$/.test(String(value));
}

function resolveTelNo(entry, config) {
  const provided = entry.telNo ?? config.telNo;
  const shouldClear = entry.clearTelNo ?? config.clearTelNo ?? true;

  if (provided) {
    if (!isValidIndianTelNo(provided)) {
      throw new Error(
        `TEL NO must be a valid 10-digit Indian mobile number. Got: ${provided}`,
      );
    }
    return { telNo: String(provided), clearTelNo: false };
  }

  return { telNo: null, clearTelNo: shouldClear };
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
  isValidReceiptNumber,
  generateReceiptNumber,
  resolveBillTime,
  resolveFuelValues,
  buildOutputName,
  resolveReceiptAndTxn,
  isValidIndianTelNo,
  resolveTelNo,
  log,
};
