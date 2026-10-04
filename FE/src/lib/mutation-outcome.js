// A lost response or server/gateway failure cannot prove that a write rolled back.
// Validation/permission/conflict responses are definite rejections and keep retry available.
export function isUncertainMutation(error) {
  return !error?.status || error.status >= 500;
}
