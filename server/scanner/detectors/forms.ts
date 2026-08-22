import { StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export interface FormAnalysisResult {
  formsFoundCount: number;
  hasContactForm: boolean;
  forms: Array<{
    action?: string;
    method?: string;
    hasPhoneInput: boolean;
    hasEmailInput: boolean;
    hasSubmitButton: boolean;
    isHttpsAction: boolean;
  }>;
  findings: StandardFinding[];
}

export class FormsDetector {
  public static analyzeForms(html: string, pageUrl: string): FormAnalysisResult {
    const findings: StandardFinding[] = [];
    const forms: Array<{
      action?: string;
      method?: string;
      hasPhoneInput: boolean;
      hasEmailInput: boolean;
      hasSubmitButton: boolean;
      isHttpsAction: boolean;
    }> = [];

    const formRegex = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;
    let match: RegExpExecArray | null;

    while ((match = formRegex.exec(html)) !== null) {
      const formTag = match[0];
      const formContent = match[1];

      const actionMatch = /action=["']([^"']*)["']/i.exec(formTag);
      const methodMatch = /method=["']([^"']*)["']/i.exec(formTag);

      const action = actionMatch ? actionMatch[1] : undefined;
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

      const hasPhoneInput = /type=["'](tel|number)["']/i.test(formContent) || /name=["'][^"']*(phone|mobile|whatsapp|contact)[^"']*["']/i.test(formContent);
      const hasEmailInput = /type=["']email["']/i.test(formContent) || /name=["'][^"']*email[^"']*["']/i.test(formContent);
      const hasSubmitButton = /type=["']submit["']/i.test(formContent) || /<button/i.test(formContent);
      const isHttpsAction = !action || action.startsWith('https://') || action.startsWith('/');

      forms.push({
        action,
        method,
        hasPhoneInput,
        hasEmailInput,
        hasSubmitButton,
        isHttpsAction,
      });

      if (!isHttpsAction && action && action.startsWith('http://')) {
        findings.push(
          FindingBuilder.createFinding({
            id: `form_insecure_action_${forms.length}`,
            category: 'forms',
            title: 'Insecure Plaintext Form Action (http://)',
            severity: 'HIGH',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `Form action points to unencrypted HTTP URL '${action}'.`,
            inferred: 'Submitted customer phone numbers and lead data are transmitted in cleartext.',
            evidence: action,
            impact: 'Privacy violation risk and browser security warnings.',
            recommendation: 'Ensure form action submits to HTTPS endpoint.',
          })
        );
      }
    }

    return {
      formsFoundCount: forms.length,
      hasContactForm: forms.length > 0,
      forms,
      findings,
    };
  }
}
