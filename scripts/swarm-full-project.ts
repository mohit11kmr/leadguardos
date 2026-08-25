import fs from 'fs';
import path from 'path';
import { executeSwarm } from './swarm-auto-fixer';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  WHOLE PROJECT BATCH SWARM FIXER & AUDITOR
 *  Sequentially audits and fixes critical modules across the entire codebase.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Key files grouped by domain layer for zero-hallucination processing
const PROJECT_PIPELINE = [
  // 1. Core Security & Utilities
  {
    path: 'server/ssrfGuard.ts',
    goal: 'Ensure zero SSRF vulnerabilities, strict IPv4/IPv6 private block validation, and safe URL syntax parsing.'
  },
  {
    path: 'server/authMiddleware.ts',
    goal: 'Audit JWT token parsing, expiry edge cases, missing user identity handling, and role-based checks.'
  },
  {
    path: 'server/security/rateLimiter.ts',
    goal: 'Audit fail-closed behavior in production and memory-limit eviction in development.'
  },

  // 2. Storage & Repositories
  {
    path: 'server/storage.ts',
    goal: 'Ensure multi-tenant isolation, safe error handling, and robust storage interface methods.'
  },
  {
    path: 'server/repositories/auditRepository.ts',
    goal: 'Audit audit report creation, retrieval, immutable snapshot serialization, and tenant isolation.'
  },
  {
    path: 'server/repositories/orderRepository.ts',
    goal: 'Ensure ACID compliance, idempotency checks, and strict status transitions for orders.'
  },

  // 3. Queue & Background Services
  {
    path: 'server/queue/jobQueue.ts',
    goal: 'Audit lease renewal, crash recovery, backoff retries, and dead-letter queue classification.'
  },
  {
    path: 'server/services/paymentStateMachine.ts',
    goal: 'Ensure strict payment lifecycle rules (CREATED -> PENDING -> PAID -> REFUNDED) and reject illegal transitions.'
  },
  {
    path: 'server/services/ai.service.ts',
    goal: 'Audit AI prompt safety, token bounds, error retries, and schema output formatting.'
  },

  // 4. Scanner Engine & Frontend Core
  {
    path: 'server/scannerEngine.ts',
    goal: 'Audit broken link checks, phone/email/WhatsApp extraction, form validation, and SEO scoring.'
  },
  {
    path: 'src/services/lead-audit.service.ts',
    goal: 'Ensure client-safe crawling, sanitization, and structured result extraction.'
  },
  {
    path: 'src/utils/revenueModel.ts',
    goal: 'Audit revenue impact calculations and boundary value checks.'
  }
];

async function runWholeProjectSwarm() {
  console.log('\n===============================================================');
  console.log('  🌐 LEADGUARD OS — WHOLE PROJECT AUTONOMOUS SWARM FIXER');
  console.log('===============================================================');
  console.log(`Total Target Modules: ${PROJECT_PIPELINE.length}`);
  console.log('Execution Mode      : Sequential Self-Refining Multi-Agent Loop\n');

  const results: { file: string; status: 'PASSED' | 'FIXED' | 'FAILED'; error?: string }[] = [];

  for (let i = 0; i < PROJECT_PIPELINE.length; i++) {
    const item = PROJECT_PIPELINE[i];
    console.log(`\n===============================================================`);
    console.log(`[${i + 1}/${PROJECT_PIPELINE.length}] Processing: ${item.path}`);
    console.log(`🎯 Target Goal : ${item.goal}`);
    console.log('===============================================================');

    try {
      if (!fs.existsSync(path.resolve(process.cwd(), item.path))) {
        console.warn(`⚠️ Skipping missing file: ${item.path}`);
        continue;
      }

      await executeSwarm(item.path, item.goal);
      results.push({ file: item.path, status: 'PASSED' });
    } catch (err: any) {
      console.error(`❌ Error processing ${item.path}:`, err.message);
      results.push({ file: item.path, status: 'FAILED', error: err.message });
    }
  }

  console.log('\n\n===============================================================');
  console.log('  📊 WHOLE PROJECT SWARM AUDIT SUMMARY');
  console.log('===============================================================');
  results.forEach((r, idx) => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [${idx + 1}] ${r.file} → ${r.status}`);
  });
  console.log('===============================================================\n');
}

runWholeProjectSwarm().catch((err) => {
  console.error('Fatal batch swarm error:', err);
  process.exit(1);
});
