/** Groups an 8-digit invite code as "1234 5678" for readability. */
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/** Share-sheet message body for an invite code (no deep link -- plan section on invites). */
export function shareMessage(code: string): string {
  return `Join our household on Equilibrium! Open the app, tap "Join a household", and enter this code: ${code}`;
}
