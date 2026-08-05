import {describe, expect, it} from '@jest/globals';

import {formatInviteCode, shareMessage} from './inviteCode';

describe('formatInviteCode', () => {
  it('groups an 8-digit code into two groups of four', () => {
    expect(formatInviteCode('12345678')).toBe('1234 5678');
  });

  it('leaves non-8-digit input unchanged', () => {
    expect(formatInviteCode('123')).toBe('123');
  });
});

describe('shareMessage', () => {
  it('embeds the code in a friendly message with no link', () => {
    const message = shareMessage('12345678');
    expect(message).toContain('12345678');
    expect(message).not.toMatch(/https?:\/\/|equilibrium:\/\//);
  });
});
