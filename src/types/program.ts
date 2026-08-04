export type ProgramPlatform =
  | "HackerOne"
  | "Bugcrowd"
  | "Intigriti"
  | "YesWeHack"
  | "Private Program"
  | "Direct Disclosure"
  | "Other";
export type ScopeRuleType =
  | "Exact Domain"
  | "Wildcard Domain"
  | "Exact URL"
  | "URL Prefix"
  | "API Host"
  | "Mobile Application"
  | "Repository"
  | "Other";
export type ScopeDisposition =
  "In Scope" | "Out of Scope" | "Conditional" | "Unknown";
export interface ScopeRule {
  id: string;
  type: ScopeRuleType;
  value: string;
  disposition: ScopeDisposition;
  description?: string;
  conditions?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
}
export interface ProgramProfile {
  id: string;
  name: string;
  platform: ProgramPlatform;
  programUrl?: string;
  policyUrl?: string;
  contactEmail?: string;
  safeHarborSummary?: string;
  disclosurePolicySummary?: string;
  testingRestrictions?: string;
  rewardSummary?: string;
  responseExpectation?: string;
  notes?: string;
  scopeRules: ScopeRule[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}
export type AssetType =
  | "Domain"
  | "Subdomain"
  | "URL"
  | "API"
  | "Web Application"
  | "Mobile Application"
  | "Repository"
  | "IP Address"
  | "Other";
export interface AssetRecord {
  id: string;
  programId?: string;
  name: string;
  value: string;
  type: AssetType;
  environment?: "Production" | "Staging" | "Development" | "Unknown";
  scopeDisposition: ScopeDisposition;
  scopeRuleId?: string;
  tags: string[];
  notes?: string;
  firstObservedAt?: string;
  lastReviewedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
