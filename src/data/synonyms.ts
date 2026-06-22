/**
 * Curated synonym + CAS overlay — NOT part of 49 CFR 172.101.
 *
 * The Hazardous Materials Table lists only proper shipping names; it has no
 * synonyms or CAS numbers. This hand-maintained layer maps common trade/colloquial
 * names and CAS numbers onto UN/NA numbers so casual lookups ("IPA", "muriatic
 * acid", "bleach") resolve. It is merged onto table rows at catalog construction
 * and is clearly distinguished from regulatory data in tool output.
 *
 * Keep this conservative: every entry must be a genuine alternate name for the
 * material described by that exact UN/NA proper shipping name. When in doubt, omit.
 */
export interface SynonymOverlay {
  synonyms: string[];
  cas?: string;
}

export const SYNONYM_OVERLAY: Record<string, SynonymOverlay> = {
  UN1090: { synonyms: ["dimethyl ketone", "propanone", "2-propanone"], cas: "67-64-1" },
  UN1219: { synonyms: ["isopropyl alcohol", "ipa", "2-propanol", "rubbing alcohol"], cas: "67-63-0" },
  UN1170: { synonyms: ["ethyl alcohol", "ethanol", "grain alcohol"], cas: "64-17-5" },
  UN1230: { synonyms: ["methyl alcohol", "wood alcohol", "carbinol"], cas: "67-56-1" },
  UN1203: { synonyms: ["gasoline", "petrol", "motor spirit", "gas"], cas: "8006-61-9" },
  UN1789: { synonyms: ["muriatic acid", "hydrogen chloride solution", "hcl"], cas: "7647-01-0" },
  UN1830: { synonyms: ["battery acid", "sulphuric acid", "oil of vitriol"], cas: "7664-93-9" },
  UN2796: { synonyms: ["dilute sulfuric acid", "dilute sulphuric acid", "battery fluid acid"], cas: "7664-93-9" },
  UN1824: { synonyms: ["caustic soda solution", "lye solution", "sodium hydrate solution"], cas: "1310-73-2" },
  UN1823: { synonyms: ["caustic soda", "lye", "sodium hydrate"], cas: "1310-73-2" },
  UN2014: { synonyms: ["hydrogen peroxide solution", "peroxide"], cas: "7722-84-1" },
  UN2984: { synonyms: ["dilute hydrogen peroxide", "hydrogen peroxide aqueous solution"], cas: "7722-84-1" },
  UN1791: { synonyms: ["bleach", "sodium hypochlorite solution", "liquid bleach"], cas: "7681-52-9" },
  UN1805: { synonyms: ["phosphoric acid", "orthophosphoric acid"], cas: "7664-38-2" },
  UN2031: { synonyms: ["nitric acid", "aqua fortis"], cas: "7697-37-2" },
  UN1648: { synonyms: ["methyl cyanide", "cyanomethane", "acetonitrile"], cas: "75-05-8" },
  UN1294: { synonyms: ["toluol", "methylbenzene", "phenylmethane"], cas: "108-88-3" },
  UN1307: { synonyms: ["xylol", "dimethylbenzene", "xylene"], cas: "1330-20-7" },
  UN1114: { synonyms: ["benzol", "benzene", "cyclohexatriene"], cas: "71-43-2" },
  UN2209: { synonyms: ["formalin", "formaldehyde solution", "methanal solution"], cas: "50-00-0" },
  UN1715: { synonyms: ["acetic oxide", "ethanoic anhydride"], cas: "108-24-7" },
  UN2789: { synonyms: ["glacial acetic acid", "ethanoic acid"], cas: "64-19-7" },
  UN1760: { synonyms: ["corrosive liquid"], cas: undefined },
  UN1993: { synonyms: ["flammable liquid"], cas: undefined },
  UN1888: { synonyms: ["trichloromethane", "chloroform"], cas: "67-66-3" },
  UN1098: { synonyms: ["allyl alcohol", "2-propen-1-ol"], cas: "107-18-6" },
  UN1086: { synonyms: ["vinyl chloride", "chloroethene"], cas: "75-01-4" },
  UN1005: { synonyms: ["anhydrous ammonia", "ammonia gas"], cas: "7664-41-7" },
  UN2672: { synonyms: ["ammonia solution", "ammonium hydroxide", "aqua ammonia"], cas: "1336-21-6" },
};
