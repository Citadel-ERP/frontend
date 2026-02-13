// citadel_hub/utils/avatarColors.ts

export const AVATAR_COLOR_PAIRS = [
  { light: '#FFCDD2b0', dark: '#C62828' }, // Red
  { light: '#F8BBD0b0', dark: '#AD1457' }, // Pink
  { light: '#E1BEE7b0', dark: '#6A1B9A' }, // Purple
  { light: '#D1C4E9b0', dark: '#4527A0' }, // Deep Purple
  { light: '#C5CAE9b0', dark: '#283593' }, // Indigo
  { light: '#bbdefbb0', dark: '#1565C0' }, // Blue
  { light: '#b3e5fcb0', dark: '#0277BD' }, // Light Blue
  { light: '#B2EBF2b0', dark: '#00838F' }, // Cyan
  { light: '#B2DFDBb0', dark: '#00695C' }, // Teal
  { light: '#C8E6C9b0', dark: '#2E7D32' }, // Green
  { light: '#DCEDC8b0', dark: '#558B2F' }, // Light Green
  { light: '#FFF9C4b0', dark: '#F9A825' }, // Yellow
  { light: '#FFE0B2b0', dark: '#EF6C00' }, // Orange
  { light: '#FFCCBCb0', dark: '#D84315' }, // Deep Orange
  { light: '#D7CCC8b0', dark: '#4E342E' }, // Brown
  { light: '#FFE5E5b0', dark: '#D32F2F' }, // Bright Red
  { light: '#FFD6E8b0', dark: '#C2185B' }, // Hot Pink
  { light: '#E8D5F2b0', dark: '#7B1FA2' }, // Vibrant Purple
  { light: '#d4e3fcb0', dark: '#1976D2' }, // Sky Blue
  { light: '#C7F0DBb0', dark: '#00796B' }, // Mint
  { light: '#FFF4C4b0', dark: '#F57F17' }, // Amber
  { light: '#FFE8CCb0', dark: '#E65100' }, // Peach
  { light: '#FFDFE0b0', dark: '#E91E63' }, // Rose
  { light: '#E0F2F7b0', dark: '#0097A7' }, // Turquoise
  { light: '#F3E5F5b0', dark: '#8E24AA' }, // Lavender
  { light: '#E8F5E9b0', dark: '#388E3C' }, // Emerald
  { light: '#FFF3E0b0', dark: '#F57C00' }, // Tangerine
  { light: '#FCE4ECb0', dark: '#D81B60' }, // Magenta
  { light: '#E1F5FEb0', dark: '#0288D1' }, // Electric Blue
  { light: '#F1F8E9b0', dark: '#689F38' }, // Lime
  { light: '#FFF8E1b0', dark: '#FBC02D' }, // Gold
];

export const getAvatarColor = (id: string | number): { light: string; dark: string } => {
  const stringId = String(id);
  let hash = 0;

  for (let i = 0; i < stringId.length; i++) {
    hash = stringId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const index = Math.abs(hash) % AVATAR_COLOR_PAIRS.length;
  return AVATAR_COLOR_PAIRS[index];
};
