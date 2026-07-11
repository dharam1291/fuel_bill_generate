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

function hashSeed(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

function randomDigit(rng, allowZero = true) {
  const digit = rng() % 10;
  if (!allowZero && digit === 0) {
    return 1 + (rng() % 9);
  }
  return digit;
}

function generateRealisticReceiptNumber(billDate, index, company = "") {
  const rng = createRng(hashSeed(`${billDate}:${index}:${company}:receipt`));
  const length = 10 + (rng() % 3);
  let receiptNumber = "";

  for (let i = 0; i < length; i += 1) {
    if (i === 0) {
      receiptNumber += String(1 + (rng() % 9));
      continue;
    }

    if (length >= 11 && i === length - 2 && rng() % 5 === 0) {
      receiptNumber += String.fromCharCode(65 + (rng() % 26));
      continue;
    }

    receiptNumber += String(randomDigit(rng));
  }

  if (!isValidReceiptNumber(receiptNumber)) {
    throw new Error(`Failed to generate valid receipt number: ${receiptNumber}`);
  }

  return receiptNumber;
}

function generateRealisticTxnNumber(billDate, index, company = "") {
  const rng = createRng(hashSeed(`${billDate}:${index}:${company}:txn`));
  const length = 10 + (rng() % 3);
  let txnNo = "";

  for (let i = 0; i < length; i += 1) {
    if (i === 0) {
      txnNo += String(2 + (rng() % 8));
      continue;
    }

    if (length === 12 && i === 4 && rng() % 4 === 0) {
      txnNo += String.fromCharCode(65 + (rng() % 26));
      continue;
    }

    txnNo += String(randomDigit(rng));
  }

  return txnNo;
}

function generateReceiptNumber(billDate, index, company = "") {
  return generateRealisticReceiptNumber(billDate, index, company);
}

function ensureDistinctReceipt(receiptNumber, txnNo, billDate, index, company = "") {
  let receipt = String(receiptNumber);
  let attempt = 0;

  while (receipt === String(txnNo)) {
    attempt += 1;
    receipt = generateRealisticReceiptNumber(billDate, index + attempt * 17, company);
  }

  return receipt;
}

function resolveReceiptAndTxn(entry, config, index, billDate) {
  const useTxnNo = entry.enableTxnNo ?? config.enableTxnNo ?? true;
  const company = entry.company || "";
  const txnNo =
    entry.txnNo ??
    config.txnNo ??
    generateRealisticTxnNumber(billDate, index, company);

  const providedReceipt = entry.receiptNumber ?? config.receiptNumber;
  if (providedReceipt && !isValidReceiptNumber(providedReceipt)) {
    throw new Error(
      `Receipt number must be 10-12 alphanumeric characters. Got: ${providedReceipt}`,
    );
  }

  let receiptNumber =
    providedReceipt ?? generateRealisticReceiptNumber(billDate, index, company);
  receiptNumber = ensureDistinctReceipt(
    receiptNumber,
    txnNo,
    billDate,
    index,
    company,
  );

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
  generateRealisticReceiptNumber,
  generateRealisticTxnNumber,
  resolveBillTime,
  resolveFuelValues,
  buildOutputName,
  resolveReceiptAndTxn,
  isValidIndianTelNo,
  resolveTelNo,
  log,
};
