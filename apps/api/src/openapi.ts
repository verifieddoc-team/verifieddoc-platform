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
      ErrorResponse: errorResponseSchema
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        tags: ["System"],
        responses: {
          "200": {
            description: "API is healthy",
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
    }
  }
};
