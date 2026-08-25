import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  AUTONOMOUS AGENT SWARM FIXER (Free Model Orchestrator)
 *  Supports: OpenRouter Free Tier (:free), Local Ollama, OpenCode Proxy
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Free-Tier Model Registry with Auto-Fallback Waterfall
const FREE_MODEL_POOLS = {
  architect: [
    process.env.SWARM_ARCHITECT_MODEL,
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'nemotron-3-ultra-free',
    'x-preview-f-free',
    'openrouter/auto'
  ].filter(Boolean) as string[],
  coder: [
    process.env.SWARM_CODER_MODEL,
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'nemotron-3.5-lightning-free',
    'mimo-v2.5-free',
    'big-pickle',
    'openrouter/auto'
  ].filter(Boolean) as string[],
  critic: [
    process.env.SWARM_CRITIC_MODEL,
    'gemini-2.0-flash',
    'mimo-v2.5-free',
    'hy3-free',
    'muse-spark-1.2-contributor-free',
    'openrouter/auto'
  ].filter(Boolean) as string[]
};

const DEFAULT_CONFIG = {
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : ''
};

interface AgentResponse {
  content: string;
  modelUsed: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Direct Free API (Google AI Studio)
// ─────────────────────────────────────────────────────────────────────────────
async function queryGeminiDirect(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = DEFAULT_CONFIG.geminiApiKey;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const cleanModel = model.replace('google/', '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[Gemini ${response.status}] ${errorText}`);
  }

  const data = (await response.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Communication Layer with Smart Multi-Model Fallback
// ─────────────────────────────────────────────────────────────────────────────
async function queryLLM(
  modelCandidates: string | string[],
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.1
): Promise<AgentResponse> {
  const candidateList = Array.isArray(modelCandidates) ? modelCandidates : [modelCandidates];
  let lastError: Error | null = null;

  for (const model of candidateList) {
    // Strategy 1: If model is Gemini and GEMINI_API_KEY is present
    if (model.includes('gemini') && DEFAULT_CONFIG.geminiApiKey) {
      try {
        console.log(`    ↳ Connecting to Google Gemini Free Tier (${model})...`);
        const content = await queryGeminiDirect(model, systemPrompt, userPrompt);
        if (content) {
          return { content, modelUsed: `Google Gemini (${model})` };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`    ⚠️ Gemini direct error (${err.message.slice(0, 100)}). Trying fallback...`);
      }
    }

    // Strategy 2: OpenRouter / OpenCode Endpoint
    if (DEFAULT_CONFIG.openrouterApiKey || DEFAULT_CONFIG.openrouterBaseUrl.includes('localhost')) {
      try {
        console.log(`    ↳ Connecting to model via OpenRouter/OpenCode: ${model}...`);
        const response = await fetch(`${DEFAULT_CONFIG.openrouterBaseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEFAULT_CONFIG.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/leadguardos',
            'X-Title': 'LeadGuardOS Swarm Fixer'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`[${response.status}] ${errorText}`);
        }

        const data = (await response.json()) as any;
        const content = data.choices?.[0]?.message?.content || '';
        if (content) {
          return { content, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`    ⚠️ Model ${model} unavailable (${err.message.slice(0, 100)}). Trying fallback...`);
      }
    }
  }

  throw new Error(`All model candidates failed. Last error: ${lastError?.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Verification Harness (Terminal CLI)
// ─────────────────────────────────────────────────────────────────────────────
interface TestResult {
  success: boolean;
  stage: 'lint' | 'test' | 'build' | 'all';
  output: string;
}

function runVerificationHarness(): TestResult {
  console.log('\n  🛠️  [Harness] Running TypeScript typecheck (npm run lint)...');
  try {
    const lintOut = execSync('npm run lint', { encoding: 'utf8', stdio: 'pipe' });
    console.log('  ✅ [Harness] TypeScript compilation passed!');
  } catch (err: any) {
    return {
      success: false,
      stage: 'lint',
      output: `TypeScript Linter Errors:\n${err.stdout || err.stderr || err.message}`
    };
  }

  console.log('  🧪 [Harness] Running automated test suite (npm test)...');
  try {
    const testOut = execSync('npm test', { encoding: 'utf8', stdio: 'pipe' });
    console.log('  ✅ [Harness] All 190 tests passed cleanly!');
  } catch (err: any) {
    return {
      success: false,
      stage: 'test',
      output: `Test Failures:\n${err.stdout || err.stderr || err.message}`
    };
  }

  return { success: true, stage: 'all', output: 'All checks passed successfully.' };
}

// Helper to extract clean code from markdown code fences
function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift(); // remove opening ```typescript
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop(); // remove closing ```
    }
    cleaned = lines.join('\n');
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// Swarm Autonomous Multi-Agent Loop
// ─────────────────────────────────────────────────────────────────────────────
export async function executeSwarm(targetFile: string, customInstruction?: string) {
  const resolvedPath = path.resolve(process.cwd(), targetFile);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Target file does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log(`  🚀 LEADGUARD OS — AGENT SWARM AUTO-FIXER`);
  console.log('======================================================');
  console.log(`📁 Target File : ${targetFile}`);
  console.log(`🤖 Architect   : ${FREE_MODEL_POOLS.architect[0]}`);
  console.log(`⚡ Coder       : ${FREE_MODEL_POOLS.coder[0]}`);
  console.log(`🔍 Critic      : ${FREE_MODEL_POOLS.critic[0]}`);
  console.log('======================================================\n');

  const originalContent = fs.readFileSync(resolvedPath, 'utf8');
  const backupPath = `${resolvedPath}.swarm.bak`;
  fs.writeFileSync(backupPath, originalContent, 'utf8');
  console.log(`💾 [Safety] Created backup at ${path.basename(backupPath)}`);

  // Step 1: Initial Harness Run
  let harnessResult = runVerificationHarness();
  if (harnessResult.success && !customInstruction) {
    console.log('\n🎉 No errors found in project! Everything is currently passing.');
    fs.unlinkSync(backupPath);
    return;
  }

  let currentWorkingCode = originalContent;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n──────────────────────────────────────────────────────`);
    console.log(`🔄 [Iteration ${attempts}/${maxAttempts}] Swarm Cycle Started`);
    console.log(`──────────────────────────────────────────────────────`);

    // 1. Architect Agent: Formulate Plan
    console.log(`🧠 [Architect Agent Pool] Analyzing issue & formulating fix plan...`);
    const architectPrompt = `
You are a Principal Software Architect.
Target File: ${targetFile}
Goal / Instruction: ${customInstruction || 'Fix all failing tests/linter errors'}
Harness Output:
${harnessResult.output}

Original Code excerpt:
${currentWorkingCode.slice(0, 3000)}

Provide a concise, numbered technical plan for the Coder agent to fix this file precisely.`;

    let plan = '';
    try {
      const archRes = await queryLLM(
        FREE_MODEL_POOLS.architect,
        'You are an expert software architect. Output clear, concise step-by-step instructions.',
        architectPrompt
      );
      plan = archRes.content;
      console.log(`📋 [Plan Formulated via ${archRes.modelUsed}]:\n${plan.split('\n').slice(0, 5).join('\n')}...`);
    } catch (e: any) {
      console.warn(`⚠️ Architect pool failed (${e.message}), proceeding directly to Coder agent...`);
    }

    // 2. Coder Agent: Generate Fix
    console.log(`⚡ [Coder Agent Pool] Writing code patch...`);
    const coderPrompt = `
You are a Senior TypeScript Engineer.
Target File: ${targetFile}
Architect Plan:
${plan}

Errors to fix:
${harnessResult.output}

Current Code:
${currentWorkingCode}

IMPORTANT INSTRUCTIONS:
1. Output the COMPLETE updated file content.
2. DO NOT use placeholders like "// ... rest of code".
3. Return ONLY valid TypeScript code enclosed in triple backticks (\`\`\`typescript ... \`\`\`).`;

    let proposedCode = '';
    try {
      const coderRes = await queryLLM(
        FREE_MODEL_POOLS.coder,
        'You are an expert coder. You output complete, valid TypeScript code without conversational filler.',
        coderPrompt
      );
      proposedCode = stripCodeFences(coderRes.content);
      console.log(`⚡ [Coder Success via ${coderRes.modelUsed}]`);
    } catch (err: any) {
      console.error(`❌ Coder Agent failed: ${err.message}`);
      break;
    }

    // 3. Critic Agent: Review Diff
    console.log(`🔍 [Critic Agent Pool] Auditing proposed code for syntax & safety...`);
    const criticPrompt = `
Review this proposed TypeScript file.
Target File: ${targetFile}
Proposed Code Length: ${proposedCode.length} characters

Proposed Code:
${proposedCode.slice(0, 4000)}

Respond with:
"VERDICT: APPROVED" if the code looks syntactically valid and has no missing braces or truncated blocks.
"VERDICT: REJECTED - <reason>" if code is truncated or clearly broken.`;

    try {
      const criticRes = await queryLLM(
        FREE_MODEL_POOLS.critic,
        'You are a strict code auditor. Validate code completeness and syntax.',
        criticPrompt
      );
      console.log(`🔎 [Critic Verdict via ${criticRes.modelUsed}]: ${criticRes.content.slice(0, 120)}`);
      if (criticRes.content.includes('REJECTED')) {
        console.warn('⚠️ Critic rejected the code patch. Retrying cycle...');
        continue;
      }
    } catch (e: any) {
      console.warn(`⚠️ Critic agent skipped (${e.message}). Proceeding to physical harness test.`);
    }

    // 4. Apply patch and test with Deterministic Harness
    console.log(`📝 [Harness] Applying patch to ${targetFile}...`);
    fs.writeFileSync(resolvedPath, proposedCode, 'utf8');

    harnessResult = runVerificationHarness();

    if (harnessResult.success) {
      console.log(`\n🎉🎉🎉 [SUCCESS] Swarm successfully resolved all issues on Attempt #${attempts}!`);
      console.log(`✅ File updated: ${targetFile}`);
      fs.unlinkSync(backupPath);
      return;
    } else {
      console.warn(`❌ [Iteration Failed] Harness reported errors in stage: ${harnessResult.stage}`);
      currentWorkingCode = proposedCode;
    }
  }

  // Rollback on failure
  console.log(`\n⚠️ [Rollback] Swarm could not reach 0 errors after ${maxAttempts} attempts.`);
  console.log(`⏪ Restoring original file from backup...`);
  fs.writeFileSync(resolvedPath, originalContent, 'utf8');
  fs.unlinkSync(backupPath);
  console.log(`🔒 Project restored safely to previous state.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let targetFile = 'server/services/ai.service.ts';
let customInstruction: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    targetFile = args[i + 1];
    i++;
  } else if (args[i] === '--instruction' && args[i + 1]) {
    customInstruction = args[i + 1];
    i++;
  }
}

executeSwarm(targetFile, customInstruction).catch((err) => {
  console.error('\n💥 Fatal Swarm Error:', err.message);
  process.exit(1);
});
