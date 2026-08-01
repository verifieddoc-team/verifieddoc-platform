const publicUserSchema = {
  type: "object",
  required: ["id", "email", "firstName", "lastName", "role", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string", example: "clxyz1234567890" },
    email: { type: "string", format: "email", example: "jane.holder@example.test" },
    firstName: { type: "string", example: "Jane" },
    lastName: { type: "string", example: "Holder" },
    role: {
      type: "string",
      enum: ["HOLDER", "VERIFIER", "PLATFORM_ADMIN"]
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" }
  },
  additionalProperties: false
} as const;

const authSessionSchema = {
  type: "object",
  required: ["user", "accessToken", "refreshToken"],
  properties: {
    user: publicUserSchema,
    accessToken: { type: "string", description: "Short-lived JWT access token (15 minutes)" },
    refreshToken: { type: "string", description: "Opaque refresh token valid for 30 days" }
  },
  additionalProperties: false
} as const;

const errorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object" }
      }
    }
  }
} as const;

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "VerifiedDoc API",
    version: "0.1.0",
    description: "API for issuing, sharing, revoking, and verifying employer and organization credentials."
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token obtained from register, login, or refresh"
      }
    },
    schemas: {
      PublicUser: publicUserSchema,
      AuthSession: authSessionSchema,
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "firstName", "lastName"],
        properties: {
          email: { type: "string", format: "email", example: "jane.holder@example.test" },
          password: {
            type: "string",
            format: "password",
            description: "Minimum 8 characters with uppercase, lowercase, number, and special character"
          },
          firstName: { type: "string", example: "Jane" },
          lastName: { type: "string", example: "Holder" },
          role: {
            type: "string",
            enum: ["HOLDER", "VERIFIER"],
            default: "HOLDER",
            description: "Only HOLDER and VERIFIER may be selected during public registration"
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" }
        }
      },
      RefreshRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string" }
        }
      },
      LogoutRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string" }
        }
      },
      MeResponse: {
        type: "object",
        required: ["user"],
        properties: {
          user: publicUserSchema
        }
      },
      Organization: {
        type: "object",
        required: [
          "id",
          "name",
          "slug",
          "contactEmail",
          "country",
          "status",
          "createdAt",
          "updatedAt"
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          registrationNumber: { type: "string", nullable: true },
          website: { type: "string", format: "uri", nullable: true },
          contactEmail: { type: "string", format: "email" },
          country: { type: "string" },
          description: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]
          },
          rejectionReason: { type: "string", nullable: true },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      AdminOrganization: {
        allOf: [
          { $ref: "#/components/schemas/Organization" },
          {
            type: "object",
            required: ["reviewedById"],
            properties: {
              reviewedById: { type: "string", nullable: true }
            }
          }
        ]
      },
      OrganizationApplicationRequest: {
        type: "object",
        required: ["name", "slug", "contactEmail", "country"],
        properties: {
          name: { type: "string", example: "Northwind Training Institute" },
          slug: { type: "string", example: "northwind-training" },
          registrationNumber: { type: "string", example: "NW-123456" },
          website: { type: "string", format: "uri", example: "https://northwind.example.test" },
          contactEmail: { type: "string", format: "email", example: "contact@northwind.example.test" },
          country: { type: "string", example: "Canada" },
          description: { type: "string", example: "Fictional vocational training provider." }
        }
      },
      OrganizationRole: {
        type: "string",
        enum: ["ORGANIZATION_ADMIN", "ORGANIZATION_ISSUER"]
      },
      OrganizationApplicationResponse: {
        type: "object",
        required: ["organization", "membershipRole"],
        properties: {
          organization: { $ref: "#/components/schemas/Organization" },
          membershipRole: { $ref: "#/components/schemas/OrganizationRole" }
        }
      },
      OrganizationMembershipView: {
        type: "object",
        required: ["organization", "membershipRole"],
        properties: {
          organization: { $ref: "#/components/schemas/Organization" },
          membershipRole: { $ref: "#/components/schemas/OrganizationRole" }
        }
      },
      OrganizationListResponse: {
        type: "object",
        required: ["organizations"],
        properties: {
          organizations: {
            type: "array",
            items: { $ref: "#/components/schemas/OrganizationMembershipView" }
          }
        }
      },
      OrganizationMemberProfile: {
        type: "object",
        required: ["user", "membershipRole", "joinedAt"],
        properties: {
          user: publicUserSchema,
          membershipRole: { $ref: "#/components/schemas/OrganizationRole" },
          joinedAt: { type: "string", format: "date-time" }
        }
      },
      OrganizationMembersResponse: {
        type: "object",
        required: ["members"],
        properties: {
          members: {
            type: "array",
            items: { $ref: "#/components/schemas/OrganizationMemberProfile" }
          }
        }
      },
      PaginationMetadata: {
        type: "object",
        required: ["page", "limit", "total", "totalPages"],
        properties: {
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 0 }
        }
      },
      AdminOrganizationListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminOrganization" }
          },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      ReviewOrganizationRequest: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["APPROVE", "REJECT"] },
          rejectionReason: {
            type: "string",
            description: "Required when decision is REJECT"
          }
        }
      },
      ReviewOrganizationResponse: {
        type: "object",
        required: ["organization"],
        properties: {
          organization: { $ref: "#/components/schemas/AdminOrganization" }
        }
      },
      CredentialStatus: {
        type: "string",
        enum: ["ACTIVE", "EXPIRED", "REVOKED"],
        description: "Stored credential status"
      },
      EffectiveCredentialStatus: {
        type: "string",
        enum: ["ACTIVE", "EXPIRED", "REVOKED"],
        description: "Computed status; ACTIVE credentials past expiresAt are effectively EXPIRED"
      },
      SafeClaims: {
        type: "object",
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }]
        }
      },
      CredentialOrganizationSummary: {
        type: "object",
        required: ["id", "name", "slug"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" }
        }
      },
      SafeCredential: {
        type: "object",
        required: [
          "id",
          "publicId",
          "title",
          "credentialType",
          "referenceNo",
          "status",
          "effectiveStatus",
          "issuedAt",
          "organization"
        ],
        properties: {
          id: { type: "string" },
          publicId: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          credentialType: { type: "string" },
          referenceNo: { type: "string" },
          status: { $ref: "#/components/schemas/CredentialStatus" },
          effectiveStatus: { $ref: "#/components/schemas/EffectiveCredentialStatus" },
          issuedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          revokedAt: { type: "string", format: "date-time", nullable: true },
          revocationReason: { type: "string", nullable: true },
          claims: { oneOf: [{ $ref: "#/components/schemas/SafeClaims" }, { type: "null" }] },
          organization: { $ref: "#/components/schemas/CredentialOrganizationSummary" }
        }
      },
      IssueCredentialRequest: {
        type: "object",
        required: ["holderEmail", "title", "credentialType", "referenceNo", "issuedAt"],
        properties: {
          holderEmail: { type: "string", format: "email" },
          title: { type: "string" },
          credentialType: { type: "string" },
          referenceNo: { type: "string", minLength: 3, maxLength: 100 },
          description: { type: "string" },
          issuedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          claims: { $ref: "#/components/schemas/SafeClaims" }
        }
      },
      IssueCredentialResponse: {
        type: "object",
        required: ["credential"],
        properties: {
          credential: { $ref: "#/components/schemas/SafeCredential" }
        }
      },
      HolderCredentialSummary: {
        type: "object",
        required: [
          "id",
          "publicId",
          "title",
          "credentialType",
          "organization",
          "issuedAt",
          "status",
          "effectiveStatus"
        ],
        properties: {
          id: { type: "string" },
          publicId: { type: "string" },
          title: { type: "string" },
          credentialType: { type: "string" },
          claims: { oneOf: [{ $ref: "#/components/schemas/SafeClaims" }, { type: "null" }] },
          organization: {
            type: "object",
            required: ["name", "slug"],
            properties: {
              name: { type: "string" },
              slug: { type: "string" }
            }
          },
          issuedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          status: { $ref: "#/components/schemas/CredentialStatus" },
          effectiveStatus: { $ref: "#/components/schemas/EffectiveCredentialStatus" }
        }
      },
      HolderCredentialListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/HolderCredentialSummary" }
          },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      CredentialDetailResponse: {
        type: "object",
        required: ["credential"],
        properties: {
          credential: { $ref: "#/components/schemas/SafeCredential" }
        }
      },
      OrganizationCredentialSummary: {
        allOf: [
          { $ref: "#/components/schemas/SafeCredential" },
          {
            type: "object",
            required: ["holder"],
            properties: {
              holder: {
                type: "object",
                required: ["id", "email", "firstName", "lastName"],
                properties: {
                  id: { type: "string" },
                  email: { type: "string", format: "email" },
                  firstName: { type: "string" },
                  lastName: { type: "string" }
                }
              }
            }
          }
        ]
      },
      OrganizationCredentialListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/OrganizationCredentialSummary" }
          },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      RevokeCredentialRequest: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string", minLength: 5, maxLength: 1000 }
        }
      },
      RevokeCredentialResponse: {
        type: "object",
        required: ["credential"],
        properties: {
          credential: { $ref: "#/components/schemas/SafeCredential" }
        }
      },
      ShareLinkState: {
        type: "string",
        enum: ["ACTIVE", "EXPIRED", "REVOKED", "EXHAUSTED"],
        description: "Computed share-link availability state"
      },
      SafeShareLinkSummary: {
        type: "object",
        required: [
          "id",
          "createdAt",
          "expiresAt",
          "revokedAt",
          "maxViews",
          "viewCount",
          "lastViewedAt",
          "disclosedClaims",
          "includeHolderName",
          "includeReferenceNo",
          "state"
        ],
        properties: {
          id: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          revokedAt: { type: "string", format: "date-time", nullable: true },
          maxViews: { type: "integer", nullable: true, minimum: 1, maximum: 100 },
          viewCount: { type: "integer", minimum: 0 },
          lastViewedAt: { type: "string", format: "date-time", nullable: true },
          disclosedClaims: { type: "array", items: { type: "string" }, maxItems: 20 },
          includeHolderName: { type: "boolean" },
          includeReferenceNo: { type: "boolean" },
          state: { $ref: "#/components/schemas/ShareLinkState" }
        },
        additionalProperties: false
      },
      CreateShareLinkRequest: {
        type: "object",
        required: ["expiresInHours"],
        properties: {
          expiresInHours: { type: "integer", minimum: 1, maximum: 168 },
          maxViews: { type: "integer", minimum: 1, maximum: 100 },
          disclosedClaims: {
            type: "array",
            items: { type: "string" },
            maxItems: 20,
            description: "Optional claim keys to disclose during verification"
          },
          includeHolderName: { type: "boolean", default: false },
          includeReferenceNo: { type: "boolean", default: false }
        },
        additionalProperties: false
      },
      CreateShareLinkResponse: {
        type: "object",
        required: ["shareLink", "token", "verificationPath", "verificationUrl"],
        properties: {
          shareLink: { $ref: "#/components/schemas/SafeShareLinkSummary" },
          token: {
            type: "string",
            description: "Raw share token returned once; suitable for QR encoding via verificationUrl"
          },
          verificationPath: {
            type: "string",
            example: "/verify/abc123",
            description: "Relative web path for mobile and web clients"
          },
          verificationUrl: {
            type: "string",
            format: "uri",
            example: "http://localhost:3000/verify/abc123",
            description: "Absolute public web URL derived from PUBLIC_WEB_URL; clients may render this as a QR code"
          }
        },
        additionalProperties: false
      },
      ShareLinkListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/SafeShareLinkSummary" }
          }
        }
      },
      RevokeShareLinkResponse: {
        type: "object",
        required: ["shareLink"],
        properties: {
          shareLink: { $ref: "#/components/schemas/SafeShareLinkSummary" }
        }
      },
      VerificationResult: {
        type: "string",
        enum: ["VALID", "EXPIRED", "REVOKED"],
        description: "Credential verification outcome based on effective credential status"
      },
      PublicVerifiedOrganization: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" }
        },
        additionalProperties: false
      },
      PublicVerifiedCredential: {
        type: "object",
        required: [
          "publicId",
          "title",
          "credentialType",
          "effectiveStatus",
          "issuedAt",
          "expiresAt",
          "organization"
        ],
        properties: {
          publicId: { type: "string" },
          title: { type: "string" },
          credentialType: { type: "string" },
          effectiveStatus: { $ref: "#/components/schemas/EffectiveCredentialStatus" },
          issuedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          revokedAt: {
            type: "string",
            format: "date-time",
            description: "Present only when effectiveStatus is REVOKED"
          },
          organization: { $ref: "#/components/schemas/PublicVerifiedOrganization" },
          holderName: { type: "string" },
          referenceNo: { type: "string" },
          claims: { $ref: "#/components/schemas/SafeClaims" }
        },
        additionalProperties: false,
        description:
          "Holder-approved disclosure only. Never includes holder email, user IDs, internal credential IDs, share-link IDs, token hashes, undisclosed claims, revocation reasons, or authentication data."
      },
      PublicVerificationResponse: {
        type: "object",
        required: ["result", "credential"],
        properties: {
          result: { $ref: "#/components/schemas/VerificationResult" },
          credential: { $ref: "#/components/schemas/PublicVerifiedCredential" }
        },
        additionalProperties: false
      },
      InvitationState: {
        type: "string",
        enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]
      },
      SafeInvitationSummary: {
        type: "object",
        required: ["id", "email", "role", "createdAt", "expiresAt", "acceptedAt", "revokedAt", "state"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/OrganizationRole" },
          createdAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          acceptedAt: { type: "string", format: "date-time", nullable: true },
          revokedAt: { type: "string", format: "date-time", nullable: true },
          state: { $ref: "#/components/schemas/InvitationState" }
        },
        additionalProperties: false
      },
      CreateInvitationRequest: {
        type: "object",
        required: ["email", "role"],
        properties: {
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/OrganizationRole" },
          expiresInHours: { type: "integer", minimum: 1, maximum: 168, default: 72 }
        },
        additionalProperties: false
      },
      CreateInvitationResponse: {
        type: "object",
        required: ["invitation", "token", "invitationPath", "invitationUrl"],
        properties: {
          invitation: { $ref: "#/components/schemas/SafeInvitationSummary" },
          token: {
            type: "string",
            description: "Raw invitation token returned once for frontend acceptance flows"
          },
          invitationPath: {
            type: "string",
            example: "/invitations/accept#token=abc123",
            description:
              "Frontend route using a URL fragment so the token is not sent to the server on page load. The frontend reads the token from window.location.hash, removes the fragment from browser history immediately, and submits it in POST /invitations/accept. Never send the token as an API query parameter."
          },
          invitationUrl: {
            type: "string",
            format: "uri",
            example: "http://localhost:3000/invitations/accept#token=abc123",
            description:
              "Absolute invitation URL derived from PUBLIC_WEB_URL with the token in the URL fragment (#token=...) rather than a query string."
          }
        },
        additionalProperties: false
      },
      InvitationListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/SafeInvitationSummary" }
          }
        }
      },
      RevokeInvitationResponse: {
        type: "object",
        required: ["invitation"],
        properties: {
          invitation: { $ref: "#/components/schemas/SafeInvitationSummary" }
        }
      },
      AcceptInvitationRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string" }
        },
        additionalProperties: false
      },
      AcceptInvitationResponse: {
        type: "object",
        required: ["organizationId", "membershipRole"],
        properties: {
          organizationId: { type: "string" },
          membershipRole: { $ref: "#/components/schemas/OrganizationRole" }
        },
        additionalProperties: false
      },
      UpdateMemberRoleRequest: {
        type: "object",
        required: ["role"],
        properties: {
          role: { $ref: "#/components/schemas/OrganizationRole" }
        },
        additionalProperties: false
      },
      UpdateMemberRoleResponse: {
        type: "object",
        required: ["member"],
        properties: {
          member: { $ref: "#/components/schemas/OrganizationMemberProfile" }
        }
      },
      SafeAuditLogEntry: {
        type: "object",
        required: ["id", "action", "resourceType", "resourceId", "organizationId", "actor", "ipAddress", "userAgent", "details", "createdAt"],
        properties: {
          id: { type: "string" },
          action: { type: "string", example: "CREDENTIAL_ISSUED" },
          resourceType: { type: "string", example: "Credential" },
          resourceId: { type: "string", nullable: true },
          organizationId: { type: "string", nullable: true },
          actor: {
            anyOf: [{ $ref: "#/components/schemas/PublicUser" }, { type: "null" }]
          },
          ipAddress: { type: "string", nullable: true },
          userAgent: { type: "string", nullable: true },
          details: {
            type: "object",
            nullable: true,
            additionalProperties: true,
            description: "Sanitized metadata. Passwords, tokens, hashes, authorization headers, cookies, and request bodies are never returned."
          },
          createdAt: { type: "string", format: "date-time" }
        },
        additionalProperties: false
      },
      AuditLogListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/SafeAuditLogEntry" }
          },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        },
        additionalProperties: false
      },
      ErrorResponse: errorResponseSchema
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Check API liveness",
        tags: ["System"],
        description: "Lightweight process liveness check. Does not verify database connectivity.",
        responses: {
          "200": {
            description: "API process is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "verifieddoc-api" },
                    version: { type: "string", example: "0.1.0" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/ready": {
      get: {
        summary: "Check API readiness",
        tags: ["System"],
        description:
          "Executes a minimal PostgreSQL query. Returns 200 when the database responds and 503 when it does not. Never exposes database URLs, credentials, stack traces, or internal error details.",
        responses: {
          "200": {
            description: "API is ready",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ready" },
                    service: { type: "string", example: "verifieddoc-api" }
                  }
                }
              }
            }
          },
          "503": {
            description: "API dependencies are unavailable",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "unavailable" },
                    service: { type: "string", example: "verifieddoc-api" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/register": {
      post: {
        summary: "Register a new account",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Account created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSession" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Email already registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      post: {
        summary: "Authenticate with email and password",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSession" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/refresh": {
      post: {
        summary: "Rotate refresh token and issue a new access token",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Session refreshed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSession" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Invalid or revoked refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/logout": {
      post: {
        summary: "Revoke a refresh token",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LogoutRequest" }
            }
          }
        },
        responses: {
          "204": { description: "Refresh token revoked" },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      get: {
        summary: "Get the authenticated user profile",
        tags: ["Authentication"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Authenticated user profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MeResponse" }
              }
            }
          },
          "401": {
            description: "Missing or invalid access token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/organizations": {
      post: {
        summary: "Apply to onboard a new organization",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrganizationApplicationRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Organization application submitted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrganizationApplicationResponse" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Slug already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      get: {
        summary: "List organizations for the authenticated user",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Organizations where the caller is a member",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrganizationListResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/organizations/{organizationId}": {
      get: {
        summary: "Get organization details for a member",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Organization details and caller membership role",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrganizationMembershipView" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Caller is not a member of this organization",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Organization not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/organizations/{organizationId}/audit-logs": {
      get: {
        summary: "List organization audit logs",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires ORGANIZATION_ADMIN membership. Tenant isolation is enforced by organizationId on the audit record, not JSON details. Sensitive fields such as passwords, token hashes, raw tokens, request bodies, authorization headers, and cookies are never returned.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "resourceType", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": {
            description: "Paginated organization audit logs",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuditLogListResponse" } } }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Organization admin role required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/members": {
      get: {
        summary: "List organization members",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Safe member profiles for organization administrators",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrganizationMembersResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Insufficient organization permissions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Organization not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/organizations/{organizationId}/members/{userId}": {
      patch: {
        summary: "Update an organization member role",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires ORGANIZATION_ADMIN membership. Updates OrganizationMember.role only; never changes User.role. The final organization admin cannot be demoted.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "userId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateMemberRoleRequest" } } }
        },
        responses: {
          "200": {
            description: "Updated member profile",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateMemberRoleResponse" } } }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization or member not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Final admin protection or update conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      delete: {
        summary: "Remove an organization member",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires ORGANIZATION_ADMIN membership. Removes only the organization membership; never deletes the User. The final organization admin cannot be removed.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "userId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "204": { description: "Member removed" },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization or member not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Final admin protection or removal conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/invitations": {
      post: {
        summary: "Create an organization invitation",
        tags: ["Organization Invitations"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires ORGANIZATION_ADMIN membership and a VERIFIED organization. Raw invitation tokens are returned once in the response body and invitation URL fragment. The frontend must read the token from window.location.hash, remove the fragment from browser history immediately, and submit it via POST /invitations/accept. Tokens must never be sent as API query parameters or stored in server logs.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateInvitationRequest" } } }
        },
        responses: {
          "201": { description: "Invitation created", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateInvitationResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient permissions or organization not verified", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Member already exists or active invitation conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        summary: "List organization invitations",
        tags: ["Organization Invitations"],
        security: [{ bearerAuth: [] }],
        description: "Requires ORGANIZATION_ADMIN membership. Never returns tokenHash, activeKey, or raw tokens.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Invitation summaries", content: { "application/json": { schema: { $ref: "#/components/schemas/InvitationListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/invitations/{invitationId}/revoke": {
      patch: {
        summary: "Revoke a pending organization invitation",
        tags: ["Organization Invitations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "invitationId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Invitation revoked", content: { "application/json": { schema: { $ref: "#/components/schemas/RevokeInvitationResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Invitation not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Invitation already accepted, revoked, or expired", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/invitations/accept": {
      post: {
        summary: "Accept an organization invitation",
        tags: ["Organization Invitations"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires authentication and an exact normalized email match. The token must be supplied in the JSON request body only; never as a query parameter. Frontend clients should read the token from the invitation URL fragment (window.location.hash), remove the fragment from browser history immediately, and POST it here. Unknown, expired, revoked, accepted, or replayed tokens return INVITATION_UNAVAILABLE without exposing token validity details.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AcceptInvitationRequest" } } }
        },
        responses: {
          "200": { description: "Invitation accepted", content: { "application/json": { schema: { $ref: "#/components/schemas/AcceptInvitationResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Authenticated email does not match invitation", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Invitation unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/audit-logs": {
      get: {
        summary: "List platform audit logs",
        tags: ["Platform Administration"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires global PLATFORM_ADMIN role. Supports optional organizationId and actorId filters. Returns sanitized audit entries without passwords, token hashes, raw tokens, request bodies, authorization headers, or cookies.",
        parameters: [
          { name: "organizationId", in: "query", schema: { type: "string" } },
          { name: "actorId", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "resourceType", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": {
            description: "Paginated platform audit logs",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuditLogListResponse" } } }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Platform administrator role required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/organizations": {
      get: {
        summary: "List organizations for platform review",
        tags: ["Platform Administration"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"],
              default: "PENDING"
            }
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 }
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
          }
        ],
        responses: {
          "200": {
            description: "Paginated organization list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminOrganizationListResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Platform administrator role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/admin/organizations/{organizationId}/review": {
      patch: {
        summary: "Approve or reject a pending organization application",
        tags: ["Platform Administration"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "organizationId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReviewOrganizationRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Organization review completed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReviewOrganizationResponse" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Platform administrator role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Organization not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Organization has already been reviewed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/credentials": {
      get: {
        summary: "List credentials in the authenticated holder wallet",
        tags: ["Credentials"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["ACTIVE", "EXPIRED", "REVOKED"] }
          },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": {
            description: "Paginated holder credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HolderCredentialListResponse" }
              }
            }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/credentials/{credentialId}": {
      get: {
        summary: "Get credential detail for an authorized holder or organization member",
        tags: ["Credentials"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "credentialId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Credential detail",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CredentialDetailResponse" } } }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient access", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/credentials": {
      post: {
        summary: "Issue a credential from a verified organization",
        tags: ["Credentials"],
        security: [{ bearerAuth: [] }],
        description: "Requires ORGANIZATION_ADMIN or ORGANIZATION_ISSUER membership and a VERIFIED organization.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/IssueCredentialRequest" } } }
        },
        responses: {
          "201": { description: "Credential issued", content: { "application/json": { schema: { $ref: "#/components/schemas/IssueCredentialResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient permissions or organization not verified", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Holder not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Duplicate reference number", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        summary: "List credentials issued by an organization",
        tags: ["Credentials"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "EXPIRED", "REVOKED"] } },
          { name: "holderId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated organization credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationCredentialListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/credentials/{credentialId}/revoke": {
      patch: {
        summary: "Revoke an active organization credential",
        tags: ["Credentials"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "credentialId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RevokeCredentialRequest" } } }
        },
        responses: {
          "200": { description: "Credential revoked", content: { "application/json": { schema: { $ref: "#/components/schemas/RevokeCredentialResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Cross-organization or insufficient permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Credential is not active", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/credentials/{credentialId}/share-links": {
      post: {
        summary: "Create a consent-based share link for a credential",
        tags: ["Share Links"],
        security: [{ bearerAuth: [] }],
        description:
          "Only the credential holder may create a share link. The raw token is returned once and never stored; only its SHA-256 hash is persisted.",
        parameters: [{ name: "credentialId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateShareLinkRequest" } } }
        },
        responses: {
          "201": {
            description: "Share link created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateShareLinkResponse" } } }
          },
          "400": { description: "Validation error or invalid disclosed claims", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Only the credential holder may create share links", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        summary: "List share links for a credential",
        tags: ["Share Links"],
        security: [{ bearerAuth: [] }],
        description: "Only the credential holder may list share links. Token hashes and raw tokens are never returned.",
        parameters: [{ name: "credentialId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Share links for the credential", content: { "application/json": { schema: { $ref: "#/components/schemas/ShareLinkListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Only the credential holder may list share links", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/credentials/{credentialId}/share-links/{shareLinkId}/revoke": {
      patch: {
        summary: "Revoke a credential share link",
        tags: ["Share Links"],
        security: [{ bearerAuth: [] }],
        description: "Only the credential holder may revoke a share link. Uses a conditional update for concurrent requests.",
        parameters: [
          { name: "credentialId", in: "path", required: true, schema: { type: "string" } },
          { name: "shareLinkId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Share link revoked", content: { "application/json": { schema: { $ref: "#/components/schemas/RevokeShareLinkResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Only the credential holder may revoke share links", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential or share link not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Share link already revoked", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verify/{token}": {
      get: {
        summary: "Publicly verify a credential via share token",
        tags: ["Verification"],
        description:
          "No authentication required. Rate limited. The submitted token is hashed immediately and never logged. Unknown, expired, revoked, or exhausted links return a generic verification-unavailable response. Successful responses disclose only holder-approved fields.",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Credential verification result",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PublicVerificationResponse" } } }
          },
          "404": {
            description: "Verification unavailable for invalid, expired, revoked, or exhausted links",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "Public verification rate limit exceeded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    }
  }
};
