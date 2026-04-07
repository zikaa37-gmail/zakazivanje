import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zakazivanje API',
      version: '1.0.0',
      description: 'REST API dokumentacija za platformu zakazivanje termina',
      contact: {
        name: 'Zakazivanje Tim',
        email: 'zikaa37@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.zakazivanje.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token - dobija se nakon login-a',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Jedinstveni ID korisnika',
              example: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email adresa korisnika',
              example: 'user@example.com',
            },
            firstName: {
              type: 'string',
              description: 'Ime korisnika',
              example: 'Marko',
            },
            lastName: {
              type: 'string',
              description: 'Prezime korisnika',
              example: 'Marković',
            },
            phone: {
              type: 'string',
              description: 'Broj telefona',
              example: '+381641234567',
            },
            role: {
              type: 'string',
              enum: ['client', 'provider', 'admin'],
              description: 'Uloga korisnika u sistemu',
              example: 'client',
            },
            emailVerified: {
              type: 'boolean',
              description: 'Da li je email verifikovan',
              example: false,
            },
            isActive: {
              type: 'boolean',
              description: 'Da li je nalog aktivan',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Datum kreiranja naloga',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  description: 'JWT access token (trajanje: 15 minuta)',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  description: 'Refresh token (trajanje: 365 dana)',
                  example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
                },
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data (optional)',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            statusCode: {
              type: 'integer',
              example: 400,
            },
            stack: {
              type: 'string',
              description: 'Stack trace (samo u development modu)',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email adresa korisnika',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Lozinka (minimum 8 karaktera)',
              example: 'password123',
            },
          },
        },
        RegisterClientRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'phone'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Minimum 8 karaktera',
              example: 'password123',
            },
            firstName: {
              type: 'string',
              example: 'Marko',
            },
            lastName: {
              type: 'string',
              example: 'Marković',
            },
            phone: {
              type: 'string',
              example: '+381641234567',
            },
            whatsappNumber: {
              type: 'string',
              description: 'WhatsApp broj (opciono)',
              example: '+381641234567',
            },
            preferredCommunication: {
              type: 'string',
              enum: ['email', 'sms', 'whatsapp'],
              example: 'email',
            },
          },
        },
        RegisterProviderRequest: {
          type: 'object',
          required: [
            'email',
            'password',
            'firstName',
            'lastName',
            'phone',
            'businessName',
            'businessCategory',
          ],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'business@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'password123',
            },
            firstName: {
              type: 'string',
              example: 'Jana',
            },
            lastName: {
              type: 'string',
              example: 'Janković',
            },
            phone: {
              type: 'string',
              example: '+381641234567',
            },
            businessName: {
              type: 'string',
              description: 'Naziv biznisa',
              example: 'Beauty Salon',
            },
            businessCategory: {
              type: 'string',
              description: 'Kategorija biznisa',
              example: 'salon',
            },
            pib: {
              type: 'string',
              description: 'PIB (opciono)',
              example: '123456789',
            },
            businessPhone: {
              type: 'string',
              description: 'Telefon biznisa (opciono)',
              example: '+381111234567',
            },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password', 'confirmPassword'],
          properties: {
            token: {
              type: 'string',
              description: 'Reset token iz email-a',
              example: 'abc123def456',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Nova lozinka (minimum 8 karaktera)',
              example: 'newPassword123',
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              description: 'Potvrda nove lozinke',
              example: 'newPassword123',
            },
          },
        },
        VerifyEmailRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'Verification token iz email-a',
              example: 'xyz789abc123',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Trenutni refresh token',
              example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
            },
          },
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  description: 'Novi JWT access token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  description: 'Novi refresh token',
                  example: 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7',
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Autentifikacija i autorizacija endpoint-i',
      },
      {
        name: 'Health',
        description: 'Health check endpoint-i',
      },
    ],
  },
  apis: ['./src/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
