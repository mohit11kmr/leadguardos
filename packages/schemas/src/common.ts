import { z } from 'zod';

export const actorRoleSchema = z.enum(['USER', 'AGENCY', 'ADMIN']);
export const authSourceSchema = z.enum(['app-jwt', 'legacy-jwt', 'firebase', 'api-key', 'anonymous']);
export const actorContextSchema = z.object({
  actorId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: actorRoleSchema.optional(),
  organizationId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  authSource: authSourceSchema,
  requestId: z.string().min(1).optional(),
}).strict();

export const successResponseSchema = <T extends z.ZodType>(data: T) => z.object({
  success: z.literal(true),
  data,
  meta: z.object({
    requestId: z.string().min(1).optional(),
  }).passthrough().optional(),
}).strict();

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
    details: z.union([
      z.record(z.string(), z.unknown()),
      z.array(z.unknown()),
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
    ]).optional(),
  }).strict(),
}).strict();

export const apiResponseSchema = <T extends z.ZodType>(data: T) => z.union([
  successResponseSchema(data),
  errorResponseSchema,
]);

export const findingSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export const findingCategorySchema = z.enum(['whatsapp', 'phone', 'pixel', 'ga4', 'seo', 'cyber', 'performance', 'forms', 'reviews', 'email', 'ecommerce']);
export const pillarNameSchema = z.enum(['lead', 'ad', 'seo', 'cyber']);
export const pillarScoreSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.string().optional(),
  findingsCount: z.number().int().nonnegative().optional(),
  weight: z.number().min(0).max(1).optional(),
}).strict();

export const auditFindingSchema = z.object({
  id: z.string().min(1),
  pillar: z.enum(['LEAD', 'AD', 'SEO', 'CYBER', 'ECOMMERCE']),
  category: findingCategorySchema,
  severity: findingSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().min(1),
  evidence: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  affectedUrls: z.array(z.string().url()).optional(),
  recommendation: z.string().optional(),
  ruleId: z.string().optional(),
  confidence: z.union([z.number(), z.string()]).optional(),
  detectedBy: z.string().optional(),
  isLocked: z.boolean().optional(),
  fixSnippet: z.string().optional(),
}).strict();
