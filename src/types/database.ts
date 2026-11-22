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

export type CollaborationAccessMode = "read" | "write";
export type CollaborationSuggestionKind = "insert" | "delete" | "replace";
export type CollaborationSuggestionState =
  "open" | "accepted" | "rejected" | "stale";
export type CaptionReactionKind = "looks_ready" | "needs_refinement";
export type CaptionPolicyWarningState =
  | "within_recommendation"
  | "approaching_recommendation"
  | "over_recommendation"
  | "over_hard_maximum"
  | "over_platform_maximum"
  | "unconfigured";
export type WorkflowInstanceStatus =
  "in_review" | "changes_requested" | "approved";
export type WorkflowStepStatus =
  "pending" | "approved" | "changes_requested" | "skipped";
export type WorkflowStepKind =
  "publicity_director" | "pro" | "president" | "junior_officer_unanimous";

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
          notion_event_starts_at: string | null;
          notion_deadline_at: string | null;
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
          notion_event_starts_at?: string | null;
          notion_deadline_at?: string | null;
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
          scheduled_publication_at: string | null;
          approval_policy_fingerprint: string | null;
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
          scheduled_publication_at?: string | null;
          approval_policy_fingerprint?: string | null;
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
      caption_drafts: {
        Row: {
          content_item_id: string;
          editor_json: Json;
          plain_text: string;
          normalized_text: string;
          draft_version: number;
          updated_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          content_item_id: string;
          editor_json?: Json;
          plain_text?: string;
          normalized_text?: string;
          draft_version?: number;
          updated_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["caption_drafts"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      caption_versions: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          version_number: number;
          editor_json: Json;
          plain_text: string;
          normalized_text: string;
          submitted_by_user_id: string;
          submitted_at: string;
          collaboration_room_id: string | null;
          collaboration_snapshot_version_id: string | null;
          collaboration_document_revision: number | null;
          snapshot_hash: string | null;
          word_count: number | null;
          grapheme_count: number | null;
          word_policy_configured: boolean | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          version_number: number;
          editor_json: Json;
          plain_text: string;
          normalized_text: string;
          submitted_by_user_id: string;
          submitted_at?: string;
          collaboration_room_id?: string | null;
          collaboration_snapshot_version_id?: string | null;
          collaboration_document_revision?: number | null;
          snapshot_hash?: string | null;
          word_count?: number | null;
          grapheme_count?: number | null;
          word_policy_configured?: boolean | null;
        };
        Update: never;
        Relationships: NoRelationships;
      };
      caption_word_policies: {
        Row: {
          id: string;
          organization_id: string;
          content_tag_id: number;
          policy_version: string;
          recommended_word_limit: number;
          approaching_offset_words: number;
          global_hard_maximum_words: number;
          enabled: boolean;
          effective_at: string;
          policy_timezone: string;
          source_reference: string;
          owner_reference: string;
          supplied_or_approved_by_user_id: string | null;
          superseded_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      caption_version_word_policy_evidence: {
        Row: {
          caption_version_id: string;
          policy_id: string;
          policy_version: string;
          content_tag_id: number;
          evaluated_word_count: number;
          recommended_word_limit: number;
          approaching_offset_words: number;
          global_hard_maximum_words: number;
          warning_state: CaptionPolicyWarningState;
          recommendation_exempt: boolean;
          exemption_reason: string | null;
          policy_effective_at: string;
          policy_timezone: string;
          source_reference: string;
          owner_reference: string;
          evaluated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      caption_version_destination_policy_evidence: {
        Row: {
          caption_version_id: string;
          publication_channel_id: string;
          policy_id: string | null;
          policy_version: string | null;
          destination_slug: string;
          destination_label: string;
          evaluated_grapheme_count: number;
          character_limit: number | null;
          limit_classification: DestinationLimitClassification | null;
          warning_state: CaptionPolicyWarningState;
          policy_effective_at: string | null;
          policy_timezone: string | null;
          source_reference: string | null;
          owner_reference: string | null;
          evaluated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      workflow_instances: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          caption_version_id: string;
          status: WorkflowInstanceStatus;
          current_step_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      workflow_instance_steps: {
        Row: {
          id: string;
          instance_id: string;
          step_order: number;
          kind: WorkflowStepKind;
          status: WorkflowStepStatus;
          decided_by_user_id: string | null;
          decision_reason: string | null;
          decided_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      workflow_notifications: {
        Row: {
          id: string;
          recipient_user_id: string;
          organization_id: string;
          content_item_id: string;
          workflow_instance_id: string | null;
          caption_version_id: string | null;
          kind: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      caption_reactions: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          caption_version_id: string;
          actor_user_id: string;
          kind: CaptionReactionKind;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      ai_style_profiles: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string | null;
          scope: string;
          owner_user_id: string;
          name: string;
          status: string;
          active_version_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      ai_style_profile_versions: {
        Row: {
          id: string;
          profile_id: string;
          version_number: number;
          rules: Json;
          created_by_user_id: string;
          created_at: string;
          activated_at: string | null;
          activated_by_user_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      collaboration_documents: {
        Row: {
          content_item_id: string;
          organization_id: string;
          project_id: string;
          room_id: string;
          field_name: string;
          document_revision: number;
          latest_snapshot_version_id: string | null;
          latest_snapshot_hash: string | null;
          latest_snapshot_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          content_item_id: string;
          organization_id: string;
          project_id: string;
          room_id: string;
          field_name?: string;
          document_revision?: number;
          latest_snapshot_version_id?: string | null;
          latest_snapshot_hash?: string | null;
          latest_snapshot_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_documents"]["Insert"]
        >;
        Relationships: NoRelationships;
      };
      collaboration_sessions: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          user_id: string;
          access_mode: CollaborationAccessMode;
          authorized_at: string;
          last_revalidated_at: string;
          expires_at: string;
          revoked_at: string | null;
          revocation_reason: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      collaboration_threads: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          anchor: Json;
          created_by_user_id: string;
          resolved_by_user_id: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      collaboration_comments: {
        Row: {
          id: string;
          thread_id: string;
          parent_comment_id: string | null;
          author_user_id: string;
          body: string;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      collaboration_mentions: {
        Row: {
          comment_id: string;
          mentioned_user_id: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      collaboration_suggestions: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          author_user_id: string;
          kind: CollaborationSuggestionKind;
          anchor: Json;
          source_text: string;
          replacement_text: string;
          state: CollaborationSuggestionState;
          record_version: number;
          decided_by_user_id: string | null;
          decided_at: string | null;
          decision_reason: string | null;
          applied_by_user_id: string | null;
          applied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      collaboration_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          content_item_id: string;
          actor_user_id: string;
          thread_id: string | null;
          comment_id: string | null;
          suggestion_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      integration_connections: {
        Row: {
          id: string;
          organization_id: string;
          provider: "notion";
          label: string;
          status: "configured" | "active" | "degraded" | "disabled";
          notion_workspace_id: string;
          notion_subscription_id: string;
          notion_data_source_id: string;
          field_mappings: Json;
          mapping_version: number;
          configured_by_user_id: string;
          last_success_at: string | null;
          last_failure_at: string | null;
          last_error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      notion_object_links: {
        Row: {
          id: string;
          integration_connection_id: string;
          organization_id: string;
          project_id: string;
          notion_page_id: string;
          last_external_edited_at: string | null;
          last_import_hash: string | null;
          last_export_hash: string | null;
          last_imported_at: string | null;
          last_exported_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      webhook_events: {
        Row: {
          id: string;
          integration_connection_id: string;
          provider_event_id: string;
          provider_event_type: string;
          provider_timestamp: string;
          external_object_id: string;
          payload_sha256: string;
          state: string;
          received_at: string;
          processed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      sync_runs: {
        Row: {
          id: string;
          integration_connection_id: string;
          webhook_event_id: string | null;
          object_link_id: string | null;
          direction: "import" | "export" | "reconcile";
          state: string;
          attempt_number: number;
          next_attempt_at: string | null;
          error_code: string | null;
          input_hash: string | null;
          output_hash: string | null;
          initiated_by_user_id: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      sync_conflicts: {
        Row: {
          id: string;
          integration_connection_id: string;
          object_link_id: string | null;
          sync_run_id: string | null;
          kind: string;
          state: "open" | "resolved";
          detail_code: string;
          resolved_by_user_id: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: NoRelationships;
      };
      dead_letter_events: {
        Row: {
          id: string;
          integration_connection_id: string;
          webhook_event_id: string | null;
          sync_run_id: string | null;
          reason_code: string;
          replay_count: number;
          replayed_by_user_id: string | null;
          resolved_at: string | null;
          created_at: string;
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
      update_scheduled_publication_time: {
        Args: {
          p_content_item_id: string;
          p_expected_version: number;
          p_scheduled_publication_at: string | null;
        };
        Returns: boolean;
      };
      record_content_policy_evaluation: {
        Args: {
          p_content_item_id: string;
          p_expected_version: number;
          p_policy_fingerprint: string;
        };
        Returns: boolean;
      };
      authorize_collaboration_session: {
        Args: { p_content_item_id: string };
        Returns: {
          session_id: string;
          user_id: string;
          organization_id: string;
          room_id: string;
          access_mode: CollaborationAccessMode;
          expires_at: string;
          display_name: string;
        }[];
      };
      revalidate_collaboration_session: {
        Args: { p_content_item_id: string };
        Returns: {
          session_id: string;
          access_mode: CollaborationAccessMode;
          expires_at: string;
          revoked: boolean;
          reason: string | null;
        }[];
      };
      create_collaboration_thread: {
        Args: {
          p_content_item_id: string;
          p_anchor: Json;
          p_body: string;
          p_mentioned_user_ids?: string[];
        };
        Returns: string;
      };
      reply_to_collaboration_thread: {
        Args: {
          p_thread_id: string;
          p_body: string;
          p_mentioned_user_ids?: string[];
        };
        Returns: string;
      };
      resolve_collaboration_thread: {
        Args: { p_thread_id: string; p_resolved: boolean };
        Returns: boolean;
      };
      create_collaboration_suggestion: {
        Args: {
          p_content_item_id: string;
          p_kind: CollaborationSuggestionKind;
          p_anchor: Json;
          p_source_text: string;
          p_replacement_text: string;
        };
        Returns: string;
      };
      decide_collaboration_suggestion: {
        Args: {
          p_suggestion_id: string;
          p_expected_version: number;
          p_action: string;
          p_reason?: string | null;
        };
        Returns: boolean;
      };
      mark_collaboration_suggestion_applied: {
        Args: { p_suggestion_id: string; p_expected_version: number };
        Returns: boolean;
      };
      set_caption_reaction: {
        Args: {
          p_caption_version_id: string;
          p_kind: CaptionReactionKind | null;
          p_comment?: string | null;
        };
        Returns: string | null;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: boolean;
      };
      get_collaboration_capabilities: {
        Args: { p_content_item_id: string };
        Returns: {
          access_mode: CollaborationAccessMode;
          can_comment: boolean;
          can_suggest: boolean;
          can_review: boolean;
        }[];
      };
      list_collaboration_workflow_templates: {
        Args: { p_content_item_id: string };
        Returns: { id: string; name: string }[];
      };
      finalize_collaboration_snapshot: {
        Args: {
          p_actor_user_id: string;
          p_organization_id: string;
          p_project_id: string;
          p_project_assignment_id: string;
          p_content_item_id: string;
          p_template_id: string;
          p_room_id: string;
          p_expected_item_record_version: number;
          p_expected_document_revision: number;
          p_snapshot_version_id: string;
          p_editor_json: Json;
          p_plain_text: string;
          p_normalized_text: string;
          p_snapshot_hash: string;
          p_word_count: number;
          p_grapheme_count: number;
        };
        Returns: string;
      };
      configure_notion_integration: {
        Args: {
          p_organization_id: string;
          p_label: string;
          p_workspace_id: string;
          p_subscription_id: string;
          p_data_source_id: string;
          p_field_mappings: Json;
        };
        Returns: string;
      };
      activate_notion_integration: {
        Args: { p_connection_id: string };
        Returns: boolean;
      };
      replay_notion_dead_letter: {
        Args: { p_dead_letter_id: string };
        Returns: string;
      };
      resume_notion_sync_run: {
        Args: { p_sync_run_id: string };
        Returns: string;
      };
      resolve_notion_sync_conflict: {
        Args: { p_conflict_id: string };
        Returns: boolean;
      };
      accept_notion_webhook_event: {
        Args: {
          p_workspace_id: string;
          p_subscription_id: string;
          p_provider_event_id: string;
          p_provider_event_type: string;
          p_provider_timestamp: string;
          p_external_object_id: string;
          p_payload_sha256: string;
        };
        Returns: { webhook_event_id: string; is_duplicate: boolean }[];
      };
      apply_notion_project_import: {
        Args: {
          p_webhook_event_id: string;
          p_external_page_id: string;
          p_external_edited_at: string;
          p_title: string;
          p_event_starts_at: string | null;
          p_deadline_at: string | null;
          p_payload_hash: string;
        };
        Returns: { project_id: string; applied: boolean }[];
      };
      record_notion_sync_failure: {
        Args: {
          p_sync_run_id: string;
          p_state: string;
          p_error_code: string;
          p_next_attempt_at?: string | null;
        };
        Returns: boolean;
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
      collaboration_access_mode: CollaborationAccessMode;
      collaboration_suggestion_kind: CollaborationSuggestionKind;
      collaboration_suggestion_state: CollaborationSuggestionState;
      caption_reaction_kind: CaptionReactionKind;
      caption_policy_warning_state: CaptionPolicyWarningState;
      destination_limit_classification: DestinationLimitClassification;
      content_status: ContentStatus;
      project_content_event_type: ProjectContentEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};
