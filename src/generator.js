const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { COMPANY_SELECTORS, PAYMENT_TYPES, FUEL_TYPES, COMPANIES } = require("./constants");
const {
  formatDate,
  resolveFuelValues,
  buildOutputName,
  log,
} = require("./utils");
const { getBrowserLaunchOptions, waitForForm } = require("./browser");

const FUEL_BILL_URL = "https://freeforonline.com/fuel-bills/index.html";

function validateConfig(config) {
  if (!config.month || !config.year) {
    throw new Error("month and year are required");
  }
  if (!Array.isArray(config.dates) || config.dates.length === 0) {
    throw new Error("dates must be a non-empty array");
  }

  for (const [index, entry] of config.dates.entries()) {
    if (!entry.date || !entry.company) {
      throw new Error(`dates[${index}] requires date and company`);
    }
    if (!COMPANIES.includes(entry.company)) {
      throw new Error(`dates[${index}].company must be one of: ${COMPANIES.join(", ")}`);
    }
    if (entry.paymentType && !PAYMENT_TYPES.includes(entry.paymentType)) {
      throw new Error(`dates[${index}].paymentType must be one of: ${PAYMENT_TYPES.join(", ")}`);
    }
    if (entry.fuelType && !FUEL_TYPES.includes(entry.fuelType)) {
      throw new Error(`dates[${index}].fuelType must be one of: ${FUEL_TYPES.join(", ")}`);
    }
    const station = config.stations?.[entry.company];
    if (!entry.stationName && !station?.name) {
      throw new Error(`Missing station name for ${entry.company}`);
    }
    if (!entry.address && !station?.address) {
      throw new Error(`Missing station address for ${entry.company}`);
    }
  }
}

function resolveStation(config, entry) {
  const defaults = config.stations?.[entry.company] || {};
  return {
    name: entry.stationName || defaults.name,
    address: entry.address || defaults.address,
  };
}

async function fillBill(page, config, entry, index, outputDir) {
  const {
    month,
    year,
    vehicleNumber = "UP32JK1292",
    fuelType = "Petrol",
    customerName = "",
    paymentType = "Cash",
    template = "2",
    enableTxnNo = true,
    txnNo,
    receiptNumber,
  } = config;

  const station = resolveStation(config, entry);
  const fuel = resolveFuelValues(entry, index);
  const billDate = formatDate(year, month, entry.date);
  const outputName = buildOutputName(year, month, entry.date, entry.company);
  const outputPath = path.join(outputDir, outputName);
  const total = config.dates.length;
  const label = `Bill ${index + 1}/${total}`;

  log(label, `Starting ${entry.company} bill for ${billDate}`);

  await page.goto(FUEL_BILL_URL, { waitUntil: "load" });
  log(label, "Waiting for form controls");
  await waitForForm(page);

  if (template !== "2") {
    await page.locator(`label[for="template-${template}"]`).click();
  }

  log(label, `Selecting company: ${entry.company}`);
  await page.locator(`label[for="${COMPANY_SELECTORS[entry.company].slice(1)}"]`).click();

  log(label, "Filling station details");
  await page.fill("#fs-station-name", station.name);
  await page.fill("#fs-address", station.address);

  log(label, `Fuel: ${fuel.liters}L @ ₹${fuel.rate}/L = ₹${fuel.amount}`);
  await page.fill("#fs-fuel-rate", String(fuel.rate));
  await page.fill("#fs-amount", String(fuel.amount));

  log(label, `Setting date ${billDate} time ${fuel.time}`);
  await page.fill("#fs-date", billDate);
  await page.fill("#fs-time", fuel.time);

  const resolvedFuelType = entry.fuelType || fuelType;
  const resolvedVehicle = entry.vehicleNumber || vehicleNumber;
  const resolvedCustomer = entry.customerName ?? customerName;
  const resolvedPayment = entry.paymentType || paymentType;

  log(label, `Vehicle ${resolvedVehicle}, fuel ${resolvedFuelType}, payment ${resolvedPayment}`);
  await page.fill("#u-vechicle-number", resolvedVehicle);
  await page.selectOption("#u-vehicle-type", { label: resolvedFuelType });
  await page.selectOption("#u-payment-type", { label: resolvedPayment });

  if (resolvedCustomer) {
    await page.fill("#u-name", resolvedCustomer);
  }

  const resolvedReceipt = entry.receiptNumber ?? receiptNumber;
  if (resolvedReceipt) {
    await page.fill("#fs-receipt-number", String(resolvedReceipt));
  }

  const useTxnNo = entry.enableTxnNo ?? enableTxnNo;
  const resolvedTxnNo = entry.txnNo ?? txnNo ?? `TXN${billDate.replace(/-/g, "")}${String(index + 1).padStart(2, "0")}`;

  if (useTxnNo) {
    log(label, `Enabling TXN NO: ${resolvedTxnNo}`);
    await page.locator('label[for="vat-tax"]').click();
    await page.fill("#vat-number", resolvedTxnNo);
  }

  await page.waitForTimeout(500);

  log(label, "Downloading PDF");
  let download;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60000 }),
        page.click("#download-fuel-bills"),
      ]);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      log(label, `Download attempt ${attempt} failed, retrying`);
      await page.waitForTimeout(1500);
    }
  }

  await download.saveAs(outputPath);
  const stats = fs.statSync(outputPath);
  if (stats.size < 1000) {
    throw new Error(`Downloaded file looks invalid (${stats.size} bytes)`);
  }

  log(label, `Saved ${outputPath}`);
  return {
    path: outputPath,
    fileName: outputName,
    company: entry.company,
    date: billDate,
    amount: fuel.amount,
    rate: fuel.rate,
    liters: fuel.liters,
    txnNo: useTxnNo ? resolvedTxnNo : null,
    paymentType: resolvedPayment,
    vehicleNumber: resolvedVehicle,
    customerName: resolvedCustomer || null,
  };
}

async function generateFuelBills(config, onProgress) {
  validateConfig(config);

  const outputDir = path.resolve(config.outputFolder || "./generated_bills");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch(getBrowserLaunchOptions());
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const results = [];

  for (let i = 0; i < config.dates.length; i++) {
    try {
      const result = await fillBill(page, config, config.dates[i], i, outputDir);
      results.push({ success: true, ...result });
      onProgress?.({ index: i, success: true, result });
    } catch (error) {
      results.push({
        success: false,
        company: config.dates[i].company,
        date: config.dates[i].date,
        error: error.message,
      });
      onProgress?.({ index: i, success: false, error: error.message });
    }
  }

  await browser.close();

  return {
    outputFolder: outputDir,
    total: config.dates.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    bills: results,
  };
}

module.exports = {
  generateFuelBills,
  validateConfig,
  FUEL_BILL_URL,
};
