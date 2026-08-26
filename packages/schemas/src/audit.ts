import { z } from 'zod';
import { auditFindingSchema, apiResponseSchema, pillarScoreSchema } from './common';

export const auditRequestSchema = z.object({
  url: z.string().min(1).max(2048),
}).strict();

export const auditModeSchema = z.enum(['LIVE', 'DEMO']);
export const auditStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']);

export const businessImpactSchema = z.object({
  estimatedMonthlyLoss: z.number().nonnegative().optional(),
  estimatedLeadsAtRisk: z.number().nonnegative().optional(),
  criticalIssueCount: z.number().int().nonnegative(),
  measured: z.record(z.string(), z.number()).optional(),
  estimated: z.record(z.string(), z.number()).optional(),
  derived: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
}).strict();

export const auditResponseSchema = z.object({
  contractVersion: z.literal('v6.audit.v1'),
  scanId: z.string().min(1),
  domain: z.string().min(1),
  targetUrl: z.string().url(),
  status: auditStatusSchema,
  mode: auditModeSchema,
  scannerVersion: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  pillarScores: z.object({
    lead: pillarScoreSchema,
    ad: pillarScoreSchema,
    seo: pillarScoreSchema,
    cyber: pillarScoreSchema,
  }).strict(),
  findings: z.array(auditFindingSchema),
  businessImpact: businessImpactSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
}).strict();

export const auditResponseEnvelopeSchema = apiResponseSchema(auditResponseSchema);
export const auditFindingResponseSchema = apiResponseSchema(z.array(auditFindingSchema));
