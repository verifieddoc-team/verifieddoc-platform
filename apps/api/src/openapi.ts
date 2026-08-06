const publicUserSchema = {
  type: "object",
  required: [
    "id",
    "email",
    "fullName",
    "firstName",
    "lastName",
    "phone",
    "role",
    "status",
    "emailVerifiedAt",
    "createdAt",
    "updatedAt"
  ],
  properties: {
    id: { type: "string", example: "clxyz1234567890" },
    email: { type: "string", format: "email", example: "jane.holder@example.test" },
    fullName: { type: "string", example: "Jane Holder" },
    firstName: { type: "string", example: "Jane" },
    lastName: { type: "string", example: "Holder" },
    phone: { type: "string", nullable: true, example: "+256700000000" },
    role: {
      type: "string",
      enum: ["HOLDER", "VERIFIER", "PLATFORM_ADMIN"]
    },
    status: {
      type: "string",
      enum: ["ACTIVE", "SUSPENDED"]
    },
    emailVerifiedAt: {
      type: "string",
      format: "date-time",
      nullable: true,
      description: "ISO timestamp when signup email was verified; null until verification completes"
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" }
  },
  additionalProperties: false
} as const;

const organizationRegistrationSummarySchema = {
  type: "object",
  required: ["id", "name", "industry", "status", "membershipRole"],
  properties: {
    id: { type: "string" },
    name: { type: "string", example: "Lumora Solutions" },
    industry: { type: "string", nullable: true, example: "EDUCATION" },
    status: { type: "string", enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] },
    membershipRole: { type: "string", enum: ["ORGANIZATION_ADMIN"] }
  },
  additionalProperties: false
} as const;

const authSessionSchema = {
  type: "object",
  required: ["user", "accessToken", "refreshToken"],
  properties: {
    user: publicUserSchema,
    accessToken: { type: "string", description: "Short-lived JWT access token (15 minutes)" },
    refreshToken: { type: "string", description: "Opaque refresh token valid for 30 days" },
    organization: organizationRegistrationSummarySchema
  },
  additionalProperties: false
} as const;

const pendingEmailVerificationRegistrationResponseSchema = {
  type: "object",
  required: [
    "verificationRequired",
    "verificationRequestId",
    "email",
    "maskedEmail",
    "expiresInSeconds",
    "resendAvailableInSeconds"
  ],
  properties: {
    verificationRequired: { type: "boolean", enum: [true] },
    verificationRequestId: {
      type: "string",
      description: "Opaque signup verification challenge id (not a password-reset requestId)"
    },
    email: { type: "string", format: "email" },
    maskedEmail: { type: "string", example: "j***@example.com" },
    expiresInSeconds: { type: "integer", example: 600 },
    resendAvailableInSeconds: { type: "integer", example: 60 }
  },
  additionalProperties: false,
  description:
    "Returned by POST /auth/register when signup email verification is required. No accessToken, refreshToken, or OTP."
} as const;

const resendEmailVerificationResponseSchema = {
  type: "object",
  required: ["verificationRequestId", "expiresInSeconds", "resendAvailableInSeconds"],
  properties: {
    verificationRequestId: {
      type: "string",
      description: "Opaque signup verification challenge id (not a password-reset requestId)"
    },
    expiresInSeconds: { type: "integer", example: 600 },
    resendAvailableInSeconds: { type: "integer", example: 60 }
  },
  additionalProperties: false
} as const;

const industryOptionSchema = {
  type: "object",
  required: ["code", "label"],
  properties: {
    code: {
      type: "string",
      enum: [
        "HR_RECRUITMENT",
        "BANKING_FINTECH",
        "EDUCATION",
        "GOVERNMENT_GOVTECH",
        "LEGAL_SERVICES",
        "REAL_ESTATE_PROPTECH",
        "INSURANCE",
        "TRANSPORTATION",
        "PROFESSIONAL_LICENSING",
        "BACKGROUND_SCREENING"
      ],
      example: "EDUCATION"
    },
    label: { type: "string", example: "Education" }
  },
  additionalProperties: false
} as const;

