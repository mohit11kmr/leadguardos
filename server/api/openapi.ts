export function generateOpenApiSpec(): Record<string, any> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'LeadGuard OS Public Diagnostic API',
      version: '1.0.0',
      description: 'REST API for automated website conversion audits, 24/7 Watchdog targets, findings, and immutable reports.',
    },
    servers: [
      { url: '/api/v1', description: 'Production API v1' }
    ],
    security: [
      { ApiKeyAuth: [] }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Hashed API key starting with lg_live_...',
        }
      },
      schemas: {
        ScanResult: {
          type: 'object',
          properties: {
            scanId: { type: 'string' },
            targetUrl: { type: 'string' },
            domain: { type: 'string' },
            score: { type: 'integer' },
            estimatedMonthlyLoss: { type: 'integer' },
            scannedAt: { type: 'string' },
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    paths: {
      '/scans': {
        post: {
          summary: 'Create and run a live website diagnostic audit',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', example: 'https://drsharmadental.in' }
                  },
                  required: ['url']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Scan completed successfully' },
            '401': { description: 'Invalid API key' },
            '403': { description: 'Monthly scan limit reached' }
          }
        },
        get: {
          summary: 'List scans for authenticated account',
          responses: {
            '200': { description: 'Scans retrieved' }
          }
        }
      },
      '/scans/{id}': {
        get: {
          summary: 'Get details of a specific scan',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Scan details' },
            '404': { description: 'Scan not found' }
          }
        }
      },
      '/watchdog': {
        post: {
          summary: 'Create a 24/7 Watchdog target for domain',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    contact: { type: 'string' },
                    channel: { type: 'string', enum: ['TELEGRAM', 'WHATSAPP', 'EMAIL'] }
                  },
                  required: ['url']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Watchdog target created' }
          }
        }
      }
    }
  };
}
