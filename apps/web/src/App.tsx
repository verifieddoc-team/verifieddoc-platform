import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AdminOrganization,
  AuthSession,
  CredentialStatus,
  HolderDashboardResponse,
  HolderCredentialSummary,
  InvitationSummary,
  Organization,
  OrganizationMemberProfile,
  OrganizationMembershipView,
  PublicVerificationResponse,
  SafeAuditLogEntry,
  SafeCredential,
  ShareLinkSummary,
} from "@verifieddoc/contracts";
import { api, ApiError } from "./lib/api";
import {
  demoAuditLogs,
  demoCredentials,
  demoInvitations,
  demoMembers,
  demoOrganization,
  demoPendingOrganizations,
  demoShareLinks,
  verifyDemoToken,
} from "./lib/demo";
import {
  DemoRole,
  formatDate,
  hasOrganizationWorkspaceAccess,
  navigate,
  routeForPlatformRole,
  routeForRole,
} from "./lib/navigation";

const demoMode = import.meta.env.VITE_DEMO_MODE !== "false";

type Notice = { message: string; tone: "success" | "warning" | "info" };

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return path;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={compact ? "brand brand-compact" : "brand"}
      type="button"
      onClick={() => navigate("/")}
      aria-label="VerifiedDoc home"
    >
      <span className="brand-shield" aria-hidden="true">
        <span>✓</span>
      </span>
      <span>VerifiedDoc</span>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: CredentialStatus | Organization["status"] | string;
}) {
  const tone = ["ACTIVE", "VERIFIED", "VALID", "ACCEPTED"].includes(status)
    ? "good"
    : ["PENDING", "EXPIRED"].includes(status)
      ? "pending"
      : "danger";
  return <span className={`status-badge status-${tone}`}>{status}</span>;
}

function PublicHeader({
  onDemo,
}: {
  onDemo: (role: DemoRole) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <Brand />
      <button
        className="mobile-menu"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
        <i className="sr-only">Toggle navigation</i>
      </button>
      <nav className={open ? "public-nav public-nav-open" : "public-nav"}>
        <a href="#audiences" onClick={() => setOpen(false)}>Who it serves</a>
        <a href="#workflow" onClick={() => setOpen(false)}>How it works</a>
        <a href="#security" onClick={() => setOpen(false)}>Security</a>
      </nav>
      <div className="header-actions">
        <button className="text-button" type="button" onClick={() => navigate("/auth")}>
          Sign in
        </button>
        <button className="small-primary" type="button" onClick={() => onDemo("HOLDER")}>
          Open demo
        </button>
      </div>
    </header>
  );
}