const industryListResponseSchema = {
  type: "object",
  required: ["industries"],
  properties: {
    industries: {
      type: "array",
      items: industryOptionSchema
    }
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
        description:
          "JWT access token obtained from login, refresh, or POST /auth/email-verification/verify when signup verification is enabled (register alone does not issue tokens when verification is required)"
      }
    },
    schemas: {
      PublicUser: publicUserSchema,
      AuthSession: authSessionSchema,
      PendingEmailVerificationRegistrationResponse: pendingEmailVerificationRegistrationResponseSchema,
      VerifyEmailRequest: {
        type: "object",
        required: ["requestId", "otp"],
        properties: {
          requestId: {
            type: "string",
            description: "Signup verification challenge id from register or resend (not password-reset requestId)"
          },
          otp: {
            type: "string",
            pattern: "^\\d{6}$",
            example: "123456",
            description: "Six-digit signup verification OTP (separate from password-reset OTP)"
          }
        },
        additionalProperties: false
      },
      VerifyEmailResponse: authSessionSchema,
      ResendEmailVerificationRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "jane.holder@example.test" }
        },
        additionalProperties: false
      },
      ResendEmailVerificationResponse: resendEmailVerificationResponseSchema,
      IndustryOption: industryOptionSchema,
      IndustryListResponse: industryListResponseSchema,
      OrganizationRegistrationSummary: organizationRegistrationSummarySchema,
      RegisterRequest: {
        oneOf: [
          { $ref: "#/components/schemas/RegisterHolderRequest" },
          { $ref: "#/components/schemas/RegisterVerifierRequest" },
          { $ref: "#/components/schemas/RegisterOrganizationRequest" },
          { $ref: "#/components/schemas/RegisterLegacyRequest" }
        ]
      },
      RegisterHolderRequest: {
        type: "object",
        required: [
          "accountType",
          "fullName",
          "email",
          "phone",
          "password",
          "confirmPassword",
          "acceptedTerms"
        ],
        properties: {
          accountType: { type: "string", enum: ["HOLDER"] },
          fullName: { type: "string", example: "Jane Holder" },
          email: { type: "string", format: "email", example: "jane.holder@example.test" },
          phone: { type: "string", example: "+256700000000" },
          password: { type: "string", format: "password", example: "SecurePassword1!" },
          confirmPassword: { type: "string", format: "password", example: "SecurePassword1!" },
          acceptedTerms: { type: "boolean", enum: [true] }
        },
        additionalProperties: false,
        description: "Canonical Credential Holder registration. Do not send companyName, industry, or hrContact."
      },
      RegisterVerifierRequest: {
        type: "object",
        required: [
          "accountType",
          "fullName",
          "email",
          "phone",
          "password",
          "confirmPassword",
          "acceptedTerms"
        ],
        properties: {
          accountType: { type: "string", enum: ["VERIFIER"] },
          fullName: { type: "string", example: "Victor Verifier" },
          email: { type: "string", format: "email", example: "victor.verifier@example.test" },
          phone: { type: "string", example: "+256700000001" },
          password: { type: "string", format: "password", example: "SecurePassword1!" },
          confirmPassword: { type: "string", format: "password", example: "SecurePassword1!" },
          acceptedTerms: { type: "boolean", enum: [true] }
        },
        additionalProperties: false
      },
      RegisterOrganizationRequest: {
        type: "object",
        required: [
          "accountType",
          "fullName",
          "email",
          "phone",
          "password",
          "confirmPassword",
          "companyName",
          "industry",
          "hrContact",
          "country",
          "acceptedTerms"
        ],
        properties: {
          accountType: { type: "string", enum: ["ORGANIZATION"] },
          fullName: { type: "string", example: "Jane Smith" },
          email: { type: "string", format: "email", example: "jane@company.com" },
          phone: { type: "string", example: "+256700000000" },
          password: { type: "string", format: "password", example: "SecurePassword1!" },
          confirmPassword: { type: "string", format: "password", example: "SecurePassword1!" },
          companyName: { type: "string", example: "Lumora Solutions" },
          industry: {
            type: "string",
            example: "EDUCATION",
            description:
              "Prefer a stable industry code from GET /meta/industries (e.g. EDUCATION). Approved codes or exact labels are accepted and normalized to codes when recognized."
          },
          country: { type: "string", example: "Uganda" },
          hrContact: {
            oneOf: [
              {
                type: "object",
                required: ["email"],
                properties: {
                  fullName: { type: "string", example: "Mary Human" },
                  email: { type: "string", format: "email", example: "hr@company.com" },
                  phone: { type: "string", example: "+256711111111" }
                },
                additionalProperties: false
              },
              { type: "string", format: "email", description: "Temporary simple email form" }
            ],
            description: "Canonical property name is hrContact (case-sensitive). Deprecated alias hrcontact is accepted temporarily."
          },
          hrcontact: {
            description: "Deprecated lowercase alias for hrContact. Do not send both.",
            deprecated: true
          },
          acceptedTerms: { type: "boolean", enum: [true] }
        },
        additionalProperties: false
      },
      RegisterLegacyRequest: {
        type: "object",
        required: ["email", "password", "firstName", "lastName"],
        properties: {
          email: { type: "string", format: "email", example: "legacy@example.test" },
          password: {
            type: "string",
            format: "password",
            description: "Minimum 8 characters with uppercase, lowercase, number, and special character"
          },
          firstName: { type: "string", example: "Legacy" },
          lastName: { type: "string", example: "User" },
          role: {
            type: "string",
            enum: ["HOLDER", "VERIFIER"],
            default: "HOLDER",
            description: "Only HOLDER and VERIFIER may be selected during public registration"
          }
        },
        additionalProperties: false,
        description: "Legacy registration request retained for backward compatibility"
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" }
        },
        additionalProperties: false,
        description:
          "Email and password only. Do not send role or other fields — login UI role cards are navigation choices, not authorization proof."
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
          industry: { type: "string", nullable: true },
          hrContactName: { type: "string", nullable: true },
          hrContactEmail: { type: "string", format: "email", nullable: true },
          hrContactPhone: { type: "string", nullable: true },
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
      UpdateOrganizationRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          registrationNumber: { type: "string", nullable: true },
          website: { type: "string", format: "uri", nullable: true },
          contactEmail: { type: "string", format: "email" },
          country: { type: "string" },
          description: { type: "string", nullable: true },
          industry: { type: "string", nullable: true },
          hrContactName: { type: "string", nullable: true },
          hrContactEmail: { type: "string", format: "email", nullable: true },
          hrContactPhone: { type: "string", nullable: true }
        },
        additionalProperties: false,
        description: "At least one field required. Role: ORGANIZATION_ADMIN."
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
      HolderDashboardHolder: {
        type: "object",
        required: ["id", "email", "firstName", "lastName", "role"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          fullName: { type: "string", description: "Additive convenience field" },
          role: { type: "string", enum: ["HOLDER"] }
        }
      },
      HolderDashboardStats: {
        type: "object",
        required: ["total", "active", "expired", "revoked", "pendingVerifications", "sharedThisMonth"],
        properties: {
          total: { type: "integer", minimum: 0 },
          active: { type: "integer", minimum: 0 },
          expired: { type: "integer", minimum: 0 },
          revoked: { type: "integer", minimum: 0 },
          pendingVerifications: {
            type: "integer",
            minimum: 0,
            description: "Pending verification requests for this holder"
          },
          sharedThisMonth: {
            type: "integer",
            minimum: 0,
            description: "Share links created by this holder in the current UTC month"
          }
        }
      },
      HolderActivityItem: {
        type: "object",
        required: ["id", "type", "title", "createdAt"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: [
              "CREDENTIAL_ISSUED",
              "SHARE_LINK_CREATED",
              "VERIFICATION_EVENT",
              "VERIFICATION_REQUEST"
            ]
          },
          title: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          metadata: { type: "object", additionalProperties: true }
        }
      },
      HolderActivityResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/HolderActivityItem" }
          },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      HolderDashboardResponse: {
        type: "object",
        required: ["holder", "stats", "recentCredentials", "recentActivity"],
        properties: {
          holder: { $ref: "#/components/schemas/HolderDashboardHolder" },
          stats: { $ref: "#/components/schemas/HolderDashboardStats" },
          recentCredentials: {
            type: "array",
            maxItems: 5,
            items: { $ref: "#/components/schemas/HolderCredentialSummary" }
          },
          recentActivity: {
            type: "array",
            items: { $ref: "#/components/schemas/HolderActivityItem" }
          }
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

      UpdateProfileRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", example: "Jane Holder" },
          phone: { type: "string", example: "+256700000000" },
          firstName: { type: "string" },
          lastName: { type: "string" }
        },
        additionalProperties: false,
        description: "Provide fullName, firstName+lastName, and/or phone"
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", format: "password" },
          newPassword: {
            type: "string",
            format: "password",
            description: "Minimum 8 characters with uppercase, lowercase, number, and special character"
          }
        },
        additionalProperties: false
      },
      PasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", example: "jane.holder@example.test" }
        },
        additionalProperties: false
      },
      PasswordResetRequestResponse: {
        type: "object",
        required: ["requestId"],
        properties: {
          requestId: { type: "string", example: "clresetrequest123" }
        },
        additionalProperties: false,
        description: "Always returns a requestId (opaque when email unknown) to avoid account enumeration"
      },
      PasswordResetVerifyRequest: {
        type: "object",
        required: ["requestId", "otp"],
        properties: {
          requestId: { type: "string", example: "clresetrequest123" },
          otp: { type: "string", example: "123456" }
        },
        additionalProperties: false
      },
      PasswordResetVerifyResponse: {
        type: "object",
        required: ["resetToken", "expiresInSeconds"],
        properties: {
          resetToken: { type: "string", example: "base64url-reset-token" },
          expiresInSeconds: { type: "integer", example: 900 }
        },
        additionalProperties: false
      },
      PasswordResetConfirmRequest: {
        type: "object",
        required: ["resetToken", "newPassword"],
        properties: {
          resetToken: { type: "string", example: "base64url-reset-token" },
          newPassword: {
            type: "string",
            format: "password",
            example: "NewSecurePassword1!"
          }
        },
        additionalProperties: false
      },
      PersonalDocument: {
        type: "object",
        required: ["id", "title", "documentType", "originalFileName", "mimeType", "sizeBytes", "uploadedAt", "createdAt"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          documentType: { type: "string" },
          originalFileName: { type: "string" },
          mimeType: { type: "string" },
          sizeBytes: { type: "integer" },
          uploadedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      PersonalDocumentUploadUrlRequest: {
        type: "object",
        required: ["title", "documentType", "originalFileName", "mimeType", "sizeBytes"],
        properties: {
          title: { type: "string" },
          documentType: { type: "string" },
          originalFileName: { type: "string" },
          mimeType: { type: "string", example: "application/pdf" },
          sizeBytes: { type: "integer", maximum: 26214400 }
        },
        additionalProperties: false
      },
      PersonalDocumentUploadUrlResponse: {
        type: "object",
        required: ["documentId", "uploadUrl", "storagePath", "expiresAt", "headers"],
        properties: {
          documentId: { type: "string" },
          uploadUrl: { type: "string" },
          storagePath: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
          headers: {
            type: "object",
            required: ["Content-Type"],
            properties: { "Content-Type": { type: "string" } }
          }
        }
      },
      PersonalDocumentListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/PersonalDocument" } }
        }
      },
      PersonalDocumentResponse: {
        type: "object",
        required: ["document"],
        properties: { document: { $ref: "#/components/schemas/PersonalDocument" } }
      },
      VerificationMethod: {
        type: "string",
        enum: ["SHARE_TOKEN", "QR", "PUBLIC_ID", "FILE_HASH"]
      },
      VerificationOutcome: {
        type: "string",
        enum: ["VERIFIED", "EXPIRED", "REVOKED", "INVALID", "NOT_FOUND"]
      },
      VerifierVerificationResult: {
        type: "string",
        enum: ["VALID", "EXPIRED", "REVOKED", "INVALID", "NOT_FOUND"],
        description: "API-facing result; VERIFIED outcome is exposed as VALID"
      },
      VerificationRequestStatus: {
        type: "string",
        enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]
      },
      VerificationEventSummary: {
        type: "object",
        required: ["id", "method", "result", "createdAt"],
        properties: {
          id: { type: "string" },
          method: { $ref: "#/components/schemas/VerificationMethod" },
          result: { $ref: "#/components/schemas/VerificationOutcome" },
          createdAt: { type: "string", format: "date-time" },
          credentialPublicIdSnapshot: { type: "string", nullable: true },
          organization: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" }
            }
          },
          credential: {
            type: "object",
            nullable: true,
            properties: {
              publicId: { type: "string" },
              title: { type: "string" },
              credentialType: { type: "string" },
              status: { $ref: "#/components/schemas/CredentialStatus" },
              effectiveStatus: { $ref: "#/components/schemas/EffectiveCredentialStatus" }
            }
          }
        }
      },
      PublicCredentialSummary: {
        type: "object",
        required: ["publicId", "title", "credentialType", "status", "effectiveStatus", "issuedAt", "organization"],
        properties: {
          publicId: { type: "string" },
          title: { type: "string" },
          credentialType: { type: "string" },
          status: { $ref: "#/components/schemas/CredentialStatus" },
          effectiveStatus: { $ref: "#/components/schemas/EffectiveCredentialStatus" },
          issuedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          organization: {
            type: "object",
            required: ["name", "slug"],
            properties: {
              name: { type: "string" },
              slug: { type: "string" }
            }
          }
        }
      },
      VerifierVerificationResponse: {
        type: "object",
        required: ["result", "verification"],
        properties: {
          result: { $ref: "#/components/schemas/VerifierVerificationResult" },
          credential: { $ref: "#/components/schemas/PublicCredentialSummary" },
          verification: {
            type: "object",
            required: ["id", "method", "result", "createdAt"],
            properties: {
              id: { type: "string" },
              method: { $ref: "#/components/schemas/VerificationMethod" },
              result: { $ref: "#/components/schemas/VerificationOutcome" },
              createdAt: { type: "string", format: "date-time" }
            }
          }
        }
      },
      CreateVerificationRequest: {
        oneOf: [
          {
            type: "object",
            required: ["method", "token"],
            properties: {
              method: { type: "string", enum: ["SHARE_TOKEN"] },
              token: { type: "string" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["method", "token"],
            properties: {
              method: { type: "string", enum: ["QR"] },
              token: { type: "string" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["method", "publicId"],
            properties: {
              method: { type: "string", enum: ["PUBLIC_ID"] },
              publicId: { type: "string" }
            },
            additionalProperties: false
          }
        ]
      },
      FileVerificationUploadUrlRequest: {
        type: "object",
        required: ["originalFileName", "mimeType", "sizeBytes"],
        properties: {
          originalFileName: { type: "string" },
          mimeType: { type: "string" },
          sizeBytes: { type: "integer", maximum: 26214400 }
        },
        additionalProperties: false
      },
      FileVerificationUploadUrlResponse: {
        type: "object",
        required: ["uploadId", "uploadUrl", "storagePath", "expiresAt", "headers"],
        properties: {
          uploadId: { type: "string" },
          uploadUrl: { type: "string" },
          storagePath: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
          headers: {
            type: "object",
            required: ["Content-Type"],
            properties: { "Content-Type": { type: "string" } }
          }
        }
      },
      VerificationRequestPerson: {
        type: "object",
        required: ["id", "firstName", "lastName"],
        properties: {
          id: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" }
        }
      },
      VerificationRequestSummary: {
        type: "object",
        required: ["id", "status", "requesterNote", "reviewNote", "reviewedAt", "createdAt", "updatedAt", "credential", "organization", "requestedBy"],
        properties: {
          id: { type: "string" },
          status: { $ref: "#/components/schemas/VerificationRequestStatus" },
          requesterNote: { type: "string", nullable: true },
          reviewNote: { type: "string", nullable: true },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          credential: {
            type: "object",
            required: ["id", "publicId", "title", "credentialType", "status"],
            properties: {
              id: { type: "string" },
              publicId: { type: "string" },
              title: { type: "string" },
              credentialType: { type: "string" },
              status: { $ref: "#/components/schemas/CredentialStatus" },
              effectiveStatus: { $ref: "#/components/schemas/EffectiveCredentialStatus" }
            }
          },
          organization: {
            type: "object",
            required: ["id", "name", "slug"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" }
            }
          },
          holder: { $ref: "#/components/schemas/VerificationRequestPerson" },
          requestedBy: { $ref: "#/components/schemas/VerificationRequestPerson" },
          reviewedBy: {
            anyOf: [{ $ref: "#/components/schemas/VerificationRequestPerson" }, { type: "null" }]
          }
        }
      },
      CreateVerificationRequestBody: {
        type: "object",
        description:
          "Provide credentialPublicId (canonical). credentialId and requesterNote remain temporarily accepted.",
        properties: {
          credentialPublicId: { type: "string", example: "PUB-7K4P-92AX" },
          credentialId: {
            type: "string",
            deprecated: true,
            description: "Deprecated internal id; prefer credentialPublicId"
          },
          note: { type: "string", maxLength: 2000 },
          requesterNote: {
            type: "string",
            maxLength: 2000,
            deprecated: true,
            description: "Deprecated; prefer note"
          }
        },
        additionalProperties: false
      },
      ReviewVerificationRequestBody: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["APPROVE", "REJECT"] },
          note: { type: "string", maxLength: 2000 }
        },
        additionalProperties: false
      },
      VerificationRequestResponse: {
        type: "object",
        required: ["request"],
        properties: { request: { $ref: "#/components/schemas/VerificationRequestSummary" } }
      },
      VerificationRequestListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/VerificationRequestSummary" } },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      VerifierDashboardResponse: {
        type: "object",
        required: ["stats", "recentVerifications", "savedOrganizationsCount"],
        properties: {
          stats: {
            type: "object",
            required: ["totalVerifications", "successful", "failed", "thisMonth"],
            properties: {
              totalVerifications: { type: "integer" },
              successful: { type: "integer" },
              failed: { type: "integer" },
              thisMonth: { type: "integer" }
            }
          },
          recentVerifications: {
            type: "array",
            items: { $ref: "#/components/schemas/VerificationEventSummary" }
          },
          savedOrganizationsCount: { type: "integer" }
        }
      },
      SavedOrganization: {
        type: "object",
        required: ["id", "organizationId", "createdAt", "organization"],
        properties: {
          id: { type: "string" },
          organizationId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          organization: {
            type: "object",
            required: ["id", "name", "slug", "country", "status"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              country: { type: "string" },
              status: { type: "string", enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] },
              website: { type: "string", nullable: true }
            }
          }
        }
      },
      SaveOrganizationRequest: {
        type: "object",
        required: ["organizationId"],
        properties: { organizationId: { type: "string" } },
        additionalProperties: false
      },
      SavedOrganizationListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/SavedOrganization" } }
        }
      },
      SavedOrganizationResponse: {
        type: "object",
        required: ["savedOrganization"],
        properties: { savedOrganization: { $ref: "#/components/schemas/SavedOrganization" } }
      },
      OrganizationDashboardResponse: {
        type: "object",
        required: ["stats", "recentCredentials", "recentVerificationRequests"],
        properties: {
          stats: {
            type: "object",
            required: [
              "totalIssued",
              "active",
              "expired",
              "revoked",
              "activeRecipients",
              "pendingVerificationRequests",
              "issuedThisMonth"
            ],
            properties: {
              totalIssued: { type: "integer" },
              active: { type: "integer" },
              expired: { type: "integer" },
              revoked: { type: "integer" },
              activeRecipients: { type: "integer" },
              pendingVerificationRequests: { type: "integer" },
              issuedThisMonth: { type: "integer" }
            }
          },
          recentCredentials: {
            type: "array",
            items: { $ref: "#/components/schemas/SafeCredential" }
          },
          recentVerificationRequests: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "status", "requesterNote", "createdAt", "credential", "requestedBy"],
              properties: {
                id: { type: "string" },
                status: { $ref: "#/components/schemas/VerificationRequestStatus" },
                requesterNote: { type: "string", nullable: true },
                createdAt: { type: "string", format: "date-time" },
                credential: {
                  type: "object",
                  required: ["id", "publicId", "title"],
                  properties: {
                    id: { type: "string" },
                    publicId: { type: "string" },
                    title: { type: "string" }
                  }
                },
                requestedBy: {
                  type: "object",
                  required: ["id", "firstName", "lastName"],
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      OrganizationRecipient: {
        type: "object",
        required: ["id", "user", "createdAt"],
        properties: {
          id: { type: "string" },
          user: { $ref: "#/components/schemas/PublicUser" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      OrganizationRecipientListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/OrganizationRecipient" } }
        }
      },
      RecipientInvitationSummary: {
        type: "object",
        required: ["id", "email", "createdAt", "expiresAt", "acceptedAt", "revokedAt", "state"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          acceptedAt: { type: "string", format: "date-time", nullable: true },
          revokedAt: { type: "string", format: "date-time", nullable: true },
          state: { type: "string", enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"] }
        }
      },
      CreateRecipientInvitationRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          expiresInHours: { type: "integer", minimum: 1, maximum: 168, default: 72 }
        },
        additionalProperties: false
      },
      CreateRecipientInvitationResponse: {
        type: "object",
        required: ["invitation", "token", "invitationPath", "invitationUrl"],
        properties: {
          invitation: { $ref: "#/components/schemas/RecipientInvitationSummary" },
          token: { type: "string" },
          invitationPath: { type: "string" },
          invitationUrl: { type: "string" }
        }
      },
      AcceptRecipientInvitationRequest: {
        type: "object",
        required: ["token"],
        properties: { token: { type: "string" } },
        additionalProperties: false
      },
      AcceptRecipientInvitationResponse: {
        type: "object",
        required: ["organizationId", "recipientId"],
        properties: {
          organizationId: { type: "string" },
          recipientId: { type: "string" }
        }
      },
      RecipientInvitationListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/RecipientInvitationSummary" } }
        }
      },
      OrganizationDocumentType: {
        type: "string",
        enum: ["REGISTRATION_CERTIFICATE", "TAX_DOCUMENT", "ACCREDITATION", "OTHER"]
      },
      DocumentUploadStatus: {
        type: "string",
        enum: ["PENDING_UPLOAD", "UPLOADED", "UNDER_REVIEW", "VERIFIED", "REJECTED"]
      },
      OrganizationDocument: {
        type: "object",
        required: [
          "id",
          "documentType",
          "originalFileName",
          "mimeType",
          "sizeBytes",
          "status",
          "uploadedAt",
          "reviewedAt",
          "rejectionReason",
          "createdAt"
        ],
        properties: {
          id: { type: "string" },
          documentType: { $ref: "#/components/schemas/OrganizationDocumentType" },
          originalFileName: { type: "string" },
          mimeType: { type: "string" },
          sizeBytes: { type: "integer" },
          status: { $ref: "#/components/schemas/DocumentUploadStatus" },
          uploadedAt: { type: "string", format: "date-time", nullable: true },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          rejectionReason: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          downloadUrl: { type: "string" },
          downloadUrlExpiresAt: { type: "string", format: "date-time" }
        }
      },
      RegistrationDocumentUploadUrlRequest: {
        type: "object",
        required: ["documentType", "originalFileName", "mimeType", "sizeBytes"],
        properties: {
          documentType: { $ref: "#/components/schemas/OrganizationDocumentType" },
          originalFileName: { type: "string" },
          mimeType: { type: "string", enum: ["application/pdf", "image/jpeg", "image/png"] },
          sizeBytes: { type: "integer", maximum: 10485760 }
        },
        additionalProperties: false
      },
      RegistrationDocumentUploadUrlResponse: {
        type: "object",
        required: ["documentId", "uploadUrl", "storagePath", "expiresAt", "headers"],
        properties: {
          documentId: { type: "string" },
          uploadUrl: { type: "string" },
          storagePath: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
          headers: {
            type: "object",
            required: ["Content-Type"],
            properties: { "Content-Type": { type: "string" } }
          }
        }
      },
      OrganizationDocumentListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/OrganizationDocument" } }
        }
      },
      OrganizationDocumentResponse: {
        type: "object",
        required: ["document"],
        properties: { document: { $ref: "#/components/schemas/OrganizationDocument" } }
      },
      ReviewRegistrationDocumentRequest: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["VERIFY", "REJECT"] },
          rejectionReason: { type: "string", description: "Required when decision is REJECT" }
        },
        additionalProperties: false
      },
      CredentialArtifact: {
        type: "object",
        required: [
          "id",
          "credentialId",
          "originalFileName",
          "mimeType",
          "sizeBytes",
          "checksumSha256",
          "completedAt",
          "createdAt"
        ],
        properties: {
          id: { type: "string" },
          credentialId: { type: "string" },
          originalFileName: { type: "string" },
          mimeType: { type: "string" },
          sizeBytes: { type: "integer" },
          checksumSha256: { type: "string" },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          downloadUrl: { type: "string" },
          downloadUrlExpiresAt: { type: "string", format: "date-time" }
        }
      },
      CredentialArtifactUploadUrlRequest: {
        type: "object",
        required: ["originalFileName", "mimeType", "sizeBytes"],
        properties: {
          originalFileName: { type: "string" },
          mimeType: { type: "string", enum: ["application/pdf", "image/jpeg", "image/png"] },
          sizeBytes: { type: "integer", maximum: 10485760 }
        },
        additionalProperties: false
      },
      CredentialArtifactUploadUrlResponse: {
        type: "object",
        required: ["artifactId", "uploadUrl", "storagePath", "expiresAt", "headers"],
        properties: {
          artifactId: { type: "string" },
          uploadUrl: { type: "string" },
          storagePath: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
          headers: {
            type: "object",
            required: ["Content-Type"],
            properties: { "Content-Type": { type: "string" } }
          }
        }
      },
      CredentialArtifactListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/CredentialArtifact" } }
        }
      },
      CredentialArtifactResponse: {
        type: "object",
        required: ["artifact"],
        properties: { artifact: { $ref: "#/components/schemas/CredentialArtifact" } }
      },
      AdminUser: {
        allOf: [
          { $ref: "#/components/schemas/PublicUser" },
          {
            type: "object",
            required: ["suspendedAt", "suspendedReason"],
            properties: {
              suspendedAt: { type: "string", format: "date-time", nullable: true },
              suspendedReason: { type: "string", nullable: true }
            }
          }
        ]
      },
      AdminUserStatusRequest: {
        oneOf: [
          {
            type: "object",
            required: ["action", "reason"],
            properties: {
              action: { type: "string", enum: ["SUSPEND"] },
              reason: { type: "string" }
            },
            additionalProperties: false
          },
          {
            type: "object",
            required: ["action"],
            properties: {
              action: { type: "string", enum: ["REINSTATE"] }
            },
            additionalProperties: false
          }
        ]
      },
      AdminUserListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/AdminUser" } },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      AdminUserResponse: {
        type: "object",
        required: ["user"],
        properties: { user: { $ref: "#/components/schemas/AdminUser" } }
      },
      FraudAlertType: {
        type: "string",
        enum: [
          "HIGH_RISK_DOCUMENT",
          "MULTIPLE_VERIFICATION_FAILURES",
          "REVOKED_CREDENTIAL_ACCESS",
          "FILE_HASH_MISMATCH",
          "SUSPICIOUS_ACTIVITY"
        ]
      },
      FraudAlertSeverity: {
        type: "string",
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
      },
      FraudAlertStatus: {
        type: "string",
        enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]
      },
      FraudAlert: {
        type: "object",
        required: [
          "id",
          "type",
          "severity",
          "status",
          "title",
          "description",
          "occurrenceCount",
          "firstSeenAt",
          "lastSeenAt",
          "createdAt",
          "updatedAt"
        ],
        properties: {
          id: { type: "string" },
          type: { $ref: "#/components/schemas/FraudAlertType" },
          severity: { $ref: "#/components/schemas/FraudAlertSeverity" },
          status: { $ref: "#/components/schemas/FraudAlertStatus" },
          title: { type: "string" },
          description: { type: "string" },
          credentialId: { type: "string", nullable: true },
          verificationEventId: { type: "string", nullable: true },
          actorId: { type: "string", nullable: true },
          ipAddress: { type: "string", nullable: true },
          occurrenceCount: { type: "integer" },
          metadata: { type: "object", nullable: true, additionalProperties: true },
          firstSeenAt: { type: "string", format: "date-time" },
          lastSeenAt: { type: "string", format: "date-time" },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
          resolvedById: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      FraudAlertStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["ACKNOWLEDGED", "RESOLVED", "DISMISSED"] }
        },
        additionalProperties: false
      },
      FraudAlertListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/FraudAlert" } },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" }
        }
      },
      AdminDashboardResponse: {
        type: "object",
        required: ["stats", "recentVerificationRequests", "fraudAlerts"],
        properties: {
          stats: {
            type: "object",
            required: [
              "totalUsers",
              "institutions",
              "documents",
              "verifications",
              "growth",
              "currentPeriod",
              "previousPeriod"
            ],
            properties: {
              totalUsers: { type: "integer" },
              institutions: { type: "integer" },
              documents: {
                type: "integer",
                description: "Issued credentials count (platform document inventory)"
              },
              verifications: { type: "integer" },
              growth: { type: "object", additionalProperties: true },
              currentPeriod: { type: "object", additionalProperties: true },
              previousPeriod: { type: "object", additionalProperties: true }
            }
          },
          recentVerificationRequests: { type: "array", items: { type: "object", additionalProperties: true } },
          fraudAlerts: { type: "array", items: { $ref: "#/components/schemas/FraudAlert" } }
        }
      },
      NotificationType: {
        type: "string",
        enum: [
          "CREDENTIAL_ISSUED",
          "CREDENTIAL_REVOKED",
          "ORGANIZATION_APPROVED",
          "ORGANIZATION_REJECTED",
          "ORGANIZATION_INVITATION",
          "RECIPIENT_INVITATION",
          "VERIFICATION_REQUEST_SUBMITTED",
          "VERIFICATION_REQUEST_REVIEWED",
          "FRAUD_ALERT",
          "SHARE_LINK_USED",
          "GENERIC"
        ]
      },
      Notification: {
        type: "object",
        required: ["id", "type", "title", "message", "resourceType", "resourceId", "readAt", "createdAt"],
        properties: {
          id: { type: "string" },
          type: { $ref: "#/components/schemas/NotificationType" },
          title: { type: "string" },
          message: { type: "string" },
          resourceType: { type: "string", nullable: true },
          resourceId: { type: "string", nullable: true },
          readAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      NotificationListResponse: {
        type: "object",
        required: ["data", "pagination", "unreadCount"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
          pagination: { $ref: "#/components/schemas/PaginationMetadata" },
          unreadCount: { type: "integer" }
        }
      },
      NotificationResponse: {
        type: "object",
        required: ["notification"],
        properties: { notification: { $ref: "#/components/schemas/Notification" } }
      },
      MarkAllNotificationsReadResponse: {
        type: "object",
        required: ["updatedCount"],
        properties: { updatedCount: { type: "integer" } }
      },
      ReportSummary: {
        type: "object",
        required: ["from", "to", "summary"],
        properties: {
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          summary: {
            type: "object",
            required: [
              "usersCreated",
              "institutionsCreated",
              "documentsIssued",
              "verifications",
              "fraudAlertsOpened",
              "verificationRequests",
              "verificationByResult",
              "verificationByMethod"
            ],
            properties: {
              usersCreated: { type: "integer" },
              institutionsCreated: { type: "integer" },
              documentsIssued: {
                type: "integer",
                description: "Issued credentials created in range"
              },
              verifications: { type: "integer" },
              fraudAlertsOpened: { type: "integer" },
              verificationRequests: { type: "integer" },
              verificationByResult: { type: "object", additionalProperties: { type: "integer" } },
              verificationByMethod: { type: "object", additionalProperties: { type: "integer" } }
            }
          }
        }
      },
      DeletedResponse: {
        type: "object",
        required: ["deleted"],
        properties: { deleted: { type: "boolean", enum: [true] } }
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
        description:
          "Supports canonical accountType registration (HOLDER, VERIFIER, ORGANIZATION) and legacy firstName/lastName requests. ORGANIZATION creates a PENDING organization with ORGANIZATION_ADMIN membership; platform role remains HOLDER. When EMAIL_VERIFICATION_ENABLED, returns PendingEmailVerificationRegistrationResponse (no tokens) until OTP verification succeeds. JSON property names are case-sensitive; hrContact is canonical.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              examples: {
                holder: {
                  summary: "Register Credential Holder",
                  value: {
                    accountType: "HOLDER",
                    fullName: "Jane Holder",
                    email: "jane.holder@example.test",
                    phone: "+256700000000",
                    password: "SecurePassword1!",
                    confirmPassword: "SecurePassword1!",
                    acceptedTerms: true
                  }
                },
                verifier: {
                  summary: "Register Verifier",
                  value: {
                    accountType: "VERIFIER",
                    fullName: "Victor Verifier",
                    email: "victor.verifier@example.test",
                    phone: "+256700000001",
                    password: "SecurePassword1!",
                    confirmPassword: "SecurePassword1!",
                    acceptedTerms: true
                  }
                },
                organization: {
                  summary: "Register Issuing Organization",
                  value: {
                    accountType: "ORGANIZATION",
                    fullName: "Jane Smith",
                    email: "jane@company.com",
                    phone: "+256700000002",
                    password: "SecurePassword1!",
                    confirmPassword: "SecurePassword1!",
                    companyName: "Lumora Solutions",
                    industry: "EDUCATION",
                    hrContact: {
                      fullName: "Mary Human",
                      email: "hr@company.com",
                      phone: "+256711111111"
                    },
                    country: "Uganda",
                    acceptedTerms: true
                  }
                },
                legacy: {
                  summary: "Legacy registration request",
                  value: {
                    email: "legacy@example.test",
                    password: "SecurePassword1!",
                    firstName: "Legacy",
                    lastName: "User",
                    role: "HOLDER"
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description:
              "Account created. Returns AuthSession when verification is disabled or not required; otherwise PendingEmailVerificationRegistrationResponse.",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/AuthSession" },
                    { $ref: "#/components/schemas/PendingEmailVerificationRegistrationResponse" }
                  ]
                },
                examples: {
                  session: {
                    summary: "Immediate session (verification disabled)",
                    value: {
                      user: {
                        id: "clxyz1234567890",
                        email: "jane.holder@example.test",
                        fullName: "Jane Holder",
                        firstName: "Jane",
                        lastName: "Holder",
                        phone: "+256700000000",
                        role: "HOLDER",
                        status: "ACTIVE",
                        emailVerifiedAt: "2026-08-06T10:00:00.000Z",
                        createdAt: "2026-08-06T10:00:00.000Z",
                        updatedAt: "2026-08-06T10:00:00.000Z"
                      },
                      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      refreshToken: "opaque-refresh-token"
                    }
                  },
                  pendingVerification: {
                    summary: "Pending signup email verification",
                    value: {
                      verificationRequired: true,
                      verificationRequestId: "a1b2c3d4e5f6789012345678abcdef01",
                      email: "jane.holder@example.test",
                      maskedEmail: "j***@example.test",
                      expiresInSeconds: 600,
                      resendAvailableInSeconds: 60
                    }
                  }
                }
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
            description:
              "EMAIL_VERIFICATION_REQUIRED when the email belongs to an unverified account (use resend); EMAIL_ALREADY_EXISTS when the email is already verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  emailVerificationRequired: {
                    summary: "Unverified account — use resend",
                    value: {
                      error: {
                        code: "EMAIL_VERIFICATION_REQUIRED",
                        message: "Email verification is required for this account",
                        details: {
                          verificationRequired: true,
                          email: "jane.holder@example.test",
                          maskedEmail: "j***@example.test"
                        }
                      }
                    }
                  },
                  emailAlreadyExists: {
                    summary: "Verified account already exists",
                    value: {
                      error: {
                        code: "EMAIL_ALREADY_EXISTS",
                        message: "An account with this email already exists"
                      }
                    }
                  }
                }
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
          },
          "503": {
            description: "SERVICE_UNAVAILABLE when verification is enabled but email delivery is unavailable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  serviceUnavailable: {
                    summary: "Email delivery unavailable",
                    value: {
                      error: {
                        code: "SERVICE_UNAVAILABLE",
                        message: "Email verification is temporarily unavailable"
                      }
                    }
                  }
                }
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
        description:
          "Login request body is email and password only. UI role cards (Holder / Verifier / Institution) are navigation choices — do not send role. After login, route using user.role and organization memberships from organization APIs. A Holder with Organization Admin membership has user.role HOLDER; organization workspace access is membership-based (see optional organization on register/verify responses and organization membership endpoints).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              examples: {
                holder: {
                  summary: "Holder login",
                  value: {
                    email: "jane.holder@example.test",
                    password: "SecurePassword1!"
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSession" },
                examples: {
                  holder: {
                    summary: "Credential Holder",
                    value: {
                      user: {
                        id: "clholder1234567890",
                        email: "jane.holder@example.test",
                        fullName: "Jane Holder",
                        firstName: "Jane",
                        lastName: "Holder",
                        phone: "+256700000000",
                        role: "HOLDER",
                        status: "ACTIVE",
                        emailVerifiedAt: "2026-08-06T10:00:00.000Z",
                        createdAt: "2026-08-06T09:00:00.000Z",
                        updatedAt: "2026-08-06T10:00:00.000Z"
                      },
                      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      refreshToken: "opaque-refresh-token"
                    }
                  },
                  verifier: {
                    summary: "Verifier",
                    value: {
                      user: {
                        id: "clverifier123456789",
                        email: "victor.verifier@example.test",
                        fullName: "Victor Verifier",
                        firstName: "Victor",
                        lastName: "Verifier",
                        phone: "+256700000001",
                        role: "VERIFIER",
                        status: "ACTIVE",
                        emailVerifiedAt: "2026-08-06T10:00:00.000Z",
                        createdAt: "2026-08-06T09:00:00.000Z",
                        updatedAt: "2026-08-06T10:00:00.000Z"
                      },
                      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      refreshToken: "opaque-refresh-token"
                    }
                  },
                  platformAdmin: {
                    summary: "Platform Admin",
                    value: {
                      user: {
                        id: "cladmin1234567890",
                        email: "admin@example.test",
                        fullName: "Demo PlatformAdmin",
                        firstName: "Demo",
                        lastName: "PlatformAdmin",
                        phone: null,
                        role: "PLATFORM_ADMIN",
                        status: "ACTIVE",
                        emailVerifiedAt: "2026-08-06T10:00:00.000Z",
                        createdAt: "2026-08-06T09:00:00.000Z",
                        updatedAt: "2026-08-06T10:00:00.000Z"
                      },
                      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      refreshToken: "opaque-refresh-token"
                    }
                  },
                  holderOrgAdmin: {
                    summary: "Holder with Organization Admin membership",
                    description:
                      "Platform role remains HOLDER; organization admin access is via memberships (optional organization summary may appear on session responses from register/verify).",
                    value: {
                      user: {
                        id: "clorgadmin123456789",
                        email: "jane@company.com",
                        fullName: "Jane Smith",
                        firstName: "Jane",
                        lastName: "Smith",
                        phone: "+256700000002",
                        role: "HOLDER",
                        status: "ACTIVE",
                        emailVerifiedAt: "2026-08-06T10:00:00.000Z",
                        createdAt: "2026-08-06T09:00:00.000Z",
                        updatedAt: "2026-08-06T10:00:00.000Z"
                      },
                      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      refreshToken: "opaque-refresh-token",
                      organization: {
                        id: "clorg1234567890",
                        name: "Lumora Solutions",
                        industry: "EDUCATION",
                        status: "PENDING",
                        membershipRole: "ORGANIZATION_ADMIN"
                      }
                    }
                  }
                }
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
          "403": {
            description: "EMAIL_NOT_VERIFIED when credentials are valid but signup email is not verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  emailNotVerified: {
                    summary: "Email verification required",
                    value: {
                      error: {
                        code: "EMAIL_NOT_VERIFIED",
                        message: "Email verification is required",
                        details: {
                          verificationRequired: true,
                          email: "jane.holder@example.test",
                          maskedEmail: "j***@example.test"
                        }
                      }
                    }
                  }
                }
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
      },
      patch: {
        summary: "Update authenticated user profile",
        tags: ["Authentication"],
        security: [{ bearerAuth: [] }],
        description: "Role: any authenticated user. Provide fullName, firstName+lastName, and/or phone.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated profile",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MeResponse" } } }
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/auth/me/password": {
      patch: {
        summary: "Change authenticated user password",
        tags: ["Authentication"],
        security: [{ bearerAuth: [] }],
        description: "Role: any authenticated user. Invalidates other refresh sessions after success.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" }
            }
          }
        },
        responses: {
          "204": { description: "Password changed" },
          "400": { description: "Validation error or incorrect current password", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/auth/password-reset/request": {
      post: {
        summary: "Request a password reset OTP",
        tags: ["Authentication"],
        description: "Public, rate-limited. Always returns 202 with a requestId to avoid account enumeration.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetRequest" },
              examples: {
                holder: {
                  summary: "Password reset request",
                  value: { email: "jane.holder@example.test" }
                }
              }
            }
          }
        },
        responses: {
          "202": {
            description: "Reset challenge accepted (email sent when account exists and mail is configured)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PasswordResetRequestResponse" } } }
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/auth/password-reset/verify": {
      post: {
        summary: "Verify password reset OTP",
        tags: ["Authentication"],
        description: "Public, rate-limited. Returns a short-lived resetToken after successful OTP verification.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetVerifyRequest" },
              examples: {
                verify: {
                  summary: "Verify OTP",
                  value: { requestId: "clresetrequest123", otp: "123456" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "OTP verified",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PasswordResetVerifyResponse" } } }
          },
          "400": { description: "Invalid or expired OTP", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "OTP locked or rate limited", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/auth/password-reset/confirm": {
      post: {
        summary: "Confirm password reset with reset token",
        tags: ["Authentication"],
        description: "Public, rate-limited. Consumes the resetToken and sets the new password.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetConfirmRequest" },
              examples: {
                confirm: {
                  summary: "Confirm reset",
                  value: {
                    resetToken: "base64url-reset-token",
                    newPassword: "NewSecurePassword1!"
                  }
                }
              }
            }
          }
        },
        responses: {
          "204": { description: "Password reset complete" },
          "400": { description: "Invalid or expired reset token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/auth/email-verification/verify": {
      post: {
        summary: "Verify signup email with OTP",
        tags: ["Authentication"],
        description:
          "Completes signup email verification (separate from password-reset OTP). Issues AuthSession on success. Use verificationRequestId from register or resend — not password-reset requestId.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
              examples: {
                verify: {
                  summary: "Verify signup OTP",
                  value: {
                    requestId: "a1b2c3d4e5f6789012345678abcdef01",
                    otp: "123456"
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Email verified — session issued",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyEmailResponse" }
              }
            }
          },
          "400": {
            description: "Validation error, OTP_INVALID, or OTP_EXPIRED",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "401": {
            description: "INVALID_CREDENTIALS when the account is suspended",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "OTP_LOCKED or rate limit exceeded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "503": {
            description: "SERVICE_UNAVAILABLE when signup email verification is disabled or unavailable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/auth/email-verification/resend": {
      post: {
        summary: "Resend signup email verification OTP",
        tags: ["Authentication"],
        description:
          "Public, rate-limited. Resends signup verification OTP (not password-reset). Returns a generic 202 response for unknown, verified, or suspended emails to limit enumeration.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResendEmailVerificationRequest" },
              examples: {
                resend: {
                  summary: "Resend verification OTP",
                  value: { email: "jane.holder@example.test" }
                }
              }
            }
          }
        },
        responses: {
          "202": {
            description: "Resend accepted (email sent when an unverified account exists and mail is configured)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResendEmailVerificationResponse" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "429": {
            description: "Rate limit exceeded",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          "503": {
            description: "SERVICE_UNAVAILABLE when verification is enabled but email delivery is unavailable",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/meta/industries": {
      get: {
        summary: "List canonical organization industry options",
        tags: ["Meta"],
        description:
          "Public catalog of approved industry codes and labels for organization registration. Prefer stable codes (e.g. EDUCATION). No OTHER option.",
        responses: {
          "200": {
            description: "Industry catalog",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IndustryListResponse" },
                example: {
                  industries: [
                    { code: "HR_RECRUITMENT", label: "HR & Recruitment" },
                    { code: "BANKING_FINTECH", label: "Banking & FinTech" },
                    { code: "EDUCATION", label: "Education" },
                    { code: "GOVERNMENT_GOVTECH", label: "Government / GovTech" },
                    { code: "LEGAL_SERVICES", label: "Legal Services" },
                    { code: "REAL_ESTATE_PROPTECH", label: "Real Estate / PropTech" },
                    { code: "INSURANCE", label: "Insurance" },
                    { code: "TRANSPORTATION", label: "Transportation" },
                    { code: "PROFESSIONAL_LICENSING", label: "Professional Licensing" },
                    { code: "BACKGROUND_SCREENING", label: "Background Screening" }
                  ]
                }
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
      },

      patch: {
        summary: "Update organization profile",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN. Supports industry and hrContact* fields.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateOrganizationRequest" } } }
        },
        responses: {
          "200": {
            description: "Organization updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["organization"],
                  properties: { organization: { $ref: "#/components/schemas/Organization" } }
                }
              }
            }
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
    "/holder/dashboard": {
      get: {
        summary: "Get the authenticated holder dashboard",
        tags: ["Holder Dashboard"],
        security: [{ bearerAuth: [] }],
        description:
          "Requires platform role HOLDER. Returns dashboard statistics (including pendingVerifications and sharedThisMonth), recent credentials, and recentActivity. Holder identity is taken from the access token; a holder ID must never be supplied by the client. Effective status rules apply: ACTIVE credentials past expiresAt are counted as EXPIRED.",
        responses: {
          "200": {
            description: "Holder dashboard summary",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HolderDashboardResponse" }
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
            description: "Authenticated user is not a HOLDER",
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
    "/holder/activity": {
      get: {
        summary: "List holder activity",
        tags: ["Holder Dashboard"],
        security: [{ bearerAuth: [] }],
        description: "Role: HOLDER. Paginated activity feed derived from credentials, share links, verification events, and verification requests.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["CREDENTIAL_ISSUED", "SHARE_LINK_CREATED", "VERIFICATION_EVENT", "VERIFICATION_REQUEST"]
            }
          },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } }
        ],
        responses: {
          "200": { description: "Paginated activity", content: { "application/json": { schema: { $ref: "#/components/schemas/HolderActivityResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires HOLDER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/holder/verification-requests": {
      get: {
        summary: "List verification requests for the holder",
        tags: ["Holder Dashboard"],
        security: [{ bearerAuth: [] }],
        description: "Role: HOLDER.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated verification requests", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires HOLDER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/holder/documents": {
      get: {
        summary: "List personal documents",
        tags: ["Holder Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: HOLDER. Storage paths and checksums are never returned.",
        responses: {
          "200": { description: "Personal documents", content: { "application/json": { schema: { $ref: "#/components/schemas/PersonalDocumentListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires HOLDER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/holder/documents/upload-url": {
      post: {
        summary: "Create a signed upload URL for a personal document",
        tags: ["Holder Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: HOLDER. Requires storage configuration in production.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PersonalDocumentUploadUrlRequest" } } }
        },
        responses: {
          "201": { description: "Upload URL created", content: { "application/json": { schema: { $ref: "#/components/schemas/PersonalDocumentUploadUrlResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires HOLDER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/holder/documents/{documentId}/complete": {
      post: {
        summary: "Complete personal document upload",
        tags: ["Holder Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: HOLDER.",
        parameters: [{ name: "documentId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Document completed", content: { "application/json": { schema: { $ref: "#/components/schemas/PersonalDocumentResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires HOLDER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Document not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Already uploaded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/holder/documents/{documentId}": {
      delete: {
        summary: "Delete a personal document",
        tags: ["Holder Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: HOLDER.",
        parameters: [{ name: "documentId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/DeletedResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires HOLDER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Document not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/dashboard": {
      get: {
        summary: "Get verifier dashboard",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        responses: {
          "200": { description: "Verifier dashboard", content: { "application/json": { schema: { $ref: "#/components/schemas/VerifierDashboardResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/verifications": {
      post: {
        summary: "Perform an authenticated verification",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER. Supports SHARE_TOKEN, QR, or PUBLIC_ID. Records a VerificationEvent.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateVerificationRequest" } } }
        },
        responses: {
          "200": { description: "Verification result", content: { "application/json": { schema: { $ref: "#/components/schemas/VerifierVerificationResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        summary: "List verifier verification history",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        parameters: [
          { name: "result", in: "query", schema: { $ref: "#/components/schemas/VerificationOutcome" } },
          { name: "method", in: "query", schema: { $ref: "#/components/schemas/VerificationMethod" } },
          { name: "organizationId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": {
            description: "Paginated verifications",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "pagination"],
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/VerificationEventSummary" } },
                    pagination: { $ref: "#/components/schemas/PaginationMetadata" }
                  }
                }
              }
            }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/verifications/{verificationId}": {
      get: {
        summary: "Get a verification event",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        parameters: [{ name: "verificationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Verification detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["verification"],
                  properties: { verification: { $ref: "#/components/schemas/VerificationEventSummary" } }
                }
              }
            }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/saved-organizations": {
      get: {
        summary: "List saved organizations",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        responses: {
          "200": { description: "Saved organizations", content: { "application/json": { schema: { $ref: "#/components/schemas/SavedOrganizationListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      post: {
        summary: "Save a verified organization",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SaveOrganizationRequest" } } }
        },
        responses: {
          "201": { description: "Saved", content: { "application/json": { schema: { $ref: "#/components/schemas/SavedOrganizationResponse" } } } },
          "400": { description: "Organization not verified", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Already saved", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/saved-organizations/{organizationId}": {
      delete: {
        summary: "Remove a saved organization",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Removed", content: { "application/json": { schema: { $ref: "#/components/schemas/DeletedResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Saved organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/verification-requests": {
      post: {
        summary: "Create a verification request",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateVerificationRequestBody" } } }
        },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestResponse" } } } },
          "400": { description: "Validation or organization not verified", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      get: {
        summary: "List verification requests created by the verifier",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/VerificationRequestStatus" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated requests", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/verification-requests/{requestId}": {
      get: {
        summary: "Get a verification request",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Request detail", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/verification-requests/{requestId}/cancel": {
      patch: {
        summary: "Cancel a pending verification request",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER. Only PENDING requests may be cancelled.",
        parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Cancelled", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Request not pending", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/file-verifications/upload-url": {
      post: {
        summary: "Create signed upload URL for file-hash verification",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/FileVerificationUploadUrlRequest" } } }
        },
        responses: {
          "201": { description: "Upload URL created", content: { "application/json": { schema: { $ref: "#/components/schemas/FileVerificationUploadUrlResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/verifier/file-verifications/{uploadId}/complete": {
      post: {
        summary: "Complete file-hash verification",
        tags: ["Verifier"],
        security: [{ bearerAuth: [] }],
        description: "Role: VERIFIER.",
        parameters: [{ name: "uploadId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Verification result", content: { "application/json": { schema: { $ref: "#/components/schemas/VerifierVerificationResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires VERIFIER role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Upload not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Upload already completed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/dashboard": {
      get: {
        summary: "Get organization dashboard",
        tags: ["Organizations"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Organization dashboard", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationDashboardResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/recipients": {
      get: {
        summary: "List organization recipients",
        tags: ["Organization Recipients"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Recipients", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationRecipientListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/recipient-invitations": {
      get: {
        summary: "List recipient invitations",
        tags: ["Organization Recipients"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Invitations", content: { "application/json": { schema: { $ref: "#/components/schemas/RecipientInvitationListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      },
      post: {
        summary: "Invite a credential recipient",
        tags: ["Organization Recipients"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER. Organization must be VERIFIED.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRecipientInvitationRequest" } } }
        },
        responses: {
          "201": { description: "Invitation created", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRecipientInvitationResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient permissions or organization not verified", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Active invitation or recipient already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/recipient-invitations/{invitationId}/revoke": {
      patch: {
        summary: "Revoke a recipient invitation",
        tags: ["Organization Recipients"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "invitationId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["invitation"],
                  properties: { invitation: { $ref: "#/components/schemas/RecipientInvitationSummary" } }
                }
              }
            }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Invitation not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Invitation not revocable", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/recipient-invitations/accept": {
      post: {
        summary: "Accept a recipient invitation",
        tags: ["Organization Recipients"],
        security: [{ bearerAuth: [] }],
        description: "Role: authenticated user whose email matches the invitation. Rate limited. Creates OrganizationRecipient only (not membership).",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AcceptRecipientInvitationRequest" } } }
        },
        responses: {
          "200": { description: "Accepted", content: { "application/json": { schema: { $ref: "#/components/schemas/AcceptRecipientInvitationResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Email mismatch", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Invitation unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Already a recipient", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/verification-requests": {
      get: {
        summary: "List organization verification requests",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/VerificationRequestStatus" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated requests", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/verification-requests/{requestId}": {
      get: {
        summary: "Get an organization verification request",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "requestId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Request detail", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/verification-requests/{requestId}/review": {
      patch: {
        summary: "Review a verification request",
        tags: ["Verification Requests"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "requestId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReviewVerificationRequestBody" } } }
        },
        responses: {
          "200": { description: "Reviewed", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Request not pending", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/registration-documents": {
      get: {
        summary: "List organization registration documents",
        tags: ["Organization Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Documents", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationDocumentListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires ORGANIZATION_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/registration-documents/upload-url": {
      post: {
        summary: "Create registration document upload URL",
        tags: ["Organization Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegistrationDocumentUploadUrlRequest" } } }
        },
        responses: {
          "201": { description: "Upload URL created", content: { "application/json": { schema: { $ref: "#/components/schemas/RegistrationDocumentUploadUrlResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires ORGANIZATION_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Organization not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/registration-documents/{documentId}/complete": {
      post: {
        summary: "Complete registration document upload",
        tags: ["Organization Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Document completed", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationDocumentResponse" } } } },
          "400": { description: "Upload incomplete", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires ORGANIZATION_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Document not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Already uploaded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/registration-documents/{documentId}": {
      delete: {
        summary: "Delete a registration document",
        tags: ["Organization Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/DeletedResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires ORGANIZATION_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Document not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/organizations/{organizationId}/registration-documents": {
      get: {
        summary: "Admin list organization registration documents",
        tags: ["Organization Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [{ name: "organizationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Documents", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationDocumentListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/organizations/{organizationId}/registration-documents/{documentId}/review": {
      patch: {
        summary: "Admin review a registration document",
        tags: ["Organization Documents"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ReviewRegistrationDocumentRequest" } } }
        },
        responses: {
          "200": { description: "Reviewed", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationDocumentResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Document not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Document not reviewable", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/credentials/{credentialId}/artifacts": {
      get: {
        summary: "List credential artifacts",
        tags: ["Credential Artifacts"],
        security: [{ bearerAuth: [] }],
        description: "Role: credential holder or organization issuer/admin. Returns completed artifacts with signed download URLs.",
        parameters: [{ name: "credentialId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Artifacts", content: { "application/json": { schema: { $ref: "#/components/schemas/CredentialArtifactListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient access", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/credentials/{credentialId}/artifacts/upload-url": {
      post: {
        summary: "Create credential artifact upload URL",
        tags: ["Credential Artifacts"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "credentialId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CredentialArtifactUploadUrlRequest" } } }
        },
        responses: {
          "201": { description: "Upload URL created", content: { "application/json": { schema: { $ref: "#/components/schemas/CredentialArtifactUploadUrlResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Credential not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/organizations/{organizationId}/credentials/{credentialId}/artifacts/{artifactId}/complete": {
      post: {
        summary: "Complete credential artifact upload",
        tags: ["Credential Artifacts"],
        security: [{ bearerAuth: [] }],
        description: "Role: ORGANIZATION_ADMIN or ORGANIZATION_ISSUER.",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "credentialId", in: "path", required: true, schema: { type: "string" } },
          { name: "artifactId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Artifact completed", content: { "application/json": { schema: { $ref: "#/components/schemas/CredentialArtifactResponse" } } } },
          "400": { description: "Upload incomplete", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Insufficient organization permissions", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Artifact not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Already completed or checksum exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/dashboard": {
      get: {
        summary: "Get platform admin dashboard",
        tags: ["Platform Admin"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN. stats.documents is the issued credentials count.",
        responses: {
          "200": { description: "Admin dashboard", content: { "application/json": { schema: { $ref: "#/components/schemas/AdminDashboardResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/users": {
      get: {
        summary: "List platform users",
        tags: ["Platform Admin"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [
          { name: "role", in: "query", schema: { type: "string", enum: ["HOLDER", "VERIFIER", "PLATFORM_ADMIN"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "SUSPENDED"] } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated users", content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUserListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/users/{userId}": {
      get: {
        summary: "Get a platform user",
        tags: ["Platform Admin"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "User", content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUserResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/users/{userId}/status": {
      patch: {
        summary: "Suspend or reinstate a user",
        tags: ["Platform Admin"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUserStatusRequest" } } }
        },
        responses: {
          "200": { description: "Updated user", content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUserResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Status unchanged or self-action forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/verifications": {
      get: {
        summary: "Monitor verification events",
        tags: ["Platform Admin"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [
          { name: "result", in: "query", schema: { $ref: "#/components/schemas/VerificationOutcome" } },
          { name: "method", in: "query", schema: { $ref: "#/components/schemas/VerificationMethod" } },
          { name: "organizationId", in: "query", schema: { type: "string" } },
          { name: "verifierId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": {
            description: "Paginated verification events",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "pagination"],
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/VerificationEventSummary" } },
                    pagination: { $ref: "#/components/schemas/PaginationMetadata" }
                  }
                }
              }
            }
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/verification-requests": {
      get: {
        summary: "Monitor verification requests",
        tags: ["Platform Admin"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/VerificationRequestStatus" } },
          { name: "organizationId", in: "query", schema: { type: "string" } },
          { name: "holderId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated verification requests", content: { "application/json": { schema: { $ref: "#/components/schemas/VerificationRequestListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/fraud-alerts": {
      get: {
        summary: "List fraud alerts",
        tags: ["Fraud Alerts"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/FraudAlertStatus" } },
          { name: "type", in: "query", schema: { $ref: "#/components/schemas/FraudAlertType" } },
          { name: "severity", in: "query", schema: { $ref: "#/components/schemas/FraudAlertSeverity" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Paginated fraud alerts", content: { "application/json": { schema: { $ref: "#/components/schemas/FraudAlertListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/fraud-alerts/{alertId}": {
      get: {
        summary: "Get a fraud alert",
        tags: ["Fraud Alerts"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [{ name: "alertId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Fraud alert", content: { "application/json": { schema: { $ref: "#/components/schemas/FraudAlert" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/fraud-alerts/{alertId}/status": {
      patch: {
        summary: "Update fraud alert status",
        tags: ["Fraud Alerts"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN.",
        parameters: [{ name: "alertId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/FraudAlertStatusRequest" } } }
        },
        responses: {
          "200": { description: "Updated alert", content: { "application/json": { schema: { $ref: "#/components/schemas/FraudAlert" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Status unchanged", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/reports/summary": {
      get: {
        summary: "Get admin reports summary",
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN. documentsIssued is issued credentials in range.",
        parameters: [
          { name: "from", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", required: true, schema: { type: "string", format: "date-time" } }
        ],
        responses: {
          "200": { description: "Report summary", content: { "application/json": { schema: { $ref: "#/components/schemas/ReportSummary" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/admin/reports/export": {
      get: {
        summary: "Export admin reports as CSV",
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        description: "Role: PLATFORM_ADMIN. Rate limited. Returns text/csv.",
        parameters: [
          { name: "from", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "format", in: "query", schema: { type: "string", enum: ["csv"], default: "csv" } }
        ],
        responses: {
          "200": {
            description: "CSV export",
            content: {
              "text/csv": { schema: { type: "string" } }
            }
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "403": { description: "Requires PLATFORM_ADMIN", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "Export rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/notifications": {
      get: {
        summary: "List notifications for the authenticated user",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        description: "Role: any authenticated user.",
        parameters: [
          { name: "unreadOnly", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "Notifications", content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationListResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/notifications/read-all": {
      patch: {
        summary: "Mark all notifications as read",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        description: "Role: any authenticated user.",
        responses: {
          "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/MarkAllNotificationsReadResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
    "/notifications/{notificationId}/read": {
      patch: {
        summary: "Mark a notification as read",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        description: "Role: any authenticated user (own notifications only).",
        parameters: [{ name: "notificationId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Updated notification", content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationResponse" } } } },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Notification not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
