import React from 'react';
import {Image, Text, View} from 'react-native';

interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** Circular avatar: photo when `imageUri` is given, otherwise initials on a soft-teal background. */
export function Avatar({name, imageUri, size = 40}: AvatarProps): React.JSX.Element {
  const dimensionStyle = {width: size, height: size, borderRadius: size / 2};

  if (imageUri) {
    return <Image source={{uri: imageUri}} style={dimensionStyle} accessibilityLabel={name} />;
  }

  return (
    <View className="items-center justify-center bg-primary-soft" style={dimensionStyle}>
      <Text className="font-sans-semibold text-primary" style={{fontSize: size * 0.4}}>
        {initialsFor(name)}
      </Text>
    </View>
  );
}
