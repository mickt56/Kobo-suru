// Representative headframe outlines for the Section tab, in metres from the shaft centreline (x,
// positive towards the winder house) and the collar (y, up). Traced from the headframe long
// elevations (VS7 and VS8): sheave centres 34.35 m above the collar, annex 13.17 m. Simplified for
// a schematic, not for dimensioning.
export const HEADFRAMES = {
  VS7: {
    tower: { half: 5.0, top: 36.3, ridge: 39.0, levels: [6.5, 13.2, 19.5, 25.5, 31.0] },
    sheaveY: 34.35,
    sheaves: [-0.9, 1.2],
    annex: { from: -18.5, eaves: 13.2, roofAtTower: 21.0 },
    backstay: { topY: 33.0, footX: 27.5 },
    house: { from: 30.0, to: 62.0, eaves: 9.0, ridge: 12.0 },
    drums: [{ x: 37.0, r: 1.8 }, { x: 43.5, r: 1.8 }, { x: 51.0, r: 2.4 }],
    control: { from: 56.5, to: 61.0, h: 6.0 },
  },
  VS8: {
    tower: { half: 5.2, top: 36.0, ridge: 38.5, levels: [6.5, 13.2, 19.5, 25.5, 31.0] },
    sheaveY: 34.35,
    sheaves: [-0.8, 1.2],
    annex: { from: -14.0, eaves: 13.2, roofAtTower: 19.0 },
    backstay: { topY: 32.5, footX: 26.7 },
    house: { from: 29.0, to: 61.0, eaves: 9.0, ridge: 12.0 },
    drums: [{ x: 38.0, r: 1.8 }, { x: 47.0, r: 2.5 }],
    control: { from: 55.0, to: 59.5, h: 6.0 },
  },
};
