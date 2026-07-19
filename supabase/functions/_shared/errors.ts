// AIP-193-style error body (plan section 5.2), simplified to the shape the
// plan literally specifies (`details: [{reason}]`, no ErrorInfo `@type`/
// `domain`/`metadata` envelope -- this codebase has no other AIP-193
// consumer yet to match against, so there's nothing beyond the plan's own
// text to build to).

export interface AipErrorBody {
  error: {
    code: number;
    status: string;
    message: string;
    details: {reason: string}[];
  };
}

export function aipErrorResponse(
  httpStatus: number,
  status: string,
  message: string,
  reason: string,
): Response {
  const body: AipErrorBody = {
    error: {code: httpStatus, status, message, details: [{reason}]},
  };
  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: {'Content-Type': 'application/json'},
  });
}
