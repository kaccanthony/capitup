import { z } from "zod";

export const signInRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  next: z.string().trim().max(2048).optional(),
  captchaToken: z.string().trim().max(4096).optional(),
});

export const invitationInputSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  initialRole: z.enum([
    "junior_officer",
    "publicity_director",
    "pro",
    "executive",
    "org_admin",
  ]),
  validUntil: z.string().datetime().nullable(),
});

export const membershipStatusInputSchema = z.object({
  organizationId: z.string().uuid(),
  membershipId: z.string().uuid(),
  status: z.enum(["active", "suspended", "expired"]),
  reason: z.string().trim().min(1).max(500),
});

export const roleChangeInputSchema = z.object({
  organizationId: z.string().uuid(),
  membershipId: z.string().uuid(),
  role: z.enum([
    "junior_officer",
    "publicity_director",
    "pro",
    "executive",
    "org_admin",
  ]),
  reason: z.string().trim().min(1).max(500),
});

export const roleRevocationInputSchema = z.object({
  organizationId: z.string().uuid(),
  roleAssignmentId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});
