import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  primaryContactName: z.string().max(200).optional().or(z.literal("")),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(5_000).optional().or(z.literal("")),
});

export const createClosePeriodSchema = z.object({
  clientId: z.string().uuid(),
  periodLabel: z.string().min(1).max(64),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export const checklistItemSchema = z.object({
  closePeriodId: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(2_000).optional().or(z.literal("")),
  dueAt: z.string().datetime().optional(),
  assigneeEmail: z.string().email().optional().or(z.literal("")),
});

export const approveDraftSchema = z.object({
  draftId: z.string().uuid(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20_000),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateClosePeriodInput = z.infer<typeof createClosePeriodSchema>;
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
export type ApproveDraftInput = z.infer<typeof approveDraftSchema>;
