#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { generateFuelBills } = require("../src/generator");
const { defaultOutputFolder } = require("../src/utils");
const { COMPANIES, PAYMENT_TYPES, FUEL_TYPES } = require("../src/constants");

const server = new Server(
  {
    name: "fuel-bill-generate",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const generateTool = {
  name: "generate_fuel_bills",
  description:
    "Generate and download fuel bill PDFs from freeforonline.com. PDFs save to ~/generated_bills by default. Bill time must be 8PM-10AM. Receipt number and TXN NO must differ.",
  inputSchema: {
    type: "object",
    properties: {
      month: {
        type: "string",
        description: "Full month name, e.g. April",
      },
      year: {
        type: "number",
        description: "Bill year, e.g. 2026",
      },
      vehicleNumber: {
        type: "string",
        description: "Vehicle registration number",
      },
      fuelType: {
        type: "string",
        enum: FUEL_TYPES,
        description: "Default fuel type for all bills",
      },
      customerName: {
        type: "string",
        description: "Default customer name for all bills",
      },
      paymentType: {
        type: "string",
        enum: PAYMENT_TYPES,
        description: "Default payment mode",
      },
      enableTxnNo: {
        type: "boolean",
        description: "Enable TXN NO on receipts (default true)",
      },
      txnNo: {
        type: "string",
        description: "Default TXN number when enableTxnNo is true (auto-generated if omitted)",
      },
      receiptNumber: {
        type: "string",
        description: "Optional receipt number override (10-12 alphanumeric)",
      },
      outputFolder: {
        type: "string",
        description: `Folder to save PDFs (default ${defaultOutputFolder()})`,
      },
      template: {
        type: "string",
        enum: ["1", "2", "3"],
        description: "Bill template style (default 1, always explicitly selected)",
      },
      clearTelNo: {
        type: "boolean",
        description: "Remove auto-generated TEL NO from bill (default true)",
      },
      telNo: {
        type: "string",
        description: "Optional 10-digit Indian mobile number for TEL NO (otherwise removed)",
      },
      stations: {
        type: "object",
        description: "Default station name/address per company",
        additionalProperties: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "string" },
          },
        },
      },
      dates: {
        type: "array",
        description: "One bill per entry",
        items: {
          type: "object",
          properties: {
            date: { type: "number", description: "Day of month (1-31)" },
            company: { type: "string", enum: COMPANIES },
            amount: {
              type: "number",
              description: "Total fuel amount in INR for this receipt",
            },
            rate: {
              type: "number",
              description: "Fuel rate per liter. Liters derived from amount/rate if omitted",
            },
            liters: {
              type: "number",
              description: "Fuel quantity in liters. Amount derived if omitted",
            },
            time: {
              type: "string",
              description: "Bill time HH:MM (must be between 8PM and 10AM)",
            },
            customerName: { type: "string" },
            paymentType: { type: "string", enum: PAYMENT_TYPES },
            fuelType: { type: "string", enum: FUEL_TYPES },
            vehicleNumber: { type: "string" },
            stationName: { type: "string" },
            address: { type: "string" },
            enableTxnNo: { type: "boolean" },
            txnNo: { type: "string" },
            receiptNumber: {
              type: "string",
              description: "Receipt number (10-12 alphanumeric, must differ from TXN NO)",
            },
          },
          required: ["date", "company"],
        },
      },
    },
    required: ["month", "year", "dates"],
  },
};

const listTool = {
  name: "list_generated_bills",
  description: "List PDF files in the output folder",
  inputSchema: {
    type: "object",
    properties: {
      outputFolder: {
        type: "string",
        description: `Folder to inspect (default ${defaultOutputFolder()})`,
      },
    },
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [generateTool, listTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "generate_fuel_bills") {
    const result = await generateFuelBills(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (name === "list_generated_bills") {
    const outputFolder = path.resolve(args.outputFolder || defaultOutputFolder());
    if (!fs.existsSync(outputFolder)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ outputFolder, files: [] }, null, 2),
          },
        ],
      };
    }

    const files = fs
      .readdirSync(outputFolder)
      .filter((file) => file.endsWith(".pdf"))
      .map((file) => {
        const fullPath = path.join(outputFolder, file);
        const stats = fs.statSync(fullPath);
        return { file, path: fullPath, sizeBytes: stats.size };
      });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ outputFolder, files }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("fuel-bill-generate MCP server running on stdio");
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
