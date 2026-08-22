export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface OrgMember {
  userId: string;
  email: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrgClient {
  clientId: string;
  clientName: string;
  assignedDomains: string[];
  contactEmail?: string;
  createdAt: string;
}

export interface WhiteLabelConfig {
  logoUrl?: string;
  companyName?: string;
  supportEmail?: string;
  brandColor?: string;
  showLeadGuardAttribution: boolean;
}

export interface Organization {
  orgId: string;
  name: string;
  ownerUserId: string;
  members: OrgMember[];
  clients: OrgClient[];
  whiteLabel?: WhiteLabelConfig;
  createdAt: string;
}

export class OrgManager {
  private static orgsMap = new Map<string, Organization>();

  public static createOrganization(name: string, ownerUserId: string, ownerEmail: string): Organization {
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const org: Organization = {
      orgId,
      name,
      ownerUserId,
      members: [{ userId: ownerUserId, email: ownerEmail, role: 'OWNER', joinedAt: new Date().toISOString() }],
      clients: [],
      whiteLabel: { showLeadGuardAttribution: true },
      createdAt: new Date().toISOString(),
    };
    this.orgsMap.set(orgId, org);
    return org;
  }

  public static getOrganization(orgId: string): Organization | undefined {
    return this.orgsMap.get(orgId);
  }

  public static addClient(orgId: string, clientName: string, domains: string[], contactEmail?: string): OrgClient | null {
    const org = this.orgsMap.get(orgId);
    if (!org) return null;

    const client: OrgClient = {
      clientId: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clientName,
      assignedDomains: domains,
      contactEmail,
      createdAt: new Date().toISOString(),
    };
    org.clients.push(client);
    return client;
  }

  public static updateWhiteLabel(orgId: string, config: Partial<WhiteLabelConfig>): WhiteLabelConfig | null {
    const org = this.orgsMap.get(orgId);
    if (!org) return null;

    org.whiteLabel = {
      ...org.whiteLabel,
      ...config,
      showLeadGuardAttribution: config.showLeadGuardAttribution ?? org.whiteLabel?.showLeadGuardAttribution ?? true,
    };
    return org.whiteLabel;
  }

  public static hasPermission(orgId: string, userId: string, requiredRole: OrgRole): boolean {
    const org = this.orgsMap.get(orgId);
    if (!org) return false;
    const member = org.members.find(m => m.userId === userId);
    if (!member) return false;

    const roleHierarchy: Record<OrgRole, number> = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }
}
