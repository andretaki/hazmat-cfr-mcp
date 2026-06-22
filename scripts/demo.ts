import {
  checkBasicSegregation,
  checkLimitedQuantityEligibility,
  defaultCatalog,
  getLabelRequirements,
  parseShippingDescription,
  validateBasicHazmatDescription,
} from "../src/index.js";

const examples = [
  {
    title: "Acetone / UN1090",
    run: () => ({
      lookup: defaultCatalog.lookup("UN1090"),
      parsed: parseShippingDescription("UN1090, Acetone, 3, PG II"),
      labels: getLabelRequirements("UN1090"),
    }),
  },
  {
    title: "Sulfuric acid / UN1830",
    run: () => ({
      lookup: defaultCatalog.lookup("sulfuric acid more than 51 percent"),
      validation: validateBasicHazmatDescription({
        idNumber: "UN1830",
        properShippingName: "Sulfuric acid with more than 51 percent acid",
        hazardClass: "8",
        packingGroup: "II",
      }),
      limitedQuantityCandidate: checkLimitedQuantityEligibility({
        hazardClass: "8",
        packingGroup: "II",
        innerPackageMl: 1000,
        outerGrossKg: 12,
        isCombinationPackaging: true,
      }),
    }),
  },
  {
    title: "Bad / incomplete description",
    run: () => ({
      parsed: parseShippingDescription("Acetone flammable liquid"),
      validation: validateBasicHazmatDescription({
        properShippingName: "Acetone",
        hazardClass: "3",
      }),
      segregation: checkBasicSegregation(["3", "5.1", "8"]),
    }),
  },
];

for (const example of examples) {
  console.log(`\n=== ${example.title} ===`);
  console.log(JSON.stringify(example.run(), null, 2));
}
