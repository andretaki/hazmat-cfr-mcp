#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { defaultCatalog } from "./catalog.js";
import { getLabelRequirements } from "./labels.js";
import { checkLimitedQuantityEligibility } from "./limited-quantity.js";
import { parseShippingDescription } from "./parser.js";
import { checkBasicSegregation } from "./segregation.js";
import { ALL_SOURCES, CFR_172_101, CFR_172_202, CFR_172_315, CFR_177_848 } from "./sources.js";
import { jsonToolResult } from "./tool-result.js";
import { validateBasicHazmatDescription } from "./validation.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "hazmat-cfr-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "lookup_hazmat_entry",
    {
      title: "Lookup Hazmat Entry",
      description: "Look up a hazardous material by UN/NA number or proper shipping name in the bundled public 49 CFR sample dataset.",
      inputSchema: {
        query: z.string().min(1).describe("UN/NA number or proper shipping name, e.g. UN1090 or Acetone."),
      },
    },
    async ({ query }) => jsonToolResult(defaultCatalog.lookup(query)),
  );

  server.registerTool(
    "classify_shipping_description",
    {
      title: "Classify Shipping Description",
      description: "Parse a basic DOT shipping description into UN/NA number, proper shipping name, hazard class, and packing group.",
      inputSchema: {
        text: z.string().min(1).describe("Free text such as 'UN1090, Acetone, 3, PG II'."),
      },
    },
    async ({ text }) => {
      const parsed = parseShippingDescription(text);
      const validation = validateBasicHazmatDescription(parsed);
      return jsonToolResult({ parsed, validation });
    },
  );

  server.registerTool(
    "validate_basic_hazmat_description",
    {
      title: "Validate Basic Hazmat Description",
      description: "Validate a structured DOT hazmat description against the bundled public 49 CFR sample dataset.",
      inputSchema: {
        idNumber: z.string().optional().describe("UN/NA number, e.g. UN1830."),
        properShippingName: z.string().optional().describe("Proper shipping name."),
        hazardClass: z.string().optional().describe("Primary hazard class/division, e.g. 3, 5.1, 8."),
        packingGroup: z.string().optional().describe("Packing group I, II, III, 1, 2, or 3."),
        subsidiaryRisks: z.array(z.string()).optional().describe("Subsidiary hazard classes/divisions."),
      },
    },
    async (input) => jsonToolResult(validateBasicHazmatDescription(input)),
  );

  server.registerTool(
    "get_label_requirements",
    {
      title: "Get Label Requirements",
      description: "Return hazard label codes for a UN/NA number or proper shipping name from the bundled public 49 CFR sample dataset.",
      inputSchema: {
        query: z.string().min(1).describe("UN/NA number or proper shipping name."),
      },
    },
    async ({ query }) => jsonToolResult(getLabelRequirements(query)),
  );

  server.registerTool(
    "check_basic_segregation",
    {
      title: "Check Basic Segregation",
      description: "Run conservative pairwise segregation warnings for supplied hazard classes using a small encoded subset of 49 CFR 177.848 logic.",
      inputSchema: {
        hazardClasses: z.array(z.string()).min(1).describe("Hazard classes/divisions, e.g. ['3', '8', '5.1']."),
      },
    },
    async ({ hazardClasses }) => jsonToolResult({ findings: checkBasicSegregation(hazardClasses), citation: CFR_177_848 }),
  );

  server.registerTool(
    "check_limited_quantity_eligibility",
    {
      title: "Check Limited Quantity Eligibility",
      description: "Conservative helper for common Class 3/Class 8 limited quantity candidate screening. Does not certify shipment compliance.",
      inputSchema: {
        hazardClass: z.string().describe("Primary hazard class/division, currently scoped to Class 3 and Class 8."),
        packingGroup: z.string().optional().describe("Packing group I, II, III, 1, 2, or 3."),
        innerPackageMl: z.number().positive().optional().describe("Inner package liquid volume in milliliters."),
        innerPackageKg: z.number().positive().optional().describe("Inner package mass in kilograms; used as an approximate liter-equivalent fallback."),
        outerGrossKg: z.number().positive().optional().describe("Gross outer package weight in kilograms."),
        isCombinationPackaging: z.boolean().optional().describe("Whether reviewed packaging is a combination package."),
      },
    },
    async (input) => jsonToolResult(checkLimitedQuantityEligibility(input)),
  );

  server.registerTool(
    "explain_cfr_source",
    {
      title: "Explain CFR Source",
      description: "Explain which public CFR source backs a field or rule in this server.",
      inputSchema: {
        topic: z.string().min(1).describe("A field/rule such as 'proper shipping name', 'label', 'segregation', or 'shipping papers'."),
      },
    },
    async ({ topic }) => jsonToolResult(explainTopic(topic)),
  );

  return server;
}

function explainTopic(topic: string) {
  const normalized = topic.toLowerCase();
  if (normalized.includes("segreg")) {
    return {
      topic,
      explanation: "Highway segregation is governed by 49 CFR 177.848. This server implements a conservative starter subset and always returns the citation for manual review.",
      source: CFR_177_848,
    };
  }
  if (normalized.includes("limited") || normalized.includes("quantity") || normalized.includes("lq")) {
    return {
      topic,
      explanation: "Limited quantity eligibility is material-, packing-group-, package-, quantity-, and mode-dependent. This server exposes only a conservative candidate screen for common Class 3 and Class 8 liquid workflows.",
      sources: [CFR_172_315],
    };
  }
  if (normalized.includes("paper") || normalized.includes("description")) {
    return {
      topic,
      explanation: "Basic shipping descriptions should include the identification number, proper shipping name, hazard class, and packing group when applicable.",
      source: CFR_172_202,
    };
  }
  if (normalized.includes("label") || normalized.includes("packing") || normalized.includes("proper") || normalized.includes("hazard")) {
    return {
      topic,
      explanation: "The 49 CFR 172.101 Hazardous Materials Table identifies the proper shipping name, hazard class/division, ID number, packing group, label codes, packaging references, aircraft quantity limits, and vessel stowage fields.",
      source: CFR_172_101,
    };
  }
  return {
    topic,
    explanation: "This server is backed by public CFR citations and a small demo dataset. Use the source list to verify any production decision against current regulations.",
    sources: ALL_SOURCES,
  };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`hazmat-cfr-mcp

MCP stdio server for public 49 CFR hazmat lookup and validation.

Run:
  hazmat-cfr-mcp

CLI:
  hazmat-cfr lookup UN1090
  hazmat-cfr validate "UN1090, Acetone, 3, PG II"

Tools:
  lookup_hazmat_entry
  classify_shipping_description
  validate_basic_hazmat_description
  get_label_requirements
  check_basic_segregation
  check_limited_quantity_eligibility
  explain_cfr_source
`);
    return;
  }

  const transport = new StdioServerTransport();
  const server = createServer();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
