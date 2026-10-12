import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const LOGO = require('../assets/logo-full.png');

/** Width / height of assets/logo-full.png (see scripts/generate-brand-assets.mjs). */
export const LOGO_ASPECT = 1200 / 1015;

type Props = {
  width?: number;
  style?: StyleProp<ImageStyle>;
};

export default function BrandLogo({ width = 220, style }: Props) {
  // Image ignores aspectRatio unless height is set too, and then falls back to
  // the PNG's intrinsic size (1200×1015), which overflows a phone header.
  const height = width / LOGO_ASPECT;
  return (
    <Image
      source={LOGO}
      accessibilityLabel="Always Best Care Senior Services"
      resizeMode="contain"
      style={[{ width, height, maxWidth: '80%' }, style]}
    />
  );
}
