export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationRole =
  "junior_officer" | "publicity_director" | "pro" | "executive" | "org_admin";

export type OrganizationMembershipStatus =
  "invited" | "active" | "suspended" | "expired";

export type AllowlistEntryStatus =
  "pending" | "claimed" | "revoked" | "expired";

export type AccessSecurityEventType =
  | "invitation_created"
  | "invitation_revoked"
  | "user_creation_allowed"
  | "user_creation_denied"
  | "membership_claimed"
  | "membership_claim_denied"
  | "membership_suspended"
  | "membership_restored"
  | "membership_expired"
  | "role_granted"
  | "role_revoked"
  | "authentication_succeeded"
  | "authentication_denied"
  | "sign_out"
  | "protected_access_denied"
  | "security_block_cleared";

export type AccessSecurityEventOutcome = "succeeded" | "denied" | "failed";

export type ProjectAssignmentRole =
  "publicity_head" | "co_project_head" | "project_head" | "writer" | "viewer";

export type ContentResponsibility = "writer" | "reviewer";

export type DestinationLimitClassification =
  | "platform_based"
  | "organization_defined_destination"
  | "organization_defined_platform_aligned"
  | "platform_hard_limit"
  | "temporary_organization_defined";

export type ContentStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "awaiting_final_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export type ProjectContentEventType =
  | "project_created"
  | "project_updated"
  | "project_assignment_granted"
  | "project_assignment_revoked"
  | "content_created"
  | "content_updated"
  | "content_special_case_changed"
  | "content_responsibility_granted"
  | "content_responsibility_revoked"
  | "deliverable_created"
  | "deliverable_updated"
  | "deliverable_deleted";

