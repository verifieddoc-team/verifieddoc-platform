import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import type {
  AdminOrganization,
  AuthSession,
  InvitationSummary,
  OrganizationMemberProfile,
  OrganizationMembershipView,
  PublicVerificationResponse,
  SafeAuditLogEntry,
  SafeCredential,
  ShareLinkSummary,
} from "@verifieddoc/contracts";
import { api, ApiError } from "./lib/api";
import { formatDate, navigate } from "./lib/navigation";

type Notice = { message: string; tone: "success" | "warning" | "info" };

function Brand() {
  return (
    <button className="brand brand-compact" type="button" onClick={() => navigate("/")}>
      <span className="brand-shield" aria-hidden="true"><span>✓</span></span>
      <span>VerifiedDoc</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = ["ACTIVE", "VERIFIED", "VALID", "ACCEPTED", "READY", "OK"].includes(status)
    ? "good"
    : ["PENDING", "EXPIRED"].includes(status)
      ? "pending"
      : "danger";
  return <span className={`status-badge status-${tone}`}>{status}</span>;
}

type NavItem = { id: string; label: string; icon: string };

function Shell({
  roleLabel,
  session,
  items,
  active,
  onActive,
  onExit,
  children,
}: {
  roleLabel: string;
  session: AuthSession;
  items: NavItem[];
  active: string;
  onActive: (id: string) => void;
  onExit: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const name = `${session.user.firstName} ${session.user.lastName}`;
  return (
    <div className="app-frame">
      <aside className={open ? "app-sidebar sidebar-open" : "app-sidebar"}>
        <Brand />
        <div className="workspace-role">
          <span>Connected workspace</span>
          <strong>{roleLabel}</strong>
        </div>
        <nav aria-label={`${roleLabel} navigation`}>
          {items.map((item) => (
            <button
              className={active === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => {
                onActive(item.id);
                setOpen(false);
              }}
            >
              <i aria-hidden="true">{item.icon}</i>{item.label}
            </button>
          ))}
        </nav>
        <button className="sidebar-exit" type="button" onClick={onExit}>
          ← Sign out
        </button>
        <div className="sidebar-user">
          <span>{`${session.user.firstName[0]}${session.user.lastName[0]}`}</span>
          <div><strong>{name}</strong><small>{session.user.email}</small></div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button className="sidebar-toggle" type="button" onClick={() => setOpen((value) => !value)}>
            ☰ <span className="sr-only">Toggle workspace navigation</span>
          </button>
          <div><span className="live-dot" />Connected to VerifiedDoc API</div>
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

function Metric({
  label,
  value,
  note,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <p>{label}</p><strong>{value}</strong><span>{note}</span>
    </article>
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

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingCard({ message }: { message: string }) {
  return <div className="content-card live-loading"><span className="loading-spinner" />{message}</div>;
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="content-card live-error" role="alert">
      <strong>Could not complete this request</strong>
      <p>{message}</p>
      {onRetry && <button className="secondary-button" type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

function messageFrom(error: unknown) {
  return error instanceof ApiError ? error.message : "The API request could not be completed.";
}

export function RealHolderWorkspace({
  session,
  onExit,
}: {
  session: AuthSession;
  onExit: () => void;
}) {
  const [active, setActive] = useState("wallet");
  const [credentials, setCredentials] = useState<SafeCredential[]>([]);
  const [selected, setSelected] = useState<SafeCredential | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLinkSummary[]>([]);
  const [rawShareUrl, setRawShareUrl] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationMembershipView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  async function loadWallet() {
    setLoading(true);
    setError("");
    try {
      const [wallet, memberships] = await Promise.all([
        api.listWallet(session.accessToken),
        api.listOrganizations(session.accessToken),
      ]);
      setCredentials(wallet.data);
      setSelected((current) => current ?? wallet.data[0] ?? null);
      setOrganizations(memberships.organizations);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWallet();
  }, []);

  useEffect(() => {
    if (!selected) {
      setShareLinks([]);
      return;
    }
    api.listShareLinks(session.accessToken, selected.id)
      .then((response) => setShareLinks(response.data))
      .catch(() => setShareLinks([]));
  }, [selected?.id, session.accessToken]);

  async function createShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.createShareLink(session.accessToken, selected.id, {
        expiresInHours: Number(form.get("expiresInHours")),
        maxViews: form.get("maxViews") ? Number(form.get("maxViews")) : undefined,
        disclosedClaims: form.getAll("disclosedClaims").map(String),
        includeHolderName: form.get("includeHolderName") === "on",
        includeReferenceNo: form.get("includeReferenceNo") === "on",
      });
      setShareLinks((current) => [result.shareLink, ...current]);
      setRawShareUrl(result.verificationUrl);
      setNotice({ tone: "success", message: "Share link created. Copy the one-time URL now." });
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  async function revokeShare(linkId: string) {
    if (!selected) return;
    try {
      const response = await api.revokeShareLink(
        session.accessToken,
        selected.id,
        linkId,
      );
      setShareLinks((current) =>
        current.map((link) => link.id === linkId ? response.shareLink : link),
      );
      setNotice({ tone: "info", message: "Share link revoked." });
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  const items: NavItem[] = [
    { id: "wallet", label: "Credential wallet", icon: "▣" },
    { id: "details", label: "Credential details", icon: "◇" },
    { id: "sharing", label: "Consent sharing", icon: "↗" },
    { id: "profile", label: "Profile", icon: "○" },
    ...(organizations.length > 0
      ? [{ id: "organization", label: "Organization workspace", icon: "⌂" }]
      : [{ id: "apply", label: "Apply as organization", icon: "+" }]),
  ];

  function changeActive(id: string) {
    if (id === "organization") {
      navigate("/app/organization");
      return;
    }
    setActive(id);
  }

  return (
    <Shell
      roleLabel="Credential holder"
      session={session}
      items={items}
      active={active}
      onActive={changeActive}
      onExit={onExit}
    >
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {loading && <LoadingCard message="Loading your issuer-backed records..." />}
        {error && <ErrorCard message={error} onRetry={loadWallet} />}

        {!loading && !error && active === "wallet" && (
          <>
            <PageHeader eyebrow="Holder workspace" title="Your credential wallet" copy="Every record remains connected to its issuing organization." />
            <div className="metric-grid">
              <Metric label="Total credentials" value={credentials.length} note="Across all issuing organizations" />
              <Metric label="Active" value={credentials.filter((item) => item.effectiveStatus === "ACTIVE").length} note="Ready for consent sharing" tone="green" />
              <Metric label="Expired" value={credentials.filter((item) => item.effectiveStatus === "EXPIRED").length} note="Retained for your record" tone="gold" />
              <Metric label="Revoked" value={credentials.filter((item) => item.effectiveStatus === "REVOKED").length} note="Issuer state preserved" tone="red" />
            </div>
            <div className="content-card">
              <div className="card-title-row"><div><p>Credential records</p><h2>Your wallet</h2></div><span>Live issuer state</span></div>
              {credentials.length === 0 ? (
                <div className="empty-panel"><strong>No credentials yet</strong><p>Credentials issued to this email will appear here.</p></div>
              ) : (
                <div className="credential-grid">
                  {credentials.map((credential) => (
                    <button
                      className="wallet-card"
                      key={credential.id}
                      type="button"
                      onClick={() => {
                        setSelected(credential);
                        setActive("details");
                      }}
                    >
                      <div className="wallet-card-top"><span className="credential-symbol">VD</span><StatusBadge status={credential.effectiveStatus} /></div>
                      <small>{credential.credentialType.replaceAll("_", " ")}</small>
                      <h3>{credential.title}</h3>
                      <p>{credential.organization.name}</p>
                      <div><span>Issued {formatDate(credential.issuedAt)}</span><strong>View record →</strong></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !error && active === "details" && (
          selected ? (
            <>
              <PageHeader
                eyebrow="Credential detail"
                title={selected.title}
                copy="Authenticated record details from the issuing organization."
                action={selected.effectiveStatus === "ACTIVE" ? (
                  <button className="workspace-primary" type="button" onClick={() => setActive("sharing")}>Create share link</button>
                ) : undefined}
              />
              <div className="detail-layout">
                <article className="credential-document">
                  <div className="document-ribbon"><StatusBadge status={selected.effectiveStatus} /><span>Public ID {selected.publicId}</span></div>
                  <p className="document-label">Verified credential</p>
                  <h2>{selected.title}</h2>
                  <p>{selected.description}</p>
                  <div className="document-issuer"><span>VD</span><div><small>Issued by</small><strong>{selected.organization.name}</strong></div></div>
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
                  {selected.effectiveStatus === "REVOKED" && (
                    <div className="content-card compact-card revocation-card">
                      <p className="card-label">Revocation</p>
                      <strong>{formatDate(selected.revokedAt)}</strong>
                      <p>{selected.revocationReason ?? "No reason provided."}</p>
                    </div>
                  )}
                </aside>
              </div>
            </>
          ) : <ErrorCard message="Select a credential from your wallet first." />
        )}

        {!loading && !error && active === "sharing" && (
          selected && selected.effectiveStatus === "ACTIVE" ? (
            <>
              <PageHeader eyebrow="Consent sharing" title="Share this credential safely" copy="You decide what the verifier can see and how long access lasts." />
              <div className="two-column-form">
                <form className="content-card form-card" onSubmit={createShare}>
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
                    <label className="check-field"><input name="includeHolderName" type="checkbox" /> Include holder name</label>
                    <label className="check-field"><input name="includeReferenceNo" type="checkbox" /> Include reference number</label>
                  </fieldset>
                  <fieldset>
                    <legend>Claims to disclose</legend>
                    {Object.keys(selected.claims ?? {}).map((claim) => (
                      <label className="check-field" key={claim}>
                        <input name="disclosedClaims" type="checkbox" value={claim} /> {claim}
                      </label>
                    ))}
                  </fieldset>
                  <button className="workspace-primary" type="submit">Create secure link</button>
                  {rawShareUrl && (
                    <div className="one-time-token">
                      <strong>Copy this URL now</strong>
                      <code>{rawShareUrl}</code>
                      <button type="button" onClick={() => void navigator.clipboard.writeText(rawShareUrl)}>Copy URL</button>
                      <small>The raw token is returned only once.</small>
                    </div>
                  )}
                </form>
                <div className="content-card">
                  <div className="card-title-row"><div><p>Existing links</p><h2>Access history</h2></div></div>
                  <div className="stack-list">
                    {shareLinks.length === 0 && <div className="empty-panel"><strong>No share links</strong><p>Create one to begin holder-approved verification.</p></div>}
                    {shareLinks.map((link) => (
                      <article className="share-row" key={link.id}>
                        <div><StatusBadge status={link.state} /><h3>{formatDate(link.createdAt)}</h3><p>{link.viewCount} of {link.maxViews ?? "unlimited"} views used. Expires {formatDate(link.expiresAt)}.</p></div>
                        {link.state === "ACTIVE" && <button type="button" onClick={() => void revokeShare(link.id)}>Revoke</button>}
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : <ErrorCard message="Select an active credential before creating a share link." />
        )}

        {!loading && !error && active === "profile" && (
          <>
            <PageHeader eyebrow="Account" title="Profile information" copy="Profile fields are read-only in the current MVP." />
            <div className="content-card form-card narrow-card">
              <div className="field-row">
                <label>First name<input value={session.user.firstName} readOnly /></label>
                <label>Last name<input value={session.user.lastName} readOnly /></label>
              </div>
              <label>Email address<input value={session.user.email} readOnly /></label>
              <label>Platform role<input value={session.user.role} readOnly /></label>
              <div className="safe-failure-note">Profile editing and password recovery remain future enhancements.</div>
            </div>
          </>
        )}

        {!loading && !error && active === "apply" && (
          <OrganizationApplication
            session={session}
            onCreated={(membership) => {
              setOrganizations([membership]);
              setNotice({ tone: "success", message: "Organization application submitted for platform review." });
              navigate("/app/organization");
            }}
          />
        )}
      </div>
    </Shell>
  );
}

function OrganizationApplication({
  session,
  onCreated,
}: {
  session: AuthSession;
  onCreated: (membership: OrganizationMembershipView) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const website = String(form.get("website") ?? "").trim();
      const registrationNumber = String(form.get("registrationNumber") ?? "").trim();
      const description = String(form.get("description") ?? "").trim();
      const membership = await api.applyForOrganization(session.accessToken, {
        name: String(form.get("name")),
        slug: String(form.get("slug")),
        contactEmail: String(form.get("contactEmail")),
        country: String(form.get("country")),
        ...(website ? { website } : {}),
        ...(registrationNumber ? { registrationNumber } : {}),
        ...(description ? { description } : {}),
      });
      onCreated(membership);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Organization onboarding" title="Apply as an issuing organization" copy="Create a metadata application. A platform administrator must approve it before credentials can be issued." />
      <form className="content-card form-card wide-form" onSubmit={submit}>
        <div className="form-section-heading"><span>01</span><div><h2>Organization identity</h2><p>No real or sensitive documents are required for the capstone environment.</p></div></div>
        <div className="field-row">
          <label>Organization name<input name="name" minLength={2} required /></label>
          <label>URL slug<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="northwind-training" required /></label>
        </div>
        <div className="field-row">
          <label>Registration number<input name="registrationNumber" /></label>
          <label>Country<input name="country" defaultValue="Cameroon" required /></label>
        </div>
        <label>Contact email<input name="contactEmail" type="email" defaultValue={session.user.email} required /></label>
        <label>Website<input name="website" type="url" placeholder="https://example.org" /></label>
        <label>Description<textarea name="description" maxLength={2000} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="workspace-primary" type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit application"}</button>
      </form>
    </>
  );
}

export function RealOrganizationWorkspace({
  session,
  onExit,
}: {
  session: AuthSession;
  onExit: () => void;
}) {
  const [active, setActive] = useState("overview");
  const [memberships, setMemberships] = useState<OrganizationMembershipView[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [credentials, setCredentials] = useState<SafeCredential[]>([]);
  const [members, setMembers] = useState<OrganizationMemberProfile[]>([]);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [audit, setAudit] = useState<SafeAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const membership = memberships.find((item) => item.organization.id === selectedId) ?? memberships[0];
  const organization = membership?.organization;
  const isAdmin = membership?.membershipRole === "ORGANIZATION_ADMIN";

  async function loadMemberships() {
    setLoading(true);
    setError("");
    try {
      const response = await api.listOrganizations(session.accessToken);
      setMemberships(response.organizations);
      setSelectedId((current) => current || response.organizations[0]?.organization.id || "");
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  async function loadOrganizationData(orgId: string, admin: boolean) {
    setLoading(true);
    setError("");
    try {
      const credentialResponse = await api.listOrganizationCredentials(session.accessToken, orgId);
      setCredentials(credentialResponse.data);
      if (admin) {
        const [memberResponse, invitationResponse, auditResponse] = await Promise.all([
          api.listOrganizationMembers(session.accessToken, orgId),
          api.listInvitations(session.accessToken, orgId),
          api.listOrganizationAudit(session.accessToken, orgId),
        ]);
        setMembers(memberResponse.members);
        setInvitations(invitationResponse.data);
        setAudit(auditResponse.data);
      } else {
        setMembers([]);
        setInvitations([]);
        setAudit([]);
      }
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMemberships();
  }, []);

  useEffect(() => {
    if (membership) {
      void loadOrganizationData(
        membership.organization.id,
        membership.membershipRole === "ORGANIZATION_ADMIN",
      );
    }
  }, [membership?.organization.id, membership?.membershipRole]);

  async function issueCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    const form = new FormData(event.currentTarget);
    const claimKey = String(form.get("claimKey") ?? "").trim();
    const claimValue = String(form.get("claimValue") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    try {
      const response = await api.issueCredential(session.accessToken, organization.id, {
        holderEmail: String(form.get("holderEmail")),
        title: String(form.get("title")),
        credentialType: String(form.get("credentialType")),
        referenceNo: String(form.get("referenceNo")),
        ...(description ? { description } : {}),
        issuedAt: new Date(String(form.get("issuedAt"))).toISOString(),
        ...(form.get("expiresAt") ? { expiresAt: new Date(String(form.get("expiresAt"))).toISOString() } : {}),
        ...(claimKey ? { claims: { [claimKey]: claimValue } } : {}),
      });
      setCredentials((current) => [response.credential, ...current]);
      setNotice({ tone: "success", message: "Credential issued and audit entry recorded." });
      setActive("credentials");
      event.currentTarget.reset();
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  async function revokeCredential(credential: SafeCredential) {
    if (!organization) return;
    const reason = window.prompt("Enter the revocation reason. This is visible only on authenticated endpoints.");
    if (!reason || reason.trim().length < 5) return;
    try {
      const response = await api.revokeCredential(
        session.accessToken,
        organization.id,
        credential.id,
        reason.trim(),
      );
      setCredentials((current) =>
        current.map((item) => item.id === credential.id ? response.credential : item),
      );
      setNotice({ tone: "success", message: "Credential revoked. The public result will not reveal the private reason." });
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    const form = new FormData(event.currentTarget);
    try {
      const response = await api.createInvitation(session.accessToken, organization.id, {
        email: String(form.get("email")),
        role: String(form.get("role")) as InvitationSummary["role"],
        expiresInHours: Number(form.get("expiresInHours")),
      });
      setInvitations((current) => [response.invitation, ...current]);
      setNotice({ tone: "success", message: `Invitation created. Copy this one-time URL: ${response.invitationUrl}` });
      event.currentTarget.reset();
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!organization) return;
    try {
      const response = await api.revokeInvitation(session.accessToken, organization.id, invitationId);
      setInvitations((current) =>
        current.map((item) => item.id === invitationId ? response.invitation : item),
      );
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  async function changeMember(member: OrganizationMemberProfile, role: OrganizationMemberProfile["membershipRole"]) {
    if (!organization) return;
    try {
      const response = await api.updateOrganizationMember(
        session.accessToken,
        organization.id,
        member.user.id,
        role,
      );
      setMembers((current) =>
        current.map((item) => item.user.id === member.user.id ? response.member : item),
      );
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  async function removeMember(member: OrganizationMemberProfile) {
    if (!organization || !window.confirm(`Remove ${member.user.email} from this organization?`)) return;
    try {
      await api.removeOrganizationMember(session.accessToken, organization.id, member.user.id);
      setMembers((current) => current.filter((item) => item.user.id !== member.user.id));
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  if (!loading && memberships.length === 0) {
    return (
      <Shell
        roleLabel="Organization onboarding"
        session={session}
        items={[{ id: "apply", label: "Organization application", icon: "+" }, { id: "holder", label: "Holder workspace", icon: "▣" }]}
        active="apply"
        onActive={(id) => id === "holder" ? navigate("/app/holder") : undefined}
        onExit={onExit}
      >
        <div className="workspace-content">
          <OrganizationApplication
            session={session}
            onCreated={(created) => {
              setMemberships([created]);
              setSelectedId(created.organization.id);
              setNotice({ tone: "success", message: "Organization application submitted." });
            }}
          />
        </div>
      </Shell>
    );
  }

  const items: NavItem[] = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "credentials", label: "Credentials", icon: "▣" },
    { id: "issue", label: "Issue credential", icon: "+" },
    ...(isAdmin
      ? [
          { id: "members", label: "Members", icon: "◎" },
          { id: "invitations", label: "Invitations", icon: "↗" },
          { id: "audit", label: "Audit logs", icon: "≡" },
        ]
      : []),
    { id: "holder", label: "Holder workspace", icon: "◇" },
  ];

  function changeActive(id: string) {
    if (id === "holder") {
      navigate("/app/holder");
      return;
    }
    setActive(id);
  }

  return (
    <Shell
      roleLabel={membership?.membershipRole.replaceAll("_", " ") ?? "Organization member"}
      session={session}
      items={items}
      active={active}
      onActive={changeActive}
      onExit={onExit}
    >
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {memberships.length > 1 && (
          <label className="organization-switcher">
            Organization
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {memberships.map((item) => <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>)}
            </select>
          </label>
        )}
        {loading && <LoadingCard message="Loading organization records..." />}
        {error && <ErrorCard message={error} onRetry={() => organization && void loadOrganizationData(organization.id, isAdmin)} />}
        {!loading && !error && organization && active === "overview" && (
          <>
            <PageHeader
              eyebrow="Organization workspace"
              title={organization.name}
              copy="Manage issuer-backed records through organization membership roles."
              action={<StatusBadge status={organization.status} />}
            />
            {organization.status !== "VERIFIED" && (
              <div className="notice notice-warning"><span>!</span><p>Credential issuance remains locked until a platform administrator approves this organization.</p></div>
            )}
            <div className="metric-grid">
              <Metric label="Credentials issued" value={credentials.length} note="All lifecycle states" />
              <Metric label="Active credentials" value={credentials.filter((item) => item.effectiveStatus === "ACTIVE").length} note="Currently verifiable" tone="green" />
              <Metric label="Organization members" value={isAdmin ? members.length : "Restricted"} note="Membership-scoped access" tone="gold" />
              <Metric label="Pending invitations" value={isAdmin ? invitations.filter((item) => item.state === "PENDING").length : "Restricted"} note="Organization admins only" tone="red" />
            </div>
            <div className="content-card">
              <div className="card-title-row"><div><p>Recent credentials</p><h2>Issuer activity</h2></div><button type="button" onClick={() => setActive("credentials")}>View all</button></div>
              <DataTable
                headers={["Credential", "Holder", "Issued", "Status"]}
                rows={credentials.slice(0, 5).map((item) => [
                  <strong key="title">{item.title}</strong>,
                  item.holder?.email ?? "Holder",
                  formatDate(item.issuedAt),
                  <StatusBadge key="status" status={item.effectiveStatus} />,
                ])}
              />
            </div>
          </>
        )}

        {!loading && !error && organization && active === "credentials" && (
          <>
            <PageHeader eyebrow="Credential registry" title="Issued credentials" copy="Tenant-scoped records for this organization only." action={<button className="workspace-primary" type="button" onClick={() => setActive("issue")}>Issue credential</button>} />
            <div className="content-card">
              <DataTable
                headers={["Credential", "Holder", "Reference", "Issued", "Status", "Action"]}
                rows={credentials.map((item) => [
                  <div key="credential"><strong>{item.title}</strong><small>{item.credentialType.replaceAll("_", " ")}</small></div>,
                  item.holder?.email ?? "Holder",
                  <code key="reference">{item.referenceNo}</code>,
                  formatDate(item.issuedAt),
                  <StatusBadge key="status" status={item.effectiveStatus} />,
                  item.effectiveStatus === "ACTIVE"
                    ? <button className="table-action danger-action" type="button" key="revoke" onClick={() => void revokeCredential(item)}>Revoke</button>
                    : <span key="none">—</span>,
                ])}
              />
            </div>
          </>
        )}

        {!loading && !error && organization && active === "issue" && (
          <>
            <PageHeader eyebrow="New issuer record" title="Issue a credential" copy="Issued credentials are immutable. Corrections require revocation and reissue." />
            <form className="content-card form-card wide-form" onSubmit={issueCredential}>
              <label>Holder email<input name="holderEmail" type="email" required /></label>
              <div className="field-row">
                <label>Credential title<input name="title" required /></label>
                <label>Credential type
                  <select name="credentialType" defaultValue="PROFESSIONAL_CERTIFICATE">
                    <option value="PROFESSIONAL_CERTIFICATE">Professional certificate</option>
                    <option value="EMPLOYMENT_CREDENTIAL">Employment credential</option>
                    <option value="TRAINING_CERTIFICATE">Training certificate</option>
                  </select>
                </label>
              </div>
              <div className="field-row">
                <label>Reference number<input name="referenceNo" minLength={3} required /></label>
                <label>Issue date<input name="issuedAt" type="date" required /></label>
              </div>
              <label>Expiry date, optional<input name="expiresAt" type="date" /></label>
              <label>Description<textarea name="description" /></label>
              <div className="field-row">
                <label>Claim key, optional<input name="claimKey" placeholder="grade" /></label>
                <label>Claim value<input name="claimValue" placeholder="Distinction" /></label>
              </div>
              <button className="workspace-primary" type="submit" disabled={organization.status !== "VERIFIED"}>Issue credential</button>
            </form>
          </>
        )}

        {!loading && !error && isAdmin && active === "members" && (
          <>
            <PageHeader eyebrow="Access control" title="Organization members" copy="Organization permissions come only from membership roles." />
            <div className="content-card">
              <DataTable
                headers={["Member", "Platform role", "Organization role", "Joined", "Action"]}
                rows={members.map((member) => [
                  <div key="member"><strong>{member.user.firstName} {member.user.lastName}</strong><small>{member.user.email}</small></div>,
                  member.user.role,
                  <select
                    key="role"
                    value={member.membershipRole}
                    onChange={(event) => void changeMember(member, event.target.value as OrganizationMemberProfile["membershipRole"])}
                  >
                    <option value="ORGANIZATION_ADMIN">Administrator</option>
                    <option value="ORGANIZATION_ISSUER">Issuer</option>
                  </select>,
                  formatDate(member.joinedAt),
                  <button className="table-action danger-action" type="button" key="remove" onClick={() => void removeMember(member)}>Remove</button>,
                ])}
              />
            </div>
          </>
        )}

        {!loading && !error && isAdmin && active === "invitations" && (
          <>
            <PageHeader eyebrow="Membership" title="Invite trusted staff" copy="Raw invitation tokens are returned once and stored only as hashes." />
            <div className="two-column-form">
              <form className="content-card form-card" onSubmit={inviteMember}>
                <h2>New invitation</h2>
                <label>Email address<input name="email" type="email" required /></label>
                <label>Organization role
                  <select name="role" defaultValue="ORGANIZATION_ISSUER">
                    <option value="ORGANIZATION_ISSUER">Organization issuer</option>
                    <option value="ORGANIZATION_ADMIN">Organization administrator</option>
                  </select>
                </label>
                <label>Expires after
                  <select name="expiresInHours" defaultValue="72">
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </select>
                </label>
                <button className="workspace-primary" type="submit">Create invitation</button>
              </form>
              <div className="content-card">
                <div className="stack-list">
                  {invitations.map((invitation) => (
                    <article className="share-row" key={invitation.id}>
                      <div><StatusBadge status={invitation.state} /><h3>{invitation.email}</h3><p>{invitation.role.replaceAll("_", " ")}. Expires {formatDate(invitation.expiresAt)}.</p></div>
                      {invitation.state === "PENDING" && <button type="button" onClick={() => void revokeInvitation(invitation.id)}>Revoke</button>}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !error && isAdmin && active === "audit" && (
          <>
            <PageHeader eyebrow="Accountability" title="Organization audit log" copy="Sanitized and tenant-scoped history of sensitive actions." />
            <div className="content-card">
              <DataTable
                headers={["Action", "Resource", "Actor", "Date"]}
                rows={audit.map((entry) => [
                  <strong key="action">{entry.action.replaceAll("_", " ")}</strong>,
                  entry.resourceType,
                  entry.actor?.email ?? "System",
                  formatDate(entry.createdAt),
                ])}
              />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

export function RealAdminWorkspace({
  session,
  onExit,
}: {
  session: AuthSession;
  onExit: () => void;
}) {
  const [active, setActive] = useState("organizations");
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [audit, setAudit] = useState<SafeAuditLogEntry[]>([]);
  const [readiness, setReadiness] = useState({ api: "CHECKING", database: "CHECKING" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [organizationResponse, auditResponse] = await Promise.all([
        api.listAdminOrganizations(session.accessToken, "PENDING"),
        api.listPlatformAudit(session.accessToken),
      ]);
      setOrganizations(organizationResponse.data);
      setAudit(auditResponse.data);
      const [health, ready] = await Promise.allSettled([api.health(), api.ready()]);
      setReadiness({
        api: health.status === "fulfilled" ? "READY" : "UNAVAILABLE",
        database: ready.status === "fulfilled" ? "READY" : "UNAVAILABLE",
      });
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(organization: AdminOrganization, decision: "APPROVE" | "REJECT") {
    const rejectionReason = decision === "REJECT"
      ? window.prompt("Enter a clear rejection reason.")
      : undefined;
    if (decision === "REJECT" && !rejectionReason) return;
    try {
      await api.reviewOrganization(session.accessToken, organization.id, {
        decision,
        ...(rejectionReason ? { rejectionReason } : {}),
      });
      setOrganizations((current) => current.filter((item) => item.id !== organization.id));
      setNotice({ tone: "success", message: `Organization ${decision === "APPROVE" ? "approved" : "rejected"} and audit entry recorded.` });
    } catch (caught) {
      setNotice({ tone: "warning", message: messageFrom(caught) });
    }
  }

  const items = [
    { id: "organizations", label: "Organization review", icon: "▣" },
    { id: "audit", label: "Platform audit", icon: "≡" },
    { id: "readiness", label: "System readiness", icon: "✓" },
  ];

  return (
    <Shell roleLabel="Platform administrator" session={session} items={items} active={active} onActive={setActive} onExit={onExit}>
      <div className="workspace-content">
        {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
        {loading && <LoadingCard message="Loading platform operations..." />}
        {error && <ErrorCard message={error} onRetry={load} />}
        {!loading && !error && active === "organizations" && (
          <>
            <PageHeader eyebrow="Platform operations" title="Organization applications" copy="Review issuer applications before they can create trusted records." />
            <div className="metric-grid">
              <Metric label="Pending review" value={organizations.length} note="Requires an administrator decision" tone="gold" />
              <Metric label="API readiness" value={readiness.api} note="Liveness endpoint" tone="green" />
              <Metric label="Database" value={readiness.database} note="Readiness endpoint" />
              <Metric label="Audit entries" value={audit.length} note="Latest platform records" />
            </div>
            <div className="review-grid">
              {organizations.length === 0 && <div className="content-card empty-panel"><strong>No pending applications</strong><p>New organization applications will appear here.</p></div>}
              {organizations.map((organization) => (
                <article className="review-card" key={organization.id}>
                  <div className="review-card-head">
                    <div className="organization-avatar">{organization.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                    <div><StatusBadge status={organization.status} /><h2>{organization.name}</h2><p>{organization.country}</p></div>
                  </div>
                  <dl>
                    <div><dt>Contact</dt><dd>{organization.contactEmail}</dd></div>
                    <div><dt>Registration</dt><dd>{organization.registrationNumber ?? "Not supplied"}</dd></div>
                    <div><dt>Website</dt><dd>{organization.website ?? "Not supplied"}</dd></div>
                    <div><dt>Applied</dt><dd>{formatDate(organization.createdAt)}</dd></div>
                  </dl>
                  <p>{organization.description ?? "No description supplied."}</p>
                  <div className="review-actions">
                    <button className="reject-button" type="button" onClick={() => void review(organization, "REJECT")}>Reject</button>
                    <button className="approve-button" type="button" onClick={() => void review(organization, "APPROVE")}>Approve organization</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {!loading && !error && active === "audit" && (
          <>
            <PageHeader eyebrow="Platform accountability" title="Global audit log" copy="Cross-organization access is restricted to platform administrators." />
            <div className="content-card">
              <DataTable
                headers={["Action", "Organization", "Resource", "Actor", "Date"]}
                rows={audit.map((entry) => [
                  <strong key="action">{entry.action.replaceAll("_", " ")}</strong>,
                  entry.organizationId ?? "Platform",
                  entry.resourceType,
                  entry.actor?.email ?? "System",
                  formatDate(entry.createdAt),
                ])}
              />
            </div>
          </>
        )}
        {!loading && !error && active === "readiness" && (
          <>
            <PageHeader eyebrow="System operations" title="Deployment readiness" copy="Liveness and database readiness are checked separately." />
            <div className="readiness-grid">
              <article className="content-card readiness-card"><span className="readiness-icon">✓</span><div><p>API liveness</p><h2>{readiness.api}</h2><small>GET /api/v1/health</small></div></article>
              <article className="content-card readiness-card"><span className="readiness-icon">✓</span><div><p>Database readiness</p><h2>{readiness.database}</h2><small>GET /api/v1/ready</small></div></article>
              <article className="content-card readiness-card"><span className="readiness-icon">9</span><div><p>Database migrations</p><h2>Versioned</h2><small>Applied in order by Prisma</small></div></article>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

export function RealVerifierWorkspace({
  session,
  onExit,
}: {
  session: AuthSession;
  onExit: () => void;
}) {
  const [active, setActive] = useState("verify");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<PublicVerificationResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ title: string; result: string; checkedAt: string }>>([]);
  const items = [
    { id: "verify", label: "Verify credential", icon: "✓" },
    { id: "history", label: "Session history", icon: "≡" },
    { id: "guidance", label: "Decision guidance", icon: "?" },
    { id: "organization", label: "Organization workspace", icon: "⌂" },
  ];

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setUnavailable(false);
    try {
      const response = await api.verifyCredential(token.trim());
      setResult(response);
      setHistory((current) => [
        { title: response.credential.title, result: response.result, checkedAt: new Date().toISOString() },
        ...current,
      ]);
    } catch {
      setResult(null);
      setUnavailable(true);
      setHistory((current) => [
        { title: "Unavailable verification link", result: "UNAVAILABLE", checkedAt: new Date().toISOString() },
        ...current,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function changeActive(id: string) {
    if (id === "organization") {
      navigate("/app/organization");
      return;
    }
    setActive(id);
  }

  return (
    <Shell roleLabel="Employer or verifier" session={session} items={items} active={active} onActive={changeActive} onExit={onExit}>
      <div className="workspace-content">
        {active === "verify" && (
          <>
            <PageHeader eyebrow="Source confirmation" title="Verify a shared credential" copy="The result confirms source-record status. It does not make the hiring decision." />
            <div className="verifier-layout">
              <form className="content-card form-card" onSubmit={verify}>
                <h2>Enter verification token</h2>
                <p>Paste the token from the holder-approved URL. QR scanning is available in the mobile app.</p>
                <label>Verification token<input value={token} onChange={(event) => setToken(event.target.value)} required /></label>
                <button className="workspace-primary" type="submit" disabled={loading}>{loading ? "Checking..." : "Check record"}</button>
                <div className="safe-failure-note">Unknown, expired, revoked, and exhausted links return the same generic unavailable state.</div>
              </form>
              <VerificationPanel result={result} unavailable={unavailable} />
            </div>
          </>
        )}
        {active === "history" && (
          <>
            <PageHeader eyebrow="Current browser session" title="Recent verification activity" copy="Persistent verifier history is not part of the current backend model." />
            <div className="content-card">
              <DataTable
                headers={["Credential", "Result", "Checked"]}
                rows={history.map((entry) => [
                  entry.title,
                  <StatusBadge key="status" status={entry.result} />,
                  formatDate(entry.checkedAt),
                ])}
              />
            </div>
          </>
        )}
        {active === "guidance" && (
          <>
            <PageHeader eyebrow="Verification policy" title="What a result means" copy="VerifiedDoc confirms a source record. The verifier evaluates suitability independently." />
            <div className="guidance-grid">
              <article className="content-card"><span>VALID</span><h2>Current issuer-backed record</h2><p>Review the disclosed fields and apply your own decision policy.</p></article>
              <article className="content-card"><span>EXPIRED</span><h2>Credential validity ended</h2><p>The issuer record exists, but its effective expiry date has passed.</p></article>
              <article className="content-card"><span>REVOKED</span><h2>Issuer withdrew the record</h2><p>The public result shows revocation state and timestamp, but not the private reason.</p></article>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

function VerificationPanel({
  result,
  unavailable,
}: {
  result: PublicVerificationResponse | null;
  unavailable: boolean;
}) {
  if (result) {
    return (
      <article className="verification-card">
        <div className="verification-card-head">
          <span>✓</span>
          <div><small>Verification result</small><h3>{result.result}</h3></div>
        </div>
        <dl>
          <div><dt>Credential</dt><dd>{result.credential.title}</dd></div>
          <div><dt>Issuer</dt><dd>{result.credential.organization.name}</dd></div>
          <div><dt>Status</dt><dd><StatusBadge status={result.credential.effectiveStatus} /></dd></div>
          <div><dt>Issued</dt><dd>{formatDate(result.credential.issuedAt)}</dd></div>
          {result.credential.holderName && <div><dt>Holder</dt><dd>{result.credential.holderName}</dd></div>}
        </dl>
      </article>
    );
  }
  return (
    <div className={unavailable ? "verify-placeholder verify-unavailable" : "verify-placeholder"}>
      <span>{unavailable ? "!" : "✓"}</span>
      <h3>{unavailable ? "Verification unavailable" : "Ready to verify"}</h3>
      <p>{unavailable ? "The link is invalid or no longer available. No additional detail is exposed." : "Enter a holder-approved token to check the record."}</p>
    </div>
  );
}

export function RealInvitationAcceptPage({
  session,
}: {
  session: AuthSession | null;
}) {
  const storageKey = "verifieddoc.pendingInvitationToken";
  const [token, setToken] = useState(() => {
    const hashToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
    if (hashToken) {
      window.sessionStorage.setItem(storageKey, hashToken);
      window.history.replaceState({}, "", window.location.pathname);
      return hashToken;
    }
    return window.sessionStorage.getItem(storageKey) ?? "";
  });
  const [status, setStatus] = useState<"idle" | "loading" | "accepted" | "error">("idle");
  const [message, setMessage] = useState("");

  async function accept() {
    if (!session || !token) return;
    setStatus("loading");
    try {
      await api.acceptInvitation(session.accessToken, token);
      window.sessionStorage.removeItem(storageKey);
      setToken("");
      setStatus("accepted");
      setMessage("Invitation accepted. Your organization workspace is ready.");
    } catch (caught) {
      setStatus("error");
      setMessage(messageFrom(caught));
    }
  }

  return (
    <div className="simple-page">
      <header><Brand /><button type="button" onClick={() => navigate("/")}>Back home</button></header>
      <section className="simple-card">
        <span className="large-mark">{status === "accepted" ? "✓" : "↗"}</span>
        <p className="section-label">Organization invitation</p>
        <h1>{status === "accepted" ? "Invitation accepted" : "Join an issuing organization"}</h1>
        {!token && status !== "accepted" && <p>No invitation token was found. Ask the organization administrator for a new link.</p>}
        {token && !session && (
          <>
            <p>The private token was read from the URL fragment and kept only for this browser session. Sign in with the invited email to continue.</p>
            <button className="primary-button" type="button" onClick={() => navigate("/auth")}>Sign in to accept</button>
          </>
        )}
        {token && session && status !== "accepted" && (
          <>
            <p>Accept this invitation as <strong>{session.user.email}</strong>.</p>
            {status === "error" && <p className="form-error">{message}</p>}
            <button className="primary-button" type="button" disabled={status === "loading"} onClick={() => void accept()}>{status === "loading" ? "Accepting..." : "Accept invitation"}</button>
          </>
        )}
        {status === "accepted" && (
          <>
            <p>{message}</p>
            <button className="primary-button" type="button" onClick={() => navigate("/app/organization")}>Open organization workspace</button>
          </>
        )}
      </section>
    </div>
  );
}