function LandingPage({ onDemo }: { onDemo: (role: DemoRole) => void }) {
  const [token, setToken] = useState("");
  const [verification, setVerification] =
    useState<PublicVerificationResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  function verify(event: FormEvent) {
    event.preventDefault();
    const result = verifyDemoToken(token);
    setVerification(result);
    setUnavailable(!result);
  }

  function useDemoToken() {
    setToken("DEMO-VERIFIED-2026");
    setVerification(verifyDemoToken("DEMO-VERIFIED-2026"));
    setUnavailable(false);
    window.setTimeout(
      () =>
        document
          .getElementById("verify")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      20,
    );
  }

  return (
    <div className="public-page">
      <PublicHeader onDemo={onDemo} />
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span />Issuer-backed credentials</p>
          <h1>Trust the record.<br />Not the résumé.</h1>
          <p className="hero-lead">
            Confirm qualifications directly with the organizations that issued
            them. Fast, consent-based, and built for confident decisions.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#verify">Verify a credential</a>
            <button className="secondary-button" type="button" onClick={useDemoToken}>
              Explore the demo
            </button>
          </div>
          <div className="assurances">
            <span>✓ Holder consent</span>
            <span>✓ Issuer confirmed</span>
            <span>✓ Audit ready</span>
          </div>
        </div>

        <div className="hero-card-stage" aria-label="Example verified credential">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <article className="trust-card">
            <div className="trust-card-head">
              <div><p>Live verification</p><h2>Credential record</h2></div>
              <StatusBadge status="VERIFIED" />
            </div>
            <dl className="trust-fields">
              <div><dt><i>A</i>Credential</dt><dd>Backend Engineering Certificate</dd></div>
              <div><dt><i>N</i>Issuer</dt><dd>Northwind Training Institute</dd></div>
              <div><dt><i>24</i>Issued</dt><dd>18 July 2026</dd></div>
            </dl>
            <div className="trust-confirmation">
              <span>✓</span>
              <div><strong>Issuer record confirmed</strong><small>Active and available for verification</small></div>
            </div>
          </article>
          <div className="public-id-chip">
            <small>Public credential ID</small><strong>VD-7K4P-92AX</strong>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        {[
          ["Structured", "Issuer-owned records"],
          ["Consent-based", "Holder-approved sharing"],
          ["Current", "Live expiry and revocation"],
          ["Accountable", "Auditable actions"],
        ].map(([title, copy]) => (
          <div key={title}><strong>{title}</strong><span>{copy}</span></div>
        ))}
      </section>

      <section className="public-section audience-section" id="audiences">
        <div className="section-title-grid">
          <p className="section-label">One record. Three experiences.</p>
          <h2>Built for the people who issue, hold, and verify credentials.</h2>
        </div>
        <div className="audience-grid">
          {[
            ["01", "Credential holders", "Keep qualifications in one wallet. Share only the details you approve.", "HOLDER" as DemoRole],
            ["02", "Issuing organizations", "Issue structured records, manage trusted staff, and revoke invalid credentials.", "ORGANIZATION_ADMIN" as DemoRole],
            ["03", "Employers and verifiers", "Confirm record status at the source before making an independent decision.", "VERIFIER" as DemoRole],
          ].map(([number, title, copy, role]) => (
            <article className="audience-card" key={String(number)}>
              <span>{String(number)}</span>
              <h3>{String(title)}</h3>
              <p>{String(copy)}</p>
              <button type="button" onClick={() => onDemo(role as DemoRole)}>
                Explore this workspace <i>→</i>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="workflow-inner">
          <div>
            <p className="section-label label-light">How VerifiedDoc works</p>
            <h2>A direct path from trusted issuer to informed verifier.</h2>
            <p className="workflow-copy">
              VerifiedDoc confirms what the issuing organization recorded. The
              employer always keeps responsibility for the final decision.
            </p>
          </div>
          <ol>
            {[
              ["Organization approval", "Only approved organizations can issue trusted credentials."],
              ["Secure issuance", "An authorized issuer creates a structured record for the correct holder."],
              ["Holder consent", "The holder chooses what to disclose and creates a limited link."],
              ["Source confirmation", "The verifier checks the current issuer-backed record."],
            ].map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="public-section public-verify" id="verify">
        <div className="verify-copy">
          <p className="section-label">Public verification</p>
          <h2>Check a shared credential in seconds.</h2>
          <p>
            Enter a holder-approved token. For the fictional capstone demo,
            use <button type="button" onClick={useDemoToken}>DEMO-VERIFIED-2026</button>.
          </p>
          <form onSubmit={verify}>
            <label htmlFor="public-token">Verification token</label>
            <div className="inline-form">
              <input
                id="public-token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Enter verification token"
                autoComplete="off"
              />
              <button type="submit">Verify now</button>
            </div>
          </form>
          <small>Only holder-approved information is disclosed.</small>
        </div>
        <VerificationResult
          result={verification}
          unavailable={unavailable}
          onDemo={useDemoToken}
        />
      </section>

      <section className="security-section" id="security">
        <div>
          <p className="section-label">Trust by design</p>
          <h2>Privacy is part of the credential.</h2>
        </div>
        <div className="security-list">
          {[
            ["01", "Minimum disclosure", "Holders choose which claims, name, and reference number to reveal."],
            ["02", "Limited access", "Links can expire, be revoked, or stop after a fixed number of views."],
            ["03", "Safe failure", "Unavailable links return a generic result without revealing why."],
            ["04", "Accountability", "Issuance, revocation, membership, and review actions are audited."],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="role-demo-section">
        <p className="section-label label-light">Complete product demonstration</p>
        <h2>Review every role without using real data.</h2>
        <div className="role-buttons">
          <button type="button" onClick={() => onDemo("HOLDER")}>Holder wallet</button>
          <button type="button" onClick={() => onDemo("ORGANIZATION_ADMIN")}>Organization operations</button>
          <button type="button" onClick={() => onDemo("VERIFIER")}>Verifier workspace</button>
          <button type="button" onClick={() => onDemo("PLATFORM_ADMIN")}>Platform administration</button>
        </div>
      </section>

      <footer className="public-footer">
        <Brand compact />
        <p>Employer and organization credential verification.</p>
        <p>Fictional demonstration data only.</p>
      </footer>
    </div>
  );
}

function VerificationResult({
  result,
  unavailable,
  onDemo,
}: {
  result: PublicVerificationResponse | null;
  unavailable: boolean;
  onDemo: () => void;
}) {
  if (result) {
    const credential = result.credential;
    return (
      <article className="verification-card">
        <div className="verification-card-head">
          <span>✓</span>
          <div><small>Verification result</small><h3>Credential verified</h3></div>
        </div>
        <dl>
          <div><dt>Credential</dt><dd>{credential.title}</dd></div>
          <div><dt>Issuer</dt><dd>{credential.organization.name}</dd></div>
          <div><dt>Status</dt><dd><StatusBadge status={credential.effectiveStatus} /></dd></div>
          <div><dt>Issued</dt><dd>{formatDate(credential.issuedAt)}</dd></div>
          {credential.holderName && <div><dt>Holder</dt><dd>{credential.holderName}</dd></div>}
        </dl>
        {credential.claims && (
          <div className="claim-pills">
            {Object.entries(credential.claims).map(([key, value]) => (
              <span key={key}><small>{key}</small><strong>{String(value)}</strong></span>
            ))}
          </div>
        )}
        <div className="verification-footer">
          <span>✓ Organization approved</span><span>✓ Record active</span>
        </div>
      </article>
    );
  }

  return (
    <div className={unavailable ? "verify-placeholder verify-unavailable" : "verify-placeholder"}>
      <span>{unavailable ? "!" : "✓"}</span>
      <h3>{unavailable ? "Verification unavailable" : "Ready to verify"}</h3>
      <p>
        {unavailable
          ? "The link may be invalid, expired, revoked, or fully used. No additional detail is exposed."
          : "Enter a holder-approved token to check the credential's current status."}
      </p>
      {unavailable && <button type="button" onClick={onDemo}>Use demo token</button>}
    </div>
  );
}

function AuthPage({
  onSession,
  onDemo,
}: {
  onSession: (session: AuthSession) => void;
  onDemo: (role: DemoRole) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const session =
        mode === "login"
          ? await api.login(String(form.get("email")), String(form.get("password")))
          : await api.register({
              email: String(form.get("email")),
              password: String(form.get("password")),
              firstName: String(form.get("firstName")),
              lastName: String(form.get("lastName")),
              role: String(form.get("role")) as "HOLDER" | "VERIFIER",
            });
      onSession(session);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The API is unavailable. You can still use a fictional demo workspace.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand"><Brand /><button type="button" onClick={() => navigate("/")}>Back to home</button></div>
      <div className="auth-layout">
        <section className="auth-story">
          <p className="eyebrow"><span />VerifiedDoc access</p>
          <h1>Your credentials stay connected to their source.</h1>
          <p>
            Sign in to manage a holder wallet, issue credentials through an
            approved organization, or administer the platform.
          </p>
          <div className="auth-trust">
            <span>✓ Short-lived access tokens</span>
            <span>✓ Rotating refresh tokens</span>
            <span>✓ Role-based authorization</span>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Sign in</button>
            <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Create account</button>
          </div>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p>{mode === "login" ? "Use your VerifiedDoc credentials." : "Register as a holder or verifier."}</p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <div className="field-row">
                <label>First name<input name="firstName" required /></label>
                <label>Last name<input name="lastName" required /></label>
              </div>
            )}
            <label>Email address<input type="email" name="email" required /></label>
            <label>Password<input type="password" name="password" minLength={8} required /></label>
            {mode === "register" && (
              <label>Account type
                <select name="role" defaultValue="HOLDER">
                  <option value="HOLDER">Credential holder</option>
                  <option value="VERIFIER">Employer or verifier</option>
                </select>
              </label>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button full-button" type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          {demoMode && (
            <div className="demo-access">
              <p>Or enter a fictional workspace instantly</p>
              <div>
                <button type="button" onClick={() => onDemo("HOLDER")}>Holder</button>
                <button type="button" onClick={() => onDemo("ORGANIZATION_ADMIN")}>Organization</button>
                <button type="button" onClick={() => onDemo("PLATFORM_ADMIN")}>Admin</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type WorkspaceNavItem = {
  id: string;
  label: string;
  icon: string;
};

function AppShell({
  roleLabel,
  name,
  email,
  items,
  active,
  onActive,
  onExit,
  children,
  workspaceSwitch,
}: {
  roleLabel: string;
  name: string;
  email: string;
  items: WorkspaceNavItem[];
  active: string;
  onActive: (id: string) => void;
  onExit: () => void;
  children: ReactNode;
  workspaceSwitch?: { label: string; onClick: () => void };
}) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="app-frame">
      <aside className={navOpen ? "app-sidebar sidebar-open" : "app-sidebar"}>
        <Brand compact />
        <div className="workspace-role">
          <span>{demoMode ? "Demo workspace" : "Live workspace"}</span>
          <strong>{roleLabel}</strong>
        </div>
        <nav aria-label={`${roleLabel} navigation`}>
          {items.map((item) => (
            <button
              className={active === item.id ? "active" : ""}
              type="button"
              key={item.id}
              onClick={() => {
                onActive(item.id);
                setNavOpen(false);
              }}
            >
              <i aria-hidden="true">{item.icon}</i>{item.label}
            </button>
          ))}
        </nav>
        {workspaceSwitch && (
          <button className="sidebar-exit" type="button" onClick={workspaceSwitch.onClick}>
            {workspaceSwitch.label}
          </button>
        )}
        <button className="sidebar-exit" type="button" onClick={onExit}>← Exit workspace</button>
        <div className="sidebar-user">
          <span>{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
          <div><strong>{name}</strong><small>{email}</small></div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button className="sidebar-toggle" type="button" onClick={() => setNavOpen((value) => !value)}>☰ <span className="sr-only">Toggle workspace navigation</span></button>
          <div>
            <span className="demo-dot" />
            {demoMode ? "Fictional demo data" : "API-backed session"}
          </div>
          <button type="button" onClick={onExit}>Sign out</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <header className="workspace-page-header">
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>
      {action}
    </header>
  );
}

function MetricCard({ label, value, note, tone = "navy" }: { label: string; value: string | number; note: string; tone?: string }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <p>{label}</p><strong>{value}</strong><span>{note}</span>
    </article>
  );
}

function HolderWorkspace({
  onExit,
  session,
  canOpenOrganization,
}: {
  onExit: () => void;
  session: AuthSession | null;
  canOpenOrganization: boolean;
}) {
  const live = !demoMode && Boolean(session);
  const [active, setActive] = useState("wallet");
  const [wallet, setWallet] = useState<HolderCredentialSummary[]>(
    demoCredentials.map((credential) => ({
      id: credential.id,
      publicId: credential.publicId,
      title: credential.title,
      credentialType: credential.credentialType,
      claims: credential.claims,
      organization: {
        name: credential.organization.name,
        slug: credential.organization.slug,
      },
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
      status: credential.status,
      effectiveStatus: credential.effectiveStatus,
    })),
  );
  const [selected, setSelected] = useState<SafeCredential | null>(demoCredentials[0]!);
  const [dashboard, setDashboard] = useState<HolderDashboardResponse | null>(null);
  const [shareLinks, setShareLinks] = useState(demoShareLinks);
  const [rawShareUrl, setRawShareUrl] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!live || !session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [dashboardResponse, walletResponse] = await Promise.all([
          api.getHolderDashboard(session.accessToken),
          api.listWallet(session.accessToken),
        ]);
        if (cancelled) return;
        setDashboard(dashboardResponse);
        setWallet(walletResponse.data);
        if (walletResponse.data[0]) {
          const detail = await api.getCredential(
            session.accessToken,
            walletResponse.data[0].id,
          );
          if (!cancelled) setSelected(detail.credential);
        } else {
          setSelected(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setNotice({
            tone: "warning",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Unable to load holder dashboard from the API.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, session]);

  useEffect(() => {
    if (!live || !session || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await api.listShareLinks(session.accessToken, selected.id);
        if (!cancelled) setShareLinks(response.data);
      } catch {
        if (!cancelled) setShareLinks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, session, selected?.id]);

  async function openCredential(credentialId: string) {
    if (!live || !session) {
      const demo = demoCredentials.find((item) => item.id === credentialId);
      if (demo) {
        setSelected(demo);
        setActive("details");
      }
      return;
    }
    try {
      const detail = await api.getCredential(session.accessToken, credentialId);
      setSelected(detail.credential);
      setActive("details");
    } catch (caught) {
      setNotice({
        tone: "warning",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Unable to load credential detail.",
      });
    }
  }

  async function createShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const expiresInHours = Number(form.get("expiresInHours") || 72);
    const maxViews = Number(form.get("maxViews") || 10);
    const includeHolderName = Boolean(form.get("includeHolderName"));
    const includeReferenceNo = Boolean(form.get("includeReferenceNo"));
    const disclosedClaims = Object.keys(selected.claims ?? {}).filter((claim) =>
      Boolean(form.get(`claim_${claim}`)),
    );

    if (!live || !session) {
      const created: ShareLinkSummary = {
        id: `share_demo_${Date.now()}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
        revokedAt: null,
        maxViews,
        viewCount: 0,
        lastViewedAt: null,
        disclosedClaims,
        includeHolderName,
        includeReferenceNo,
        state: "ACTIVE",
        verificationUrl:
          "https://verifieddoc.example.test/verify/DEMO-VERIFIED-2026",
      };
      setShareLinks((current) => [created, ...current]);
      setRawShareUrl(created.verificationUrl!);
      setNotice({ tone: "success", message: "Share link created. The raw token is shown once." });
      return;
    }

    try {
      const created = await api.createShareLink(session.accessToken, selected.id, {
        expiresInHours,
        maxViews,
        disclosedClaims,
        includeHolderName,
        includeReferenceNo,
      });
      setShareLinks((current) => [created.shareLink, ...current]);
      setRawShareUrl(created.verificationUrl);
      setNotice({ tone: "success", message: "Share link created. The raw token is shown once." });
    } catch (caught) {
      setNotice({
        tone: "warning",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Unable to create share link.",
      });
    }
  }

  async function revokeShare(id: string) {
    if (!selected) return;
    if (!live || !session) {
      setShareLinks((links) =>
        links.map((link) =>
          link.id === id
            ? { ...link, state: "REVOKED", revokedAt: new Date().toISOString() }
            : link,
        ),
      );
      setNotice({ tone: "info", message: "Share link revoked." });
      return;
    }
    try {
      const response = await api.revokeShareLink(
        session.accessToken,
        selected.id,
        id,
      );
      setShareLinks((links) =>
        links.map((link) => (link.id === id ? response.shareLink : link)),
      );
      setNotice({ tone: "info", message: "Share link revoked." });
    } catch (caught) {
      setNotice({
        tone: "warning",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Unable to revoke share link.",
      });
    }
  }

  const items = [
    { id: "wallet", label: "Credential wallet", icon: "▣" },
    { id: "details", label: "Credential details", icon: "◇" },
    { id: "sharing", label: "Consent sharing", icon: "↗" },
    { id: "profile", label: "Profile", icon: "○" },
  ];

  const profile = live && session
    ? session.user
    : {
        firstName: "Amara",
        lastName: "N.",
        email: "demo.holder@example.test",
        role: "HOLDER" as const,
      };

  // Live mode waits for GET /holder/dashboard — never invent zeros for missing fields.
  const liveStats = live ? dashboard?.stats ?? null : null;
  const demoStats = {
    total: wallet.length,
    active: 1,
    expired: 1,
    revoked: 1,
  };

  return (
    <AppShell
      roleLabel="Credential holder"
      name={`${profile.firstName} ${profile.lastName}`}
      email={profile.email}
      items={items}
      active={active}
      onActive={setActive}
      onExit={onExit}
      workspaceSwitch={
        canOpenOrganization
          ? {
              label: "Open organization workspace →",
              onClick: () => navigate("/app/organization"),
            }
          : undefined
      }
    >
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {active === "wallet" && (
          <>
            <PageHeader eyebrow="Holder workspace" title="Your credential wallet" copy="Every record remains connected to its issuing organization." />
            <div className="metric-grid">
              <MetricCard
                label="Total Credentials"
                value={live ? (liveStats?.total ?? "—") : demoStats.total}
                note={live ? "stats.total from GET /holder/dashboard" : "Across all issuing organizations"}
              />
              <MetricCard
                label="Active Credentials"
                value={live ? (liveStats?.active ?? "—") : demoStats.active}
                note="Ready for consent sharing"
                tone="green"
              />
              <MetricCard
                label="Expired Credentials"
                value={live ? (liveStats?.expired ?? "—") : demoStats.expired}
                note="Kept for your record"
                tone="gold"
              />
              <MetricCard
                label="Revoked Credentials"
                value={live ? (liveStats?.revoked ?? "—") : demoStats.revoked}
                note="Issuer status preserved"
                tone="red"
              />
            </div>
            {live && (
              <div className="content-card">
                <div className="card-title-row">
                  <div>
                    <p>Recent Credentials</p>
                    <h2>From holder dashboard</h2>
                  </div>
                  <span>
                    {loading ? "Loading…" : "recentCredentials from GET /holder/dashboard"}
                  </span>
                </div>
                <div className="credential-grid">
                  {(dashboard?.recentCredentials ?? []).map((credential) => (
                    <button
                      type="button"
                      className="wallet-card"
                      key={`recent-${credential.id}`}
                      onClick={() => {
                        void openCredential(credential.id);
                      }}
                    >
                      <div className="wallet-card-top"><span className="credential-symbol">VD</span><StatusBadge status={credential.effectiveStatus} /></div>
                      <small>{credential.credentialType.replaceAll("_", " ")}</small>
                      <h3>{credential.title}</h3>
                      <p>{credential.organization.name}</p>
                      <div><span>Issued {formatDate(credential.issuedAt)}</span><strong>View record →</strong></div>
                    </button>
                  ))}
                  {!loading && !(dashboard?.recentCredentials?.length) && (
                    <p>No recent credentials to show.</p>
                  )}
                </div>
              </div>
            )}
            <div className="content-card">
              <div className="card-title-row"><div><p>Credential records</p><h2>Your wallet</h2></div><span>{loading ? "Loading…" : live ? "GET /credentials" : "Updated from issuer records"}</span></div>
              <div className="credential-grid">
                {wallet.map((credential) => (
                  <button
                    type="button"
                    className="wallet-card"
                    key={credential.id}
                    onClick={() => {
                      void openCredential(credential.id);
                    }}
                  >
                    <div className="wallet-card-top"><span className="credential-symbol">VD</span><StatusBadge status={credential.effectiveStatus} /></div>
                    <small>{credential.credentialType.replaceAll("_", " ")}</small>
                    <h3>{credential.title}</h3>
                    <p>{credential.organization.name}</p>
                    <div><span>Issued {formatDate(credential.issuedAt)}</span><strong>View record →</strong></div>
                  </button>
                ))}
                {!loading && wallet.length === 0 && (
                  <p>No credentials in this wallet yet.</p>
                )}
              </div>
            </div>
          </>
        )}

        {active === "details" && selected && (
          <>
            <PageHeader
              eyebrow="Credential detail"
              title={selected.title}
              copy="Authenticated record details from the issuing organization."
              action={
                selected.effectiveStatus === "ACTIVE" ? (
                  <button className="workspace-primary" type="button" onClick={() => setActive("sharing")}>Create share link</button>
                ) : undefined
              }
            />
            <div className="detail-layout">
              <article className="credential-document">
                <div className="document-ribbon"><StatusBadge status={selected.effectiveStatus} /><span>Public ID {selected.publicId}</span></div>
                <p className="document-label">Verified credential</p>
                <h2>{selected.title}</h2>
                <p>{selected.description}</p>
                <div className="document-issuer"><span>N</span><div><small>Issued by</small><strong>{selected.organization.name}</strong></div></div>
                <dl>
                  <div><dt>Reference number</dt><dd>{selected.referenceNo}</dd></div>
                  <div><dt>Issued</dt><dd>{formatDate(selected.issuedAt)}</dd></div>
                  <div><dt>Expires</dt><dd>{formatDate(selected.expiresAt)}</dd></div>
                  <div><dt>Credential type</dt><dd>{selected.credentialType.replaceAll("_", " ")}</dd></div>
                </dl>
              </article>
              <aside className="detail-side">
                <div className="content-card compact-card">
                  <p className="card-label">Claims</p>
                  {selected.claims ? Object.entries(selected.claims).map(([key, value]) => (
                    <div className="detail-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>
                  )) : <p>No structured claims.</p>}
                </div>
                <div className="content-card compact-card">
                  <p className="card-label">Record integrity</p>
                  <div className="integrity-item">✓ Issuer organization approved</div>
                  <div className="integrity-item">✓ Current lifecycle status shown</div>
                  <div className="integrity-item">✓ Sensitive actions audited</div>
                </div>
              </aside>
            </div>
          </>
        )}

        {active === "details" && !selected && (
          <PageHeader eyebrow="Credential detail" title="No credential selected" copy="Open a record from your wallet." />
        )}

        {active === "sharing" && selected && (
          <>
            <PageHeader eyebrow="Consent sharing" title="Share this credential safely" copy="You decide what the verifier can see and how long access lasts." />
            <div className="two-column-form">
              <form className="content-card form-card" onSubmit={(event) => { void createShare(event); }}>
                <div><p className="card-label">New share link</p><h2>{selected.title}</h2></div>
                <label>Link duration
                  <select name="expiresInHours" defaultValue="72">
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </select>
                </label>
                <label>Maximum views<input name="maxViews" type="number" min="1" max="100" defaultValue="10" /></label>
                <fieldset>
                  <legend>Identity disclosure</legend>
                  <label className="check-field"><input name="includeHolderName" type="checkbox" defaultChecked /> Include holder name</label>
                  <label className="check-field"><input name="includeReferenceNo" type="checkbox" /> Include reference number</label>
                </fieldset>
                <fieldset>
                  <legend>Claims to disclose</legend>
                  {Object.keys(selected.claims ?? {}).map((claim) => (
                    <label className="check-field" key={claim}><input name={`claim_${claim}`} type="checkbox" defaultChecked /> {claim}</label>
                  ))}
                </fieldset>
                <button className="workspace-primary" type="submit">Create secure link</button>
                {rawShareUrl && (
                  <div className="one-time-token">
                    <strong>Copy this URL now</strong>
                    <code>{rawShareUrl}</code>
                    <small>The raw token is returned only once.</small>
                  </div>
                )}
              </form>
              <div className="content-card">
                <div className="card-title-row"><div><p>Existing links</p><h2>Access history</h2></div></div>
                <div className="stack-list">
                  {shareLinks.map((link) => (
                    <article className="share-row" key={link.id}>
                      <div><StatusBadge status={link.state} /><h3>{formatDate(link.createdAt)}</h3><p>{link.viewCount} of {link.maxViews ?? "unlimited"} views used. Expires {formatDate(link.expiresAt)}.</p></div>
                      {link.state === "ACTIVE" && <button type="button" onClick={() => { void revokeShare(link.id); }}>Revoke</button>}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {active === "profile" && (
          <>
            <PageHeader eyebrow="Account" title="Profile information" copy="Only basic account fields are shown. Credential sharing remains separate." />
            <form className="content-card form-card narrow-card" onSubmit={(event) => { event.preventDefault(); setNotice({ tone: "success", message: live ? "Profile fields are managed by the account API." : "Demo profile updated." }); }}>
              <div className="field-row"><label>First name<input defaultValue={profile.firstName} readOnly={live} /></label><label>Last name<input defaultValue={profile.lastName} readOnly={live} /></label></div>
              <label>Email address<input value={profile.email} readOnly /></label>
              <label>Platform role<input value={profile.role} readOnly /></label>
              <button className="workspace-primary" type="submit">Save profile</button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}

function OrganizationWorkspace({
  onExit,
  session,
  canOpenHolder,
}: {
  onExit: () => void;
  session: AuthSession | null;
  canOpenHolder: boolean;
}) {
  const live = !demoMode && Boolean(session);
  const [active, setActive] = useState("overview");
  const [membership, setMembership] = useState<OrganizationMembershipView | null>(null);
  const [credentials, setCredentials] = useState<SafeCredential[]>(demoCredentials);
  const [members, setMembers] = useState<OrganizationMemberProfile[]>(demoMembers);
  const [invitations, setInvitations] = useState<InvitationSummary[]>(demoInvitations);
  const [auditLogs, setAuditLogs] = useState<SafeAuditLogEntry[]>(demoAuditLogs);
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "credentials", label: "Credentials", icon: "▣" },
    { id: "issue", label: "Issue credential", icon: "+" },
    { id: "members", label: "Members", icon: "◎" },
    { id: "invitations", label: "Invitations", icon: "↗" },
    { id: "audit", label: "Audit logs", icon: "≡" },
  ];

  useEffect(() => {
    if (!live || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const organizations = await api.listOrganizations(session.accessToken);
        const first = organizations.organizations[0];
        if (!first) {
          if (!cancelled) {
            setNotice({
              tone: "warning",
              message: "No organization memberships found for this account.",
            });
          }
          return;
        }
        if (cancelled) return;
        setMembership(first);
        const organizationId = first.organization.id;
        const [credentialPage, memberPage, invitationPage, auditPage] =
          await Promise.all([
            api.listOrganizationCredentials(session.accessToken, organizationId),
            api.listOrganizationMembers(session.accessToken, organizationId),
            api.listOrganizationInvitations(session.accessToken, organizationId),
            api.listOrganizationAudit(session.accessToken, organizationId),
          ]);
        if (cancelled) return;
        setCredentials(credentialPage.data);
        setMembers(memberPage.members);
        setInvitations(invitationPage.data);
        setAuditLogs(auditPage.data);
      } catch (caught) {
        if (!cancelled) {
          setNotice({
            tone: "warning",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Unable to load organization workspace from the API.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, session]);

  async function issueCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title"));
    const referenceNo = String(form.get("referenceNo"));
    const holderEmail = String(form.get("holderEmail"));
    const credentialType = String(form.get("credentialType"));
    const description = String(form.get("description") || "");
    const issuedAtDate = String(form.get("issuedAt"));
    const issuedAt = new Date(`${issuedAtDate}T00:00:00.000Z`).toISOString();

    if (!live || !session || !membership) {
      const created: SafeCredential = {
        ...demoCredentials[0]!,
        id: `cred_${Date.now()}`,
        publicId: `VD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        title,
        referenceNo,
        issuedAt,
        holder: {
          id: `holder_${Date.now()}`,
          email: holderEmail,
          firstName: "New",
          lastName: "Holder",
        },
        claims: { outcome: "Completed" },
      };
      setCredentials((current) => [created, ...current]);
      setNotice({ tone: "success", message: `${title} was issued in the fictional demo.` });
      setActive("credentials");
      return;
    }

    try {
      const response = await api.issueCredential(
        session.accessToken,
        membership.organization.id,
        {
          holderEmail,
          title,
          credentialType,
          referenceNo,
          issuedAt,
          description: description || undefined,
          claims: { outcome: "Completed" },
        },
      );
      setCredentials((current) => [response.credential, ...current]);
      setNotice({ tone: "success", message: `${title} was issued.` });
      setActive("credentials");
    } catch (caught) {
      setNotice({
        tone: "warning",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Unable to issue credential.",
      });
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const role = String(form.get("role")) as "ORGANIZATION_ADMIN" | "ORGANIZATION_ISSUER";
    const expiresInHours = Number(form.get("expiresInHours") || 72);

    if (!live || !session || !membership) {
      const invitation = {
        ...demoInvitations[0]!,
        id: `invite_${Date.now()}`,
        email,
        role,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
        invitationUrl: "https://verifieddoc.example.test/invitations/accept#token=ONE_TIME_DEMO_TOKEN",
      };
      setInvitations((current) => [invitation, ...current]);
      setNotice({ tone: "success", message: "Invitation created. Deliver the one-time URL through a trusted channel." });
      return;
    }

    try {
      const response = await api.createOrganizationInvitation(
        session.accessToken,
        membership.organization.id,
        { email, role, expiresInHours },
      );
      setInvitations((current) => [response.invitation, ...current]);
      setNotice({
        tone: "success",
        message: response.invitationUrl
          ? `Invitation created. Deliver once: ${response.invitationUrl}`
          : "Invitation created. Deliver the one-time URL through a trusted channel.",
      });
    } catch (caught) {
      setNotice({
        tone: "warning",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Unable to create invitation.",
      });
    }
  }

  const organization = membership?.organization ?? demoOrganization;
  const membershipRole = membership?.membershipRole;
  const profile = live && session
    ? session.user
    : {
        firstName: "Nadia",
        lastName: "Admin",
        email: "demo.org-admin@example.test",
      };
  const roleLabel = live
    ? membershipRole === "ORGANIZATION_ISSUER"
      ? "Organization issuer"
      : membershipRole === "ORGANIZATION_ADMIN"
        ? "Organization administrator"
        : "Organization member"
    : "Organization administrator";

  return (
    <AppShell
      roleLabel={roleLabel}
      name={`${profile.firstName} ${profile.lastName}`}
      email={profile.email}
      items={items}
      active={active}
      onActive={setActive}
      onExit={onExit}
      workspaceSwitch={
        canOpenHolder
          ? {
              label: "Open holder workspace →",
              onClick: () => navigate("/app/holder"),
            }
          : undefined
      }
    >
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {active === "overview" && (
          <>
            <PageHeader
              eyebrow="Organization workspace"
              title={organization.name}
              copy="Manage issuer-backed credentials through approved organization membership."
              action={<StatusBadge status={organization.status} />}
            />
            <div className="metric-grid">
              <MetricCard label="Credentials issued" value={credentials.length} note="All lifecycle states" />
              <MetricCard label="Active credentials" value={credentials.filter((item) => item.effectiveStatus === "ACTIVE").length} note="Currently verifiable" tone="green" />
              <MetricCard label="Organization members" value={members.length} note="Administrators and issuers" tone="gold" />
              <MetricCard label="Pending invitations" value={invitations.filter((item) => item.state === "PENDING").length} note="Awaiting acceptance" tone="red" />
            </div>
            <div className="dashboard-grid">
              <article className="content-card">
                <div className="card-title-row"><div><p>Recent credentials</p><h2>Issuer activity</h2></div><button type="button" onClick={() => setActive("credentials")}>View all</button></div>
                <DataTable
                  headers={["Credential", "Holder", "Issued", "Status"]}
                  rows={credentials.slice(0, 3).map((item) => [
                    <strong key="credential">{item.title}</strong>,
                    item.holder?.email ?? "Holder",
                    formatDate(item.issuedAt),
                    <StatusBadge key="status" status={item.effectiveStatus} />,
                  ])}
                />
              </article>
              <article className="content-card compact-card">
                <p className="card-label">Organization readiness</p>
                <div className="readiness-score"><span>{organization.status === "VERIFIED" ? "100" : "40"}</span><small>/ 100</small></div>
                <div className="progress-track"><i style={{ width: organization.status === "VERIFIED" ? "100%" : "40%" }} /></div>
                <ul className="check-list">
                  <li>{organization.status === "VERIFIED" ? "✓" : "○"} Organization approved</li>
                  <li>{members.length > 0 ? "✓" : "○"} Authorized members present</li>
                  <li>✓ Audit trail available via API</li>
                  <li>○ Invitation email delivery deferred</li>
                </ul>
              </article>
            </div>
          </>
        )}

        {active === "credentials" && (
          <>
            <PageHeader eyebrow="Credential registry" title="Issued credentials" copy="Tenant-scoped records for this organization only." action={<button className="workspace-primary" type="button" onClick={() => setActive("issue")}>Issue credential</button>} />
            <div className="content-card">
              <div className="filter-row"><input aria-label="Search credentials" placeholder="Search title, holder, or reference" /><select aria-label="Credential status"><option>All statuses</option><option>Active</option><option>Expired</option><option>Revoked</option></select></div>
              <DataTable
                headers={["Credential", "Holder", "Reference", "Issued", "Status"]}
                rows={credentials.map((item) => [
                  <div key="credential"><strong>{item.title}</strong><small>{item.credentialType.replaceAll("_", " ")}</small></div>,
                  item.holder?.email ?? "Holder",
                  <code key="reference">{item.referenceNo}</code>,
                  formatDate(item.issuedAt),
                  <StatusBadge key="status" status={item.effectiveStatus} />,
                ])}
              />
            </div>
          </>
        )}

        {active === "issue" && (
          <>
            <PageHeader eyebrow="New record" title="Issue a credential" copy="Issuance requires an approved organization and an authorized organization role." />
            <form className="content-card form-card wide-form" onSubmit={(event) => { void issueCredential(event); }}>
              <div className="form-section-heading"><span>01</span><div><h2>Holder and credential</h2><p>Use the email of an existing VerifiedDoc holder.</p></div></div>
              <label>Holder email<input name="holderEmail" type="email" defaultValue="new.holder@example.test" required /></label>
              <div className="field-row">
                <label>Credential title<input name="title" defaultValue="Applied Software Engineering" required /></label>
                <label>Credential type<select name="credentialType"><option>PROFESSIONAL_CERTIFICATE</option><option>EMPLOYMENT_CREDENTIAL</option><option>TRAINING_CERTIFICATE</option></select></label>
              </div>
              <div className="field-row">
                <label>Reference number<input name="referenceNo" defaultValue={`NW-${Date.now().toString().slice(-6)}`} minLength={3} required /></label>
                <label>Issued at<input name="issuedAt" type="date" defaultValue="2026-07-23" required /></label>
              </div>
              <label>Description<textarea name="description" defaultValue="Completed the applied programme and required assessment." /></label>
              <div className="form-section-heading"><span>02</span><div><h2>Structured claims</h2><p>Claims are scalar values approved by the issuing organization.</p></div></div>
              <div className="claims-builder">
                <div><input aria-label="Claim key 1" defaultValue="outcome" /><input aria-label="Claim value 1" defaultValue="Completed" /></div>
                <div><input aria-label="Claim key 2" defaultValue="cohort" /><input aria-label="Claim value 2" defaultValue="2026" /></div>
              </div>
              <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setActive("credentials")}>Cancel</button><button className="workspace-primary" type="submit">Issue credential</button></div>
            </form>
          </>
        )}

        {active === "members" && (
          <>
            <PageHeader eyebrow="Access control" title="Organization members" copy="Organization permissions come from membership roles, not global platform roles." />
            <div className="content-card">
              <DataTable
                headers={["Member", "Platform role", "Organization role", "Joined", "Action"]}
                rows={members.map((member) => [
                  <div key="member"><strong>{member.user.firstName} {member.user.lastName}</strong><small>{member.user.email}</small></div>,
                  member.user.role,
                  <StatusBadge key="role" status={member.membershipRole.replace("ORGANIZATION_", "")} />,
                  formatDate(member.joinedAt),
                  <button
                    className="table-action"
                    type="button"
                    key="action"
                    onClick={() => {
                      if (live) {
                        setNotice({
                          tone: "info",
                          message: "Use the members API DELETE route from an admin tooling flow; demo remove is disabled in live mode.",
                        });
                        return;
                      }
                      if (members.length <= 1) return;
                      setMembers((current) => current.filter((item) => item.user.id !== member.user.id));
                      setNotice({ tone: "warning", message: "Member removed from the fictional organization." });
                    }}
                  >
                    Remove
                  </button>,
                ])}
              />
            </div>
          </>
        )}

        {active === "invitations" && (
          <>
            <PageHeader eyebrow="Membership" title="Invite trusted staff" copy="Raw invitation tokens are returned once and stored only as hashes by the API." />
            <div className="two-column-form">
              <form className="content-card form-card" onSubmit={(event) => { void inviteMember(event); }}>
                <h2>New invitation</h2>
                <label>Email address<input name="email" type="email" defaultValue="new.issuer@example.test" required /></label>
                <label>Organization role<select name="role"><option value="ORGANIZATION_ISSUER">Organization issuer</option><option value="ORGANIZATION_ADMIN">Organization administrator</option></select></label>
                <label>Expires after<select name="expiresInHours"><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></label>
                <button className="workspace-primary" type="submit">Create invitation</button>
              </form>
              <div className="content-card">
                <div className="card-title-row"><div><p>Invitation history</p><h2>Pending and completed</h2></div></div>
                <div className="stack-list">
                  {invitations.map((invite) => (
                    <article className="share-row" key={invite.id}>
                      <div><StatusBadge status={invite.state} /><h3>{invite.email}</h3><p>{invite.role.replaceAll("_", " ")}. Expires {formatDate(invite.expiresAt)}.</p></div>
                      {invite.state === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!live || !session || !membership) {
                              setInvitations((items) =>
                                items.map((item) =>
                                  item.id === invite.id
                                    ? { ...item, state: "REVOKED", revokedAt: new Date().toISOString() }
                                    : item,
                                ),
                              );
                              return;
                            }
                            void api
                              .revokeOrganizationInvitation(
                                session.accessToken,
                                membership.organization.id,
                                invite.id,
                              )
                              .then((response) => {
                                setInvitations((items) =>
                                  items.map((item) =>
                                    item.id === invite.id ? response.invitation : item,
                                  ),
                                );
                              })
                              .catch((caught) => {
                                setNotice({
                                  tone: "warning",
                                  message:
                                    caught instanceof ApiError
                                      ? caught.message
                                      : "Unable to revoke invitation.",
                                });
                              });
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {active === "audit" && (
          <>
            <PageHeader eyebrow="Accountability" title="Organization audit log" copy="Sanitized, tenant-scoped history of sensitive organization actions." />
            <div className="content-card">
              <div className="filter-row"><input aria-label="Filter audit actions" placeholder="Filter by action or resource" /><input aria-label="Audit start date" type="date" /></div>
              <DataTable
                headers={["Action", "Resource", "Actor", "Date"]}
                rows={auditLogs.map((log) => [
                  <strong key="action">{log.action.replaceAll("_", " ")}</strong>,
                  log.resourceType,
                  log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System",
                  formatDate(log.createdAt),
                ])}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function AdminWorkspace({
  onExit,
  session,
}: {
  onExit: () => void;
  session: AuthSession | null;
}) {
  const live = !demoMode && Boolean(session);
  const [active, setActive] = useState("organizations");
  const [organizations, setOrganizations] = useState<AdminOrganization[]>(
    demoPendingOrganizations as AdminOrganization[],
  );
  const [auditLogs, setAuditLogs] = useState<SafeAuditLogEntry[]>(demoAuditLogs);
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = [
    { id: "organizations", label: "Organization review", icon: "▣" },
    { id: "audit", label: "Platform audit", icon: "≡" },
    { id: "readiness", label: "System readiness", icon: "✓" },
  ];

  useEffect(() => {
    if (!live || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const [pending, audit] = await Promise.all([
          api.listAdminOrganizations(session.accessToken, { status: "PENDING" }),
          api.listAdminAuditLogs(session.accessToken),
        ]);
        if (cancelled) return;
        setOrganizations(pending.data);
        setAuditLogs(audit.data);
      } catch (caught) {
        if (!cancelled) {
          setNotice({
            tone: "warning",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Unable to load admin workspace from the API.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, session]);

  async function review(id: string, decision: "APPROVE" | "REJECT") {
    if (!live || !session) {
      const status = decision === "APPROVE" ? "VERIFIED" : "REJECTED";
      setOrganizations((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                reviewedAt: new Date().toISOString(),
                rejectionReason:
                  decision === "REJECT"
                    ? "Required registration evidence was not confirmed."
                    : null,
              }
            : item,
        ),
      );
      setNotice({
        tone: decision === "APPROVE" ? "success" : "warning",
        message: `Organization ${decision === "APPROVE" ? "approved" : "rejected"} in the fictional demo.`,
      });
      return;
    }

    try {
      const response = await api.reviewOrganization(session.accessToken, id, {
        decision,
        rejectionReason:
          decision === "REJECT"
            ? "Required registration evidence was not confirmed."
            : undefined,
      });
      setOrganizations((items) =>
        items.map((item) => (item.id === id ? response.organization : item)),
      );
      setNotice({
        tone: decision === "APPROVE" ? "success" : "warning",
        message: `Organization ${decision === "APPROVE" ? "approved" : "rejected"}.`,
      });
    } catch (caught) {
      setNotice({
        tone: "warning",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Unable to review organization.",
      });
    }
  }

  const profile = live && session
    ? session.user
    : {
        firstName: "Platform",
        lastName: "Admin",
        email: "demo.platform-admin@example.test",
      };

  return (
    <AppShell
      roleLabel="Platform administrator"
      name={`${profile.firstName} ${profile.lastName}`}
      email={profile.email}
      items={items}
      active={active}
      onActive={setActive}
      onExit={onExit}
    >
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {active === "organizations" && (
          <>
            <PageHeader eyebrow="Platform operations" title="Organization applications" copy="Review issuer applications before they can create trusted credentials." />
            <div className="metric-grid">
              <MetricCard label="Pending review" value={organizations.filter((item) => item.status === "PENDING").length} note="Requires an administrator decision" tone="gold" />
              <MetricCard label="Approved in view" value={organizations.filter((item) => item.status === "VERIFIED").length} note={live ? "From review responses" : "Demo review decisions"} tone="green" />
              <MetricCard label="Rejected in view" value={organizations.filter((item) => item.status === "REJECTED").length} note="Reason required" tone="red" />
              <MetricCard label="API readiness" value="Ready" note="Database connectivity confirmed" />
            </div>
            <div className="review-grid">
              {organizations.map((organization) => (
                <article className="review-card" key={organization.id}>
                  <div className="review-card-head">
                    <div className="organization-avatar">{organization.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                    <div><StatusBadge status={organization.status} /><h2>{organization.name}</h2><p>{organization.country}</p></div>
                  </div>
                  <dl>
                    <div><dt>Contact</dt><dd>{organization.contactEmail}</dd></div>
                    <div><dt>Registration</dt><dd>{organization.registrationNumber}</dd></div>
                    <div><dt>Website</dt><dd>{organization.website}</dd></div>
                    <div><dt>Applied</dt><dd>{formatDate(organization.createdAt)}</dd></div>
                  </dl>
                  <p>{organization.description}</p>
                  {organization.status === "PENDING" ? (
                    <div className="review-actions">
                      <button className="reject-button" type="button" onClick={() => { void review(organization.id, "REJECT"); }}>Reject</button>
                      <button className="approve-button" type="button" onClick={() => { void review(organization.id, "APPROVE"); }}>Approve organization</button>
                    </div>
                  ) : (
                    <div className="reviewed-message">Decision recorded at {formatDate(organization.reviewedAt)}</div>
                  )}
                </article>
              ))}
              {organizations.length === 0 && <p>No organizations in this review queue.</p>}
            </div>
          </>
        )}
        {active === "audit" && (
          <>
            <PageHeader eyebrow="Platform accountability" title="Global audit log" copy="Cross-organization audit access restricted to platform administrators." />
            <div className="content-card">
              <div className="filter-row"><input placeholder="Action, actor, organization" aria-label="Search platform audit" /><select aria-label="Audit resource"><option>All resources</option><option>Organization</option><option>Credential</option><option>Invitation</option></select></div>
              <DataTable
                headers={["Action", "Organization", "Resource", "Actor", "Date"]}
                rows={auditLogs.map((log) => [
                  <strong key="action">{log.action.replaceAll("_", " ")}</strong>,
                  log.organizationId ?? "—",
                  log.resourceType,
                  log.actor?.email ?? "System",
                  formatDate(log.createdAt),
                ])}
              />
            </div>
          </>
        )}
        {active === "readiness" && (
          <>
            <PageHeader eyebrow="System operations" title="Deployment readiness" copy="Liveness and database readiness are separate operational checks." />
            <div className="readiness-grid">
              <article className="content-card readiness-card"><span className="readiness-icon">✓</span><div><p>API liveness</p><h2>Operational</h2><small>GET /api/v1/health</small></div></article>
              <article className="content-card readiness-card"><span className="readiness-icon">✓</span><div><p>Database readiness</p><h2>Connected</h2><small>GET /api/v1/ready</small></div></article>
              <article className="content-card readiness-card"><span className="readiness-icon">156</span><div><p>Backend test baseline</p><h2>Passing</h2><small>Recorded before client implementation</small></div></article>
              <article className="content-card readiness-card"><span className="readiness-icon">9</span><div><p>Database migrations</p><h2>Versioned</h2><small>Deploy in order in each environment</small></div></article>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function VerifierWorkspace({
  onExit,
  session,
  canOpenOrganization,
}: {
  onExit: () => void;
  session: AuthSession | null;
  canOpenOrganization: boolean;
}) {
  const live = !demoMode;
  const [active, setActive] = useState("verify");
  const [token, setToken] = useState(demoMode ? "DEMO-VERIFIED-2026" : "");
  const [result, setResult] = useState<PublicVerificationResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = [
    { id: "verify", label: "Verify credential", icon: "✓" },
    { id: "guidance", label: "Decision guidance", icon: "?" },
  ];
  const profile = session?.user ?? {
    firstName: "Victor",
    lastName: "Employer",
    email: "demo.verifier@example.test",
  };

  async function submitVerify(event: FormEvent) {
    event.preventDefault();
    setUnavailable(false);
    try {
      if (!live) {
        const verified = verifyDemoToken(token);
        setResult(verified);
        setUnavailable(!verified);
        return;
      }
      setResult(await api.verifyCredential(token));
    } catch (caught) {
      setResult(null);
      setUnavailable(true);
      if (caught instanceof ApiError) {
        setNotice({ tone: "warning", message: caught.message });
      }
    }
  }

  return (
    <AppShell
      roleLabel="Employer or verifier"
      name={`${profile.firstName} ${profile.lastName}`}
      email={profile.email}
      items={items}
      active={active}
      onActive={setActive}
      onExit={onExit}
      workspaceSwitch={
        canOpenOrganization
          ? {
              label: "Open organization workspace →",
              onClick: () => navigate("/app/organization"),
            }
          : undefined
      }
    >
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {active === "verify" ? (
          <>
            <PageHeader eyebrow="Source confirmation" title="Verify a shared credential" copy="The result confirms issuer-backed record status. It does not make the hiring decision." />
            <div className="verifier-layout">
              <form
                className="content-card form-card"
                onSubmit={(event) => {
                  void submitVerify(event);
                }}
              >
                <h2>Enter verification token</h2>
                <p>Use the token from the holder-approved URL or scan its QR code in the mobile experience. Live mode calls GET /verify/:token.</p>
                <label>Verification token<input value={token} onChange={(event) => setToken(event.target.value)} /></label>
                <button className="workspace-primary" type="submit">Check record</button>
                <div className="safe-failure-note">Unknown, expired, revoked, and exhausted links all return the same generic unavailable state.</div>
              </form>
              <VerificationResult result={result} unavailable={unavailable} onDemo={() => { setToken("DEMO-VERIFIED-2026"); setResult(verifyDemoToken("DEMO-VERIFIED-2026")); setUnavailable(false); }} />
            </div>
          </>
        ) : (
          <>
            <PageHeader eyebrow="Verification policy" title="What a result means" copy="VerifiedDoc confirms a source record. The verifier evaluates suitability independently." />
            <div className="guidance-grid">
              <article className="content-card"><span>VALID</span><h2>Current issuer-backed record</h2><p>The shared credential is active and the link is available. Review disclosed fields and apply your own decision policy.</p></article>
              <article className="content-card"><span>EXPIRED</span><h2>Credential validity ended</h2><p>The issuer-backed record exists, but its effective expiry date has passed.</p></article>
              <article className="content-card"><span>REVOKED</span><h2>Issuer withdrew the record</h2><p>The public result shows revocation status and timestamp, but not the private revocation reason.</p></article>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function InvitationAcceptPage({
  onExit,
  session,
  onAccepted,
}: {
  onExit: () => void;
  session: AuthSession | null;
  onAccepted?: () => void | Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fragmentToken = hash.get("token") ?? "";
    setToken(fragmentToken);
    if (window.location.hash) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function accept() {
    if (!token) return;
    if (demoMode || !session) {
      if (!session && !demoMode) {
        setError("Sign in first, then reopen the invitation link. Accept requires a Bearer token.");
        return;
      }
      setAccepted(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.acceptInvitation(session.accessToken, { token });
      await onAccepted?.();
      setAccepted(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to accept invitation.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="simple-page">
      <header><Brand /><button type="button" onClick={onExit}>Back home</button></header>
      <section className="simple-card">
        <span className="large-mark">{accepted ? "✓" : "↗"}</span>
        <p className="section-label">Organization invitation</p>
        <h1>{accepted ? "Invitation accepted" : "Join an issuing organization"}</h1>
        <p>
          {accepted
            ? demoMode
              ? "Your fictional organization membership is ready."
              : "Your organization membership is ready."
            : token
              ? "The token was read from the URL fragment and removed from browser history."
              : "No invitation token was found. Ask the organization administrator for a new link."}
        </p>
        {error && <p className="form-error">{error}</p>}
        {!accepted && token && (
          <button className="primary-button" type="button" disabled={loading} onClick={() => { void accept(); }}>
            {loading ? "Accepting…" : "Accept invitation"}
          </button>
        )}
        {accepted && <button className="primary-button" type="button" onClick={() => navigate("/app/organization")}>Open organization workspace</button>}
      </section>
    </div>
  );
}

function PublicVerificationPage() {
  const initialToken = window.location.pathname.split("/verify/")[1] ?? "";
  const [token, setToken] = useState(decodeURIComponent(initialToken));
  const [result, setResult] = useState<PublicVerificationResponse | null>(
    demoMode && initialToken ? verifyDemoToken(decodeURIComponent(initialToken)) : null,
  );
  const [unavailable, setUnavailable] = useState(Boolean(initialToken && !result));
  const [loading, setLoading] = useState(false);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setUnavailable(false);
    try {
      if (demoMode) {
        const response = verifyDemoToken(token);
        setResult(response);
        setUnavailable(!response);
      } else {
        setResult(await api.verifyCredential(token));
      }
    } catch {
      setResult(null);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="simple-page verify-page">
      <header><Brand /><button type="button" onClick={() => navigate("/")}>Back home</button></header>
      <div className="verify-page-grid">
        <section>
          <p className="eyebrow"><span />Public verification</p>
          <h1>Confirm the credential at its source.</h1>
          <p>Only holder-approved fields are included in the response.</p>
          <form onSubmit={verify}>
            <label>Verification token<input value={token} onChange={(event) => setToken(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={loading}>{loading ? "Checking..." : "Verify credential"}</button>
          </form>
        </section>
        <VerificationResult result={result} unavailable={unavailable} onDemo={() => { setToken("DEMO-VERIFIED-2026"); setResult(verifyDemoToken("DEMO-VERIFIED-2026")); setUnavailable(false); }} />
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function NoticeBar({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div className={`notice notice-${notice.tone}`} role="status">
      <span>{notice.tone === "success" ? "✓" : notice.tone === "warning" ? "!" : "i"}</span>
      <p>{notice.message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>
    </div>
  );
}

export function App() {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembershipView[]>([]);

  const orgAccessFromMembership = useMemo(
    () => hasOrganizationWorkspaceAccess(memberships),
    [memberships],
  );
  const canAccessHolder =
    demoRole === "HOLDER" || session?.user.role === "HOLDER";
  const canAccessVerifier =
    demoRole === "VERIFIER" || session?.user.role === "VERIFIER";
  const canAccessAdmin =
    demoRole === "PLATFORM_ADMIN" || session?.user.role === "PLATFORM_ADMIN";
  const canAccessOrganization =
    demoRole === "ORGANIZATION_ADMIN" || orgAccessFromMembership;

  function openDemo(role: DemoRole) {
    setSession(null);
    setMemberships([]);
    setDemoRole(role);
    navigate(routeForRole(role));
  }

  async function acceptSession(nextSession: AuthSession) {
    setDemoRole(null);
    setSession(nextSession);
    setMemberships([]);

    if (!demoMode) {
      try {
        const response = await api.listOrganizations(nextSession.accessToken);
        setMemberships(response.organizations);
      } catch {
        // Membership load failure must not block platform-role routing.
        setMemberships([]);
      }
    }

    // Organization roles come only from OrganizationMembershipView, never PlatformRole.
    navigate(routeForPlatformRole(nextSession.user.role));
  }

  async function exit() {
    const refreshToken = session?.refreshToken;
    setSession(null);
    setDemoRole(null);
    setMemberships([]);
    if (!demoMode && refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // Local session is already cleared; ignore logout transport failures.
      }
    }
    navigate("/");
  }

  if (pathname.startsWith("/verify")) return <PublicVerificationPage />;
  if (pathname === "/invitations/accept") {
    return (
      <InvitationAcceptPage
        onExit={() => {
          void exit();
        }}
        session={session}
        onAccepted={async () => {
          if (!session || demoMode) return;
          try {
            const response = await api.listOrganizations(session.accessToken);
            setMemberships(response.organizations);
          } catch {
            setMemberships([]);
          }
        }}
      />
    );
  }
  if (pathname === "/auth") {
    return (
      <AuthPage
        onSession={(next) => {
          void acceptSession(next);
        }}
        onDemo={openDemo}
      />
    );
  }
  if (pathname === "/app/holder" && canAccessHolder) {
    return (
      <HolderWorkspace
        onExit={() => {
          void exit();
        }}
        session={session}
        canOpenOrganization={canAccessOrganization}
      />
    );
  }
  if (pathname === "/app/organization" && canAccessOrganization) {
    return (
      <OrganizationWorkspace
        onExit={() => {
          void exit();
        }}
        session={session}
        canOpenHolder={canAccessHolder}
      />
    );
  }
  if (pathname === "/app/verifier" && canAccessVerifier) {
    return (
      <VerifierWorkspace
        onExit={() => {
          void exit();
        }}
        session={session}
        canOpenOrganization={canAccessOrganization}
      />
    );
  }
  if (pathname === "/app/admin" && canAccessAdmin) {
    return (
      <AdminWorkspace
        onExit={() => {
          void exit();
        }}
        session={session}
      />
    );
  }
  return <LandingPage onDemo={openDemo} />;
}
