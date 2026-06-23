#!/usr/bin/env node
import {
  checkBasicSegregation,
  checkLimitedQuantityEligibility,
  decodePackagingReference,
  decodeSpecialProvisions,
  defaultCatalog,
  getLabelRequirements,
  getPlacard,
  getShippingRequirements,
  parseShippingDescription,
  validateBasicHazmatDescription,
} from "./index.js";

type Command =
  | "lookup"
  | "requirements"
  | "parse"
  | "validate"
  | "labels"
  | "placard"
  | "segregation"
  | "lq"
  | "decode-sp"
  | "decode-pkg"
  | "help";

const [command = "help", ...args] = process.argv.slice(2) as [Command?, ...string[]];

try {
  switch (command) {
    case "lookup":
      print(defaultCatalog.lookup(requireArg(args, "query")));
      break;
    case "requirements":
      print(getShippingRequirements(requireArg(args, "query"), args[1]));
      break;
    case "placard":
      print(getPlacard(requireArg(args, "hazard class")));
      break;
    case "parse":
      print(parseShippingDescription(requireArg(args, "shipping description")));
      break;
    case "validate":
      print(validateBasicHazmatDescription(parseShippingDescription(requireArg(args, "shipping description"))));
      break;
    case "labels":
      print(getLabelRequirements(requireArg(args, "query"), args[1]));
      break;
    case "segregation":
      print(checkBasicSegregation(args.length > 0 ? args : fail("Pass one or more hazard classes.")));
      break;
    case "lq":
      print(checkLimitedQuantityEligibility(parseLqArgs(args)));
      break;
    case "decode-sp":
      print(decodeSpecialProvisions(args.length > 0 ? args : fail("Pass one or more special-provision codes.")));
      break;
    case "decode-pkg": {
      const [column, code] = args;
      if (column !== "exceptions" && column !== "nonBulk" && column !== "bulk") {
        fail("Usage: hazmat-cfr decode-pkg <exceptions|nonBulk|bulk> <code>");
      }
      print(decodePackagingReference(column, code));
      break;
    }
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
  lookup <UN/NA/name>                         Look up an entry in the full 49 CFR 172.101 table
  requirements <UN/NA/name>                   One-call shipping requirements (labels, packaging, placard, ...)
  placard <class>                             49 CFR 172.504 placard name + threshold for a hazard class
  parse <description>                         Parse a shipping description
  validate <description>                      Parse and validate a description
  labels <UN/NA/name>                         Return hazard label codes
  segregation <class...>                      Check pairwise segregation warnings
  lq <class> <PG> <innerMl> <outerKg> [bool]  Conservative limited quantity screen
  decode-sp <code...>                         Decode 172.102 special-provision codes
  decode-pkg <column> <code>                  Resolve a packaging reference (exceptions|nonBulk|bulk)

Examples:
  hazmat-cfr lookup UN1090
  hazmat-cfr requirements UN1830
  hazmat-cfr placard 2.3
  hazmat-cfr validate "UN1090, Acetone, 3, PG II"
  hazmat-cfr segregation 3 5.1 8
  hazmat-cfr lq 3 II 1000 12 true
  hazmat-cfr decode-sp IB2 T8 A3
  hazmat-cfr decode-pkg nonBulk 202
`);
}
