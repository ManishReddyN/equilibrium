import React from 'react';
import {Pressable, Text, type PressableProps} from 'react-native';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  className?: string;
}

const variantClassNames: Record<ButtonVariant, {container: string; label: string}> = {
  primary: {container: 'bg-primary', label: 'text-white'},
  secondary: {container: 'bg-primary-soft', label: 'text-primary'},
};

/** Primary (filled teal) / secondary (soft teal) button. Disabled state dims to 50% opacity. */
export function Button({
  label,
  variant = 'primary',
  disabled,
  className,
  ...rest
}: ButtonProps): React.JSX.Element {
  const variantClasses = variantClassNames[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: Boolean(disabled)}}
      disabled={disabled}
      className={`items-center justify-center rounded-card px-6 py-3 ${variantClasses.container} ${
        disabled ? 'opacity-50' : ''
      } ${className ?? ''}`}
      {...rest}>
      <Text className={`font-sans-semibold text-base ${variantClasses.label}`}>{label}</Text>
    </Pressable>
  );
}
