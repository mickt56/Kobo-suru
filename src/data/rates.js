export const RATE_GROUPS = [
  { id: "HBSS",  label: "Hawkesbury SS",    default: 0.70, color: "#FCE4B0", type: "sandstone" },
  { id: "NPFM",  label: "Newport Fm",       default: 0.55, color: "#AACFE8", type: "transitional" },
  { id: "GRFM",  label: "Garie Fm",         default: 0.55, color: "#CBC4E0", type: "transitional" },
  { id: "BACS",  label: "Bald Hill CS",     default: 0.45, color: "#E8A87C", type: "claystone" },
  { id: "BGSS",  label: "Bulgo SS",         default: 0.80, color: "#FFF2CC", type: "sandstone" },
  { id: "SPCS",  label: "Stanwell Park CS", default: 0.45, color: "#D9C4A0", type: "claystone" },
  { id: "SBSS",  label: "Scarborough SS",   default: 0.70, color: "#FCE4B0", type: "sandstone" },
  { id: "WBCS",  label: "Wombarra CS",      default: 0.45, color: "#E8A87C", type: "claystone" },
  { id: "CCSS",  label: "Coalcliff SS",     default: 0.70, color: "#FCE4B0", type: "sandstone" },
  { id: "LOWER", label: "Lower Fms",        default: 0.50, color: "#B0B0B0", type: "mixed" },
];

export const LOWER_CODES = new Set(["BUSM", "LDSS", "BASM", "LRSS", "CHSM", "UNNM", "UNCL"]);

export const PRESETS = [
  { label: "Conservative", offset: -0.10 },
  { label: "Base Case",    offset:  0.00 },
  { label: "Optimistic",   offset:  0.10 },
];
