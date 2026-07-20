import React, {useState} from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';
import {colors} from '@theme/tokens';

import {signInWithPassword, signUpWithPassword} from '../services/auth';

type Mode = 'signin' | 'signup';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Email + password sign-in/sign-up (see features/auth/services/auth.ts for
 * why this replaced the OTP flow). Session change itself is observed by
 * `SessionProvider`; this screen only needs to kick off `signInWithPassword`/
 * `signUpWithPassword` and surface errors -- once either succeeds,
 * `RootNavigator`'s AuthGate re-renders past this screen on its own, except
 * for the one case `signUpWithPassword` can't establish a session on its own
 * (email confirmation required by the project) -- handled here directly
 * rather than assuming that never happens (docs/RUNBOOK.md).
 */
export function SignInScreen(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isSignUp = mode === 'signup';
  const canSubmit =
    email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && (!isSignUp || fullName.trim().length > 0);

  async function handleSubmit(): Promise<void> {
    setErrorMessage(undefined);
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUpWithPassword(email.trim(), password, fullName.trim());
        if (!result.hasSession) {
          setConfirmationSent(true);
        }
      } else {
        await signInWithPassword(email.trim(), password);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleMode(): void {
    setMode(current => (current === 'signin' ? 'signup' : 'signin'));
    setErrorMessage(undefined);
  }

  if (confirmationSent) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center font-sans-bold text-xl text-ink">Check your email</Text>
          <Text className="text-center font-sans text-sm text-ink-muted">
            We sent a confirmation link to {email.trim()}. Follow it, then come back and sign in.
          </Text>
          <Button
            label="Back to sign in"
            onPress={() => {
              setConfirmationSent(false);
              setMode('signin');
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <View className="items-center gap-1">
          <Text className="font-sans-bold text-2xl text-ink">Equilibrium</Text>
          <Text className="font-sans text-sm text-ink-muted">
            {isSignUp ? 'Create your account' : 'Sign in to your household'}
          </Text>
        </View>

        <Card className="w-full gap-4">
          {isSignUp ? (
            <View className="gap-2">
              <Text className="font-sans-medium text-sm text-ink">Full name</Text>
              <TextInput
                autoCapitalize="words"
                placeholder="Jamie Rivera"
                placeholderTextColor={colors.inkMuted}
                value={fullName}
                onChangeText={setFullName}
                className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
              />
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="font-sans-medium text-sm text-ink">Email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.inkMuted}
              value={email}
              onChangeText={setEmail}
              className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
            />
          </View>

          <View className="gap-2">
            <Text className="font-sans-medium text-sm text-ink">Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignUp ? 'new-password' : 'password'}
              secureTextEntry
              placeholder={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Your password'}
              placeholderTextColor={colors.inkMuted}
              value={password}
              onChangeText={setPassword}
              className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
            />
          </View>

          <Button
            label={isSubmitting ? (isSignUp ? 'Creating account...' : 'Signing in...') : isSignUp ? 'Create account' : 'Sign in'}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting || !canSubmit}
          />

          {errorMessage ? <Text className="font-sans text-sm text-warn">{errorMessage}</Text> : null}

          <Pressable onPress={toggleMode} disabled={isSubmitting} accessibilityRole="button" hitSlop={8}>
            <Text className="text-center font-sans text-sm text-primary">
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </Text>
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}
