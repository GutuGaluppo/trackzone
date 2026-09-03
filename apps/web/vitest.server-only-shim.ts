// `server-only` throws on import outside a React Server Component, which breaks
// unit tests of server modules. Vitest aliases the package to this no-op.
export {};
