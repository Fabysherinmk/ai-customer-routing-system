import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const PORT = process.env.PORT || 5000;

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Customer Request Routing System (CRRS) API',
      version: '1.0.0',
      description: 'API Documentation for the AI-Powered Customer Request Routing System.',
      contact: {
        name: 'CRRS Support',
        email: 'support@crrs.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'AGENT'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Request: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customerName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            channel: { type: 'string', enum: ['email', 'whatsapp', 'webform', 'chat'] },
            message: { type: 'string' },
            status: { type: 'string', enum: ['NEW', 'QUEUED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Classification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            requestId: { type: 'string', format: 'uuid' },
            provider: { type: 'string' },
            category: { type: 'string', enum: ['Billing', 'Technical Support', 'Sales', 'General Inquiry'] },
            priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            summary: { type: 'string' },
            confidence: { type: 'number' },
            reason: { type: 'string' },
            errorState: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Note: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            requestId: { type: 'string', format: 'uuid' },
            note: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            author: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
              },
            },
          },
        },
        RequestEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            requestId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string' },
            oldStatus: { type: 'string', nullable: true },
            newStatus: { type: 'string', nullable: true },
            metadata: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            actor: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
              },
              nullable: true,
            },
          },
        },
      },
    },
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'Admin/Agent login',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'admin@crrs.com' },
                    password: { type: 'string', example: 'admin123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Successful authentication',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      token: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            401: { description: 'Invalid email or password' },
          },
        },
      },
      '/api/requests': {
        post: {
          summary: 'Submit a new customer request (Public)',
          tags: ['Requests'],
          parameters: [
            {
              in: 'header',
              name: 'X-Idempotency-Key',
              schema: { type: 'string' },
              description: 'Optional unique key to prevent duplicate request processing',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['customerName', 'email', 'channel', 'message'],
                  properties: {
                    customerName: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', format: 'email', example: 'john@example.com' },
                    channel: { type: 'string', enum: ['email', 'whatsapp', 'webform', 'chat'], example: 'email' },
                    message: { type: 'string', example: 'My payment failed and money was deducted from my account.' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Request created and queued for AI classification',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Request' } } },
            },
            400: { description: 'Missing/invalid request body fields' },
            409: { description: 'Conflict: Duplicate request detected' },
          },
        },
        get: {
          summary: 'List support requests with search and filters (Protected)',
          tags: ['Requests'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string' }, description: 'Filter by request status' },
            { in: 'query', name: 'priority', schema: { type: 'string' }, description: 'Filter by classification priority' },
            { in: 'query', name: 'category', schema: { type: 'string' }, description: 'Filter by classification category' },
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search term for name, email, or message content' },
            { in: 'query', name: 'sortBy', schema: { type: 'string', default: 'createdAt' }, description: 'Field to sort by' },
            { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }, description: 'Sort direction' },
          ],
          responses: {
            200: {
              description: 'Successful fetch',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      requests: { type: 'array', items: { $ref: '#/components/schemas/Request' } },
                      metrics: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          new: { type: 'integer' },
                          inProgress: { type: 'integer' },
                          resolved: { type: 'integer' },
                          queued: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized JWT token' },
          },
        },
      },
      '/api/requests/{id}': {
        get: {
          summary: 'Get details of a request, including classifications, events timeline, and notes (Protected)',
          tags: ['Requests'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'The request database ID' },
          ],
          responses: {
            200: {
              description: 'Detailed request payload returned',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Request' },
                      {
                        type: 'object',
                        properties: {
                          classification: { $ref: '#/components/schemas/Classification' },
                          notes: { type: 'array', items: { $ref: '#/components/schemas/Note' } },
                          events: { type: 'array', items: { $ref: '#/components/schemas/RequestEvent' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: 'Unauthorized JWT token' },
            404: { description: 'Request not found' },
          },
        },
      },
      '/api/requests/{id}/status': {
        patch: {
          summary: 'Update request status (Protected)',
          tags: ['Requests'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Request ID' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['NEW', 'QUEUED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], example: 'IN_PROGRESS' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Status successfully updated and event logged',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Request' } } },
            },
            400: { description: 'Missing/invalid status parameter' },
            401: { description: 'Unauthorized JWT token' },
            404: { description: 'Request not found' },
          },
        },
      },
      '/api/requests/{id}/notes': {
        post: {
          summary: 'Add an internal note to the request (Protected)',
          tags: ['Requests'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Request ID' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['note'],
                  properties: {
                    note: { type: 'string', example: 'Contacted customer via email. Waiting for credentials.' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Note successfully added',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Note' } } },
            },
            400: { description: 'Empty note body' },
            401: { description: 'Unauthorized JWT token' },
            404: { description: 'Request not found' },
          },
        },
      },
      '/api/webhooks/inbound': {
        post: {
          summary: 'Simulated inbound message webhook from messaging channels (Public)',
          tags: ['Integrations'],
          parameters: [
            {
              in: 'header',
              name: 'X-Hub-Signature-256',
              schema: { type: 'string' },
              description: 'SHA256 signature calculated with shared channel secret',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['from', 'channel', 'body'],
                  properties: {
                    from: { type: 'string', example: '+1234567890' },
                    channel: { type: 'string', enum: ['whatsapp', 'email'], example: 'whatsapp' },
                    body: { type: 'string', example: 'Urgent: The main production server goes down occasionally!' },
                    contactName: { type: 'string', example: 'Sarah Connor' },
                  },
                },
              },
            },
          },
          responses: {
            202: {
              description: 'Webhook payload accepted and queued for worker',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      requestId: { type: 'string', format: 'uuid' },
                      verified: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            400: { description: 'Missing required webhook payload fields' },
          },
        },
      },
      '/api/requests/{id}/assign': {
        patch: {
          summary: 'Assign request to an agent or admin (Admins only)',
          tags: ['Requests'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Request ID' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string', format: 'uuid', nullable: true, example: '6768-some-uuid-value' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Successfully assigned and event logged' },
            400: { description: 'Invalid user ID' },
            401: { description: 'Unauthorized JWT token' },
            403: { description: 'Forbidden: Insufficient privileges' },
            404: { description: 'Request not found' },
          },
        },
      },
      '/api/users': {
        post: {
          summary: 'Create a new user account (Admins only)',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'role'],
                  properties: {
                    name: { type: 'string', example: 'Bruce Banner' },
                    email: { type: 'string', format: 'email', example: 'banner@crrs.com' },
                    password: { type: 'string', example: 'agent123' },
                    role: { type: 'string', enum: ['ADMIN', 'AGENT'], example: 'AGENT' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User account successfully created' },
            400: { description: 'Missing required parameters' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            409: { description: 'Email already exists' },
          },
        },
        get: {
          summary: 'List all registered staff users (Admins & Agents)',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Successful fetch',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
      },
    },
  },
  apis: [], // Defined inline above
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log(`[Swagger] Swagger UI available at http://localhost:${PORT}/api-docs`);
};
