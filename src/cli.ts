#!/usr/bin/env node
import {
  checkBasicSegregation,
  checkLimitedQuantityEligibility,
  defaultCatalog,
  getLabelRequirements,
  parseShippingDescription,
  validateBasicHazmatDescription,
} from "./index.js";

type Command = "lookup" | "parse" | "validate" | "labels" | "segregation" | "lq" | "help";

const [command = "help", ...args] = process.argv.slice(2) as [Command?, ...string[]];

try {
  switch (command) {
    case "lookup":
      print(defaultCatalog.lookup(requireArg(args, "query")));
      break;
    case "parse":
      print(parseShippingDescription(requireArg(args, "shipping description")));
      break;
    case "validate":
      print(validateBasicHazmatDescription(parseShippingDescription(requireArg(args, "shipping description"))));
      break;
    case "labels":
      print(getLabelRequirements(requireArg(args, "query")));
      break;
    case "segregation":
      print(checkBasicSegregation(args.length > 0 ? args : fail("Pass one or more hazard classes.")));
      break;
    case "lq":
      print(checkLimitedQuantityEligibility(parseLqArgs(args)));
      break;
    case "help":
    default:
      usage();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function requireArg(args: string[], label: string): string {
  return args.join(" ").trim() || fail(`Missing ${label}.`);
}

function fail(message: string): never {
  throw new Error(message);
}

function parseLqArgs(args: string[]) {
  const [hazardClass, packingGroup, innerPackageMl, outerGrossKg, combination = "true"] = args;
  if (!hazardClass || !packingGroup || !innerPackageMl || !outerGrossKg) {
    fail("Usage: hazmat-cfr lq <hazardClass> <packingGroup> <innerPackageMl> <outerGrossKg> [isCombinationPackaging]");
  }
  return {
    hazardClass,
    packingGroup,
    innerPackageMl: Number(innerPackageMl),
    outerGrossKg: Number(outerGrossKg),
    isCombinationPackaging: combination !== "false",
  };
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function usage(): void {
  console.log(`hazmat-cfr

Commands:
  lookup <UN/NA/name>                         Look up a bundled public CFR sample row
  parse <description>                         Parse a shipping description
  validate <description>                      Parse and validate a description
  labels <UN/NA/name>                         Return hazard label codes
  segregation <class...>                      Check pairwise segregation warnings
  lq <class> <PG> <innerMl> <outerKg> [bool]  Conservative limited quantity screen

Examples:
  hazmat-cfr lookup UN1090
  hazmat-cfr validate "UN1090, Acetone, 3, PG II"
  hazmat-cfr segregation 3 5.1 8
  hazmat-cfr lq 3 II 1000 12 true
`);
}
