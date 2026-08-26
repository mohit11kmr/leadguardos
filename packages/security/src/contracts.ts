export interface UrlSafetyResult {
  valid: boolean;
  normalized?: string;
  error?: string;
  resolvedAddresses?: string[];
}

export interface UrlSafetyPolicy {
  validateSyntax(value: string): UrlSafetyResult;
  validateResolvedHost(value: string): Promise<UrlSafetyResult>;
}

export interface RequestIdentity {
  requestId: string;
  actorId?: string;
  authSource: 'app-jwt' | 'legacy-jwt' | 'firebase' | 'api-key' | 'anonymous';
}

export interface SensitiveDataRedactor {
  redact(value: unknown): unknown;
  redactHeaders(headers: Record<string, unknown>): Record<string, unknown>;
}

export interface SignatureVerifier {
  verify(payload: string | Uint8Array, signature: string, secret: string): boolean;
}

export interface AuthorizationPolicy<TResource = unknown> {
  canRead(identity: RequestIdentity, resource: TResource): boolean;
  canWrite(identity: RequestIdentity, resource: TResource): boolean;
}
