import React, {useState} from 'react';
import {Text, TextInput, View} from 'react-native';

import {Screen} from '@shared/components/Screen';
import {Card} from '@shared/components/Card';
import {Button} from '@shared/components/Button';

import {requestOtp, verifyOtp} from '../services/auth';

type Step = 'email' | 'code';

/**
 * Minimal, functional email + OTP sign-in (see features/auth/services/auth.ts
 * for why this exists and why OTP over magic-link/anonymous auth). Session
 * change itself is observed by `SessionProvider`; this screen only needs to
 * kick off `requestOtp`/`verifyOtp` and surface errors -- once `verifyOtp`
 * succeeds, `RootNavigator`'s AuthGate re-renders past this screen on its own.
 */
export function SignInScreen(): React.JSX.Element {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function handleSendCode(): Promise<void> {
    setErrorMessage(undefined);
    setIsSubmitting(true);
    try {
      await requestOtp(email.trim());
      setStep('code');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(): Promise<void> {
    setErrorMessage(undefined);
    setIsSubmitting(true);
    try {
      await verifyOtp(email.trim(), code.trim());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not verify code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <View className="items-center gap-1">
          <Text className="font-sans-bold text-2xl text-ink">Equilibrium</Text>
          <Text className="font-sans text-sm text-ink-muted">Sign in to your household</Text>
        </View>

        <Card className="w-full gap-4">
          {step === 'email' ? (
            <>
              <View className="gap-2">
                <Text className="font-sans-medium text-sm text-ink">Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
                />
              </View>
              <Button
                label={isSubmitting ? 'Sending...' : 'Send code'}
                onPress={() => {
                  void handleSendCode();
                }}
                disabled={isSubmitting || email.trim().length === 0}
              />
            </>
          ) : (
            <>
              <View className="gap-2">
                <Text className="font-sans-medium text-sm text-ink">6-digit code</Text>
                <Text className="font-sans text-xs text-ink-muted">Sent to {email.trim()}</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  placeholder="123456"
                  placeholderTextColor="#64748B"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                  className="rounded-control border border-border px-4 py-3 font-sans text-base text-ink"
                />
              </View>
              <Button
                label={isSubmitting ? 'Verifying...' : 'Verify'}
                onPress={() => {
                  void handleVerify();
                }}
                disabled={isSubmitting || code.trim().length === 0}
              />
              <Button
                label="Use a different email"
                variant="secondary"
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setErrorMessage(undefined);
                }}
                disabled={isSubmitting}
              />
            </>
          )}
          {errorMessage ? (
            <Text className="font-sans text-sm text-warn">{errorMessage}</Text>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
