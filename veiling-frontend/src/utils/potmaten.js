export const POTMATEN = [
  { code: "P7", lxbxh: "7x7x8", diameterCm: null, volumeL: 0.4 },
  { code: "P9", lxbxh: "9x9x10", diameterCm: null, volumeL: 0.7 },
  { code: "P10,5 / C1", lxbxh: null, diameterCm: 11, volumeL: 1.0 },
  { code: "P13 / C1,2", lxbxh: null, diameterCm: 13, volumeL: 1.3 },
  { code: "P14 / C1,5", lxbxh: null, diameterCm: 14, volumeL: 1.5 },
  { code: "P15 / C2", lxbxh: null, diameterCm: 17, volumeL: 2.0 },
  { code: "P17 / C3", lxbxh: null, diameterCm: 19, volumeL: 3.0 },
  { code: "P19 / C4", lxbxh: null, diameterCm: 21, volumeL: 4.0 },
  { code: "C5", lxbxh: null, diameterCm: 22, volumeL: 5.0 },
  { code: "C7,5", lxbxh: null, diameterCm: 26, volumeL: 7.5 },
  { code: "C10", lxbxh: null, diameterCm: 28, volumeL: null },
];

export function getPotmaat(code) {
  if (!code) return null;
  return POTMATEN.find((p) => p.code === code) ?? null;
}

