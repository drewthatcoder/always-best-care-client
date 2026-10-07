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
  return (
    <Image
      source={LOGO}
      accessibilityLabel="Always Best Care Senior Services"
      resizeMode="contain"
      style={[{ width, aspectRatio: LOGO_ASPECT }, style]}
    />
  );
}
