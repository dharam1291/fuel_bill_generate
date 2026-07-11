# Test prompts

Copy any prompt below into Cursor (with the `fuel-bill-generate` MCP server attached) to test bill generation.

## Constraints enforced by the generator

- Bill time must be between **8PM and 10AM** (`20:00`–`10:00`)
- **Receipt number** must be **10–12 alphanumeric** characters
- **Receipt number** and **TXN NO** must never be the same
- PDFs save to **`~/generated_bills/`** by default
- Default template is **1**

---

## April 2026 — multi-company batch

```
Generate April 2026 fuel bills for HP on the 3rd (₹2412.50), Indian Oil on the 14th (₹2913), and Bharat Petroleum on the 21st (₹1936). Vehicle UP32JK1292, customer Dharmendra Singh, enable TXN NO.
```

## Single HP bill

```
Generate one fuel bill for April 2026: HP on the 5th, amount ₹1500, rate ₹96.5, vehicle UP32JK1292, customer Rahul Sharma, payment Online, enable TXN NO. Use evening time after 8PM.
```

## Bharat Petroleum with custom TXN

```
Create a Bharat Petroleum petrol bill for 12 April 2026. Amount ₹2200, vehicle UP32JK1292, customer Dharmendra Singh, time 09:30 AM, payment Cash. Use realistic auto-generated receipt and TXN numbers.
```

## Indian Oil early morning

```
Generate an Indian Oil fuel bill for April 18, 2026. Total amount ₹1800, rate 97.1, vehicle UP32JK1292, customer Dharmendra Singh, payment Debit Card, bill time 07:15 AM, enable TXN NO.
```

## List generated PDFs

```
List all fuel bill PDFs in my generated_bills folder.
```
