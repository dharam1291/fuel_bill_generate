async function fillAndSyncField(page, selector, value) {
  await page.fill(selector, String(value));
  await page.dispatchEvent(selector, "input");
  await page.dispatchEvent(selector, "keyup");
  await page.dispatchEvent(selector, "change");
}

async function syncBillIdsInPreview(page, receiptNumber, txnNo, useTxnNo) {
  await page.evaluate(
    ({ receipt, txn, showTxn }) => {
      const receiptInput = document.querySelector("#fs-receipt-number");
      const vatInput = document.querySelector("#vat-number");
      if (receiptInput) receiptInput.value = receipt;
      if (vatInput && showTxn) vatInput.value = txn;

      document.querySelectorAll(".fs-receipt-number").forEach((el) => {
        el.textContent = receipt;
      });

      document.querySelectorAll(".vat-number").forEach((el) => {
        el.textContent = showTxn ? txn : "";
      });

      document.querySelectorAll(".vat-none").forEach((el) => {
        el.classList.toggle("d-none", !showTxn);
      });
    },
    { receipt: receiptNumber, txn: txnNo, showTxn: useTxnNo },
  );
}

module.exports = {
  fillAndSyncField,
  syncBillIdsInPreview,
};
