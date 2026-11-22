# First organization administrator bootstrap

Run this **once**, in the intended Supabase project's SQL Editor, after the Phase 02 migration has been applied and before the first sign-in. Review the project and replace the two placeholders with the approved organization slug and Kent's exact institutional email. Do not commit the real email or run this against another project. This creates a pending invitation; it does not create an Auth user or password.

```sql
begin;

with new_organization as (
  insert into public.organizations (slug, display_name)
  values ('feu-tech-acm', 'FEU Tech ACM Student Chapter')
  returning id
), first_invitation as (
  insert into public.member_allowlist (
    organization_id, normalized_email, initial_role
  )
  select id, lower(btrim('kccapuno@fit.edu.ph')), 'org_admin'::public.organization_role
  from new_organization
  returning id, organization_id, normalized_email
), first_membership as (
  insert into public.organization_memberships (
    organization_id, allowlist_entry_id, normalized_email, status
  )
  select organization_id, id, normalized_email, 'invited'::public.organization_membership_status
  from first_invitation
  returning id
)
insert into public.access_security_events (
  organization_id, allowlist_entry_id, event_type, outcome, reason_code
)
select organization_id, id, 'invitation_created', 'succeeded', 'first_admin_bootstrap'
from first_invitation;

commit;
```

Before running, verify the email is correct, unique, and belongs to the intended administrator. Confirm exactly one `pending` allowlist entry and one `invited` membership afterward. Configure the Supabase **Before User Created** hook to call `public.before_user_created`, then enable Google OAuth and the approved email/password fallback. A first sign-in with the invited email claims the locked allowlist row and receives `org_admin` from `initial_role`; an unlisted new email is denied by the hook, and an existing account without active membership is denied by the application gate. Email/password users need a separately provisioned password through the approved Auth administration process; this UI has no public signup or password reset path. OAuth/provider account setup and production URL allowlisting still require hosted configuration. Do not enable public self-registration as a substitute for this procedure.
