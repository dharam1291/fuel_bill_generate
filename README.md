# fuel_bill_generate

Production-ready fuel bill PDF generator with a local MCP server for Cursor, Claude Desktop, and other MCP clients.

Automates [freeforonline.com/fuel-bills](https://freeforonline.com/fuel-bills/index.html) using Playwright. Supports HP, Indian Oil, and Bharat Petroleum receipts with configurable amounts, TXN NO, payment type, customer name, and vehicle details.

## Features

- Generate multiple fuel bill PDFs in one run
- Per-receipt **total amount**, rate, liters, date, and time
- **TXN NO** enabled by default (`vat-tax` on the site)
- Customer name, payment type, vehicle number, fuel type
- Station name and address per company
- MCP tools for AI agents (`generate_fuel_bills`, `list_generated_bills`)
- CLI for direct runs via JSON config

## Rules

| Rule | Detail |
|------|--------|
| Output folder | `$HOME/generated_bills` (e.g. `~/generated_bills/`) |
| Bill time | Must be between **8PM and 10AM** (`20:00`–`10:00`) |
| Receipt vs TXN | Receipt number and TXN NO must **never** be the same |
| Template | Default template **1** |

## Quick start

```bash
git clone https://github.com/dharam1291/fuel_bill_generate.git
cd fuel_bill_generate
npm install
npx playwright install chromium
npm run generate:config
```

PDFs are saved to `~/generated_bills/`.

## CLI usage

1. Copy the example config:

```bash
cp config.example.json my-bills.json
```

2. Edit only the variables you need:

| Variable | Description |
|----------|-------------|
| `month` | Full month name (`April`) |
| `year` | Bill year (`2026`) |
| `dates` | Array of bills (see below) |
| `vehicleNumber` | Default vehicle number |
| `fuelType` | `Petrol`, `Diesel`, `CNG`, `Electric` |
| `customerName` | Default customer name |
| `paymentType` | `Cash`, `Online`, `Debit Card` |
| `enableTxnNo` | Show TXN NO on bill (default `true`) |
| `txnNo` | Default transaction number |
| `template` | Bill template `1`, `2`, or `3` (default `1`) |
| `stations` | Default pump name/address per company |
| `outputFolder` | Override output path (default `~/generated_bills`) |

### Per-receipt fields (`dates[]`)

| Field | Required | Description |
|-------|----------|-------------|
| `date` | yes | Day of month |
| `company` | yes | `HP`, `Indian Oil`, `Bharat Petroleum` |
| `amount` | no | Total fuel amount in INR |
| `rate` | no | Price per liter |
| `liters` | no | Quantity (derived from amount/rate if omitted) |
| `time` | no | Bill time `HH:MM` (8PM–10AM only) |
| `customerName` | no | Overrides default |
| `paymentType` | no | Overrides default |
| `txnNo` | no | Per-receipt TXN number |
| `enableTxnNo` | no | Override global TXN setting |
| `receiptNumber` | no | Receipt number (must differ from TXN NO) |
| `stationName` / `address` | no | Override station defaults |

3. Run:

```bash
node scripts/generate.js my-bills.json
```

Output files are named `YYYY-MM-DD_<Company>.pdf`, e.g. `2026-04-03_HP.pdf`.

## MCP server (Cursor)

### 1. Install

```bash
git clone https://github.com/dharam1291/fuel_bill_generate.git
cd fuel_bill_generate
npm install
npx playwright install chromium
```

### 2. Add to Cursor

Open **Cursor Settings → MCP → Add new MCP server** and use:

```json
{
  "mcpServers": {
    "fuel-bill-generate": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/fuel_bill_generate/mcp-server/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/fuel_bill_generate` with your clone path.

See `cursor-mcp.example.json` for a copy-paste template.

### 3. MCP tools

#### `generate_fuel_bills`

Generates PDFs from the same JSON shape as the CLI config.

#### `list_generated_bills`

Lists PDF files in `~/generated_bills/` (or a custom folder).

### 4. Test prompts

See the [`prompts/`](prompts/) folder for ready-to-use Cursor prompts. Example:

> Generate April 2026 fuel bills for HP on the 3rd (₹2412.50), Indian Oil on the 14th (₹2913), and Bharat Petroleum on the 21st (₹1936). Vehicle UP32JK1292, customer Dharmendra Singh, enable TXN NO.

## Programmatic usage

```js
const { generateFuelBills } = require("./src/generator");

const result = await generateFuelBills({
  month: "April",
  year: 2026,
  vehicleNumber: "UP32JK1292",
  enableTxnNo: true,
  template: "1",
  stations: { /* ... */ },
  dates: [
    {
      date: 3,
      company: "HP",
      amount: 2412.5,
      rate: 96.5,
      time: "08:18",
      receiptNumber: "4037",
      txnNo: "TXN2026040301",
    },
  ],
});
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Browser not found | Run `npx playwright install chromium` |
| Invalid bill time | Use time between 8PM and 10AM only |
| Receipt/TXN conflict | Ensure receipt number ≠ TXN NO |
| Form fields missing | Site lazy-loads JS; the script triggers this automatically |
| Station name wrong | Logo selection overwrites name; script fills station after logo click |
| Empty PDF | Retry is built in; check network access to freeforonline.com |

## License

MIT
