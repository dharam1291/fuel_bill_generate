#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { generateFuelBills } = require("../src/generator");

async function main() {
  const configPath = process.argv[2] || path.join(__dirname, "..", "config.example.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  console.log(`Using config: ${configPath}`);
  const result = await generateFuelBills(config, ({ index, success, result, error }) => {
    if (success) {
      console.log(`✓ ${result.fileName} (${result.amount} INR)`);
    } else {
      console.error(`✗ Bill ${index + 1}: ${error}`);
    }
  });

  console.log("\nSummary:");
  console.log(`  Output: ${result.outputFolder}`);
  console.log(`  Success: ${result.succeeded}/${result.total}`);

  if (result.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal:", error.message);
  process.exit(1);
});