type NoRelationships = [];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          display_name?: string;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      organization_identity_requirements: {
        Row: {
          id: string;
          organization_id: string;
          provider: string;
          claim_name: string;
          approved_email_domain: string | null;
          enabled: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider: string;
          claim_name?: string;
          approved_email_domain?: string | null;
          enabled?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider?: string;
          claim_name?: string;
          approved_email_domain?: string | null;
          enabled?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          institutional_identifier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string;
          institutional_identifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          institutional_identifier?: string | null;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      member_allowlist: {
        Row: {
          id: string;
          organization_id: string;
          normalized_email: string | null;
          identity_provider: string | null;
          provider_subject: string | null;
          status: AllowlistEntryStatus;
          initial_role: OrganizationRole;
          valid_from: string;
          valid_until: string | null;
          claimed_by_user_id: string | null;
          claimed_at: string | null;
          created_by: string | null;
          revoked_by: string | null;
          revoked_at: string | null;
          revocation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          normalized_email?: string | null;
          identity_provider?: string | null;
          provider_subject?: string | null;
          status?: AllowlistEntryStatus;
          initial_role?: OrganizationRole;
          valid_from?: string;
          valid_until?: string | null;
          claimed_by_user_id?: string | null;
          claimed_at?: string | null;
          created_by?: string | null;
          revoked_by?: string | null;
          revoked_at?: string | null;
          revocation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["member_allowlist"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          allowlist_entry_id: string;
          user_id: string | null;
          normalized_email: string | null;
          status: OrganizationMembershipStatus;
          valid_from: string;
          valid_until: string | null;
          invited_by: string | null;
          activated_at: string | null;
          suspended_by: string | null;
          suspended_at: string | null;
          restored_by: string | null;
          restored_at: string | null;
          expired_by: string | null;
          expired_at: string | null;
          status_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          allowlist_entry_id: string;
          user_id?: string | null;
          normalized_email?: string | null;
          status?: OrganizationMembershipStatus;
          valid_from?: string;
          valid_until?: string | null;
          invited_by?: string | null;
          activated_at?: string | null;
          suspended_by?: string | null;
          suspended_at?: string | null;
          restored_by?: string | null;
          restored_at?: string | null;
          expired_by?: string | null;
          expired_at?: string | null;
          status_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_memberships"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      organization_role_assignments: {
        Row: {
          id: string;
          membership_id: string;
          role: OrganizationRole;
          starts_at: string;
          ends_at: string | null;
          granted_by: string | null;
          revoked_by: string | null;
          revoked_at: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          membership_id: string;
          role: OrganizationRole;
          starts_at?: string;
          ends_at?: string | null;
          granted_by?: string | null;
          revoked_by?: string | null;
          revoked_at?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_role_assignments"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      access_security_events: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_user_id: string | null;
          subject_user_id: string | null;
          membership_id: string | null;
          allowlist_entry_id: string | null;
          role_assignment_id: string | null;
          event_type: AccessSecurityEventType;
          outcome: AccessSecurityEventOutcome;
          reason_code: string;
          request_correlation_id: string;
          metadata: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          actor_user_id?: string | null;
          subject_user_id?: string | null;
          membership_id?: string | null;
          allowlist_entry_id?: string | null;
          role_assignment_id?: string | null;
          event_type: AccessSecurityEventType;
          outcome: AccessSecurityEventOutcome;
          reason_code: string;
          request_correlation_id?: string;
          metadata?: Json;
          occurred_at?: string;
        };
        Update: never;
        Relationships: NoRelationships;
      };
      content_formats: {
        Row: {
          id: number;
          slug: "post" | "video" | "article";
          display_label: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          slug: "post" | "video" | "article";
          display_label: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["content_formats"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      content_tags: {
        Row: {
          id: number;
          slug: string;
          display_label: string;
          emoji: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          slug: string;
          display_label: string;
          emoji: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_tags"]["Insert"]>;
        Relationships: NoRelationships;
      };
      content_format_tags: {
        Row: { content_format_id: number; content_tag_id: number };
        Insert: { content_format_id: number; content_tag_id: number };
        Update: never;
        Relationships: NoRelationships;
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          created_by_user_id: string;
          record_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          created_by_user_id: string;
          record_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: NoRelationships;
      };
      project_assignments: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          membership_id: string;
          role: ProjectAssignmentRole;
          starts_at: string;
          ends_at: string | null;
          assigned_by_user_id: string;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
          revocation_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          membership_id: string;
          role: ProjectAssignmentRole;
          starts_at?: string;
          ends_at?: string | null;
          assigned_by_user_id: string;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          revocation_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_assignments"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      content_items: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_format_id: number;
          title: string;
          status: ContentStatus;
          is_special_case: boolean;
          special_case_reason: string | null;
          created_by_user_id: string;
          record_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          content_format_id: number;
          title: string;
          status?: ContentStatus;
          is_special_case?: boolean;
          special_case_reason?: string | null;
          created_by_user_id: string;
          record_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["content_items"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      content_item_tags: {
        Row: {
          content_item_id: string;
          content_format_id: number;
          content_tag_id: number;
        };
        Insert: {
          content_item_id: string;
          content_format_id: number;
          content_tag_id: number;
        };
        Update: never;
        Relationships: NoRelationships;
      };
      publication_channels: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          display_label: string;
          active: boolean;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          display_label: string;
          active?: boolean;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["publication_channels"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      publication_channel_policies: {
        Row: {
          id: string;
          organization_id: string;
          publication_channel_id: string;
          policy_version: string;
          character_limit: number;
          limit_classification: DestinationLimitClassification;
          enabled: boolean;
          effective_at: string;
          policy_timezone: string;
          source_reference: string;
          owner_reference: string;
          supplied_or_approved_by_user_id: string | null;
          superseded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          publication_channel_id: string;
          policy_version: string;
          character_limit: number;
          limit_classification: DestinationLimitClassification;
          enabled?: boolean;
          effective_at: string;
          policy_timezone?: string;
          source_reference: string;
          owner_reference: string;
          supplied_or_approved_by_user_id?: string | null;
          superseded_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["publication_channel_policies"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      publication_channel_policy_content_kinds: {
        Row: {
          publication_channel_policy_id: string;
          content_format_id: number;
        };
        Insert: {
          publication_channel_policy_id: string;
          content_format_id: number;
        };
        Update: never;
        Relationships: NoRelationships;
      };
      content_publication_channels: {
        Row: {
          content_item_id: string;
          publication_channel_id: string;
          organization_id: string;
        };
        Insert: {
          content_item_id: string;
          publication_channel_id: string;
          organization_id: string;
        };
        Update: never;
        Relationships: NoRelationships;
      };
      deliverables: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          label: string;
          url: string;
          source_committee: string;
          deliverable_type: string;
          status: string | null;
          created_by_user_id: string;
          record_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          label: string;
          url: string;
          source_committee: string;
          deliverable_type: string;
          status?: string | null;
          created_by_user_id: string;
          record_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deliverables"]["Insert"]>;
        Relationships: NoRelationships;
      };
      content_item_assignments: {
        Row: {
          id: string;
          project_id: string;
          content_item_id: string;
          project_assignment_id: string;
          responsibility: ContentResponsibility;
          assigned_by_user_id: string;
          assigned_at: string;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
          revocation_reason: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          content_item_id: string;
          project_assignment_id: string;
          responsibility: ContentResponsibility;
          assigned_by_user_id: string;
          assigned_at?: string;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          revocation_reason?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["content_item_assignments"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      project_content_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string;
          project_id: string | null;
          content_item_id: string | null;
          project_assignment_id: string | null;
          content_assignment_id: string | null;
          deliverable_id: string | null;
          event_type: ProjectContentEventType;
          outcome: AccessSecurityEventOutcome;
          reason_code: string;
          request_correlation_id: string;
          metadata: Json;
          occurred_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_current_membership: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_current_membership_access: {
        Args: Record<PropertyKey, never>;
        Returns: {
          membership_id: string;
          organization_id: string;
          membership_status: OrganizationMembershipStatus;
          valid_from: string;
          valid_until: string | null;
          roles: OrganizationRole[];
          is_active: boolean;
        }[];
      };
      record_current_access_denied: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      record_current_sign_out: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      create_member_invitation: {
        Args: {
          p_organization_id: string;
          p_email: string;
          p_initial_role?: OrganizationRole;
          p_valid_until?: string | null;
        };
        Returns: string;
      };
      set_membership_status: {
        Args: {
          p_membership_id: string;
          p_status: OrganizationMembershipStatus;
          p_reason: string;
        };
        Returns: boolean;
      };
      grant_organization_role: {
        Args: {
          p_membership_id: string;
          p_role: OrganizationRole;
          p_reason: string;
        };
        Returns: string;
      };
      revoke_organization_role: {
        Args: {
          p_role_assignment_id: string;
          p_reason: string;
        };
        Returns: boolean;
      };
      initialize_launch_publication_destinations: {
        Args: { p_organization_id: string };
        Returns: number;
      };
      create_project: {
        Args: {
          p_organization_id: string;
          p_title: string;
          p_description?: string | null;
        };
        Returns: string;
      };
      update_project: {
        Args: {
          p_project_id: string;
          p_expected_version: number;
          p_title: string;
          p_description?: string | null;
        };
        Returns: boolean;
      };
      assign_project_member: {
        Args: {
          p_project_id: string;
          p_membership_id: string;
          p_role: ProjectAssignmentRole;
          p_starts_at?: string;
          p_ends_at?: string | null;
        };
        Returns: string;
      };
      revoke_project_assignment: {
        Args: { p_assignment_id: string; p_reason: string };
        Returns: boolean;
      };
      create_content_item: {
        Args: {
          p_project_id: string;
          p_title: string;
          p_format_slug: string;
          p_tag_slugs: string[];
          p_is_special_case?: boolean;
          p_special_case_reason?: string | null;
        };
        Returns: string;
      };
      update_content_metadata: {
        Args: {
          p_content_item_id: string;
          p_expected_version: number;
          p_title: string;
          p_format_slug: string;
          p_tag_slugs: string[];
          p_is_special_case: boolean;
          p_special_case_reason?: string | null;
        };
        Returns: boolean;
      };
      assign_content_responsibility: {
        Args: {
          p_content_item_id: string;
          p_project_assignment_id: string;
          p_responsibility: ContentResponsibility;
        };
        Returns: string;
      };
      revoke_content_responsibility: {
        Args: { p_content_assignment_id: string; p_reason: string };
        Returns: boolean;
      };
      add_deliverable: {
        Args: {
          p_content_item_id: string;
          p_label: string;
          p_url: string;
          p_source_committee: string;
          p_deliverable_type: string;
          p_status?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      organization_role: OrganizationRole;
      organization_membership_status: OrganizationMembershipStatus;
      allowlist_entry_status: AllowlistEntryStatus;
      access_security_event_type: AccessSecurityEventType;
      access_security_event_outcome: AccessSecurityEventOutcome;
      project_assignment_role: ProjectAssignmentRole;
      content_responsibility: ContentResponsibility;
      destination_limit_classification: DestinationLimitClassification;
      content_status: ContentStatus;
      project_content_event_type: ProjectContentEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};
