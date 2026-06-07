-- Closeka RLS Policies
-- Run AFTER drizzle migration is applied
-- This file enables Row Level Security and adds policies on all tables
-- All access goes through Clerk-authenticated server-side code (service_role) for MVP.
-- RLS is enabled to make the schema production-ready for future direct client queries.

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Supabase default)
-- The service_role key bypasses RLS by default; no policy needed for it.

-- Example policy pattern for future client-side direct access:
-- A user can see their workspaces only if they are a member.
-- CREATE POLICY "users_see_own_workspaces" ON workspaces FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM workspace_members wm
--       WHERE wm.workspace_id = workspaces.id
--       AND wm.clerk_user_id = (auth.jwt() ->> 'sub')
--     )
--   );

-- For MVP: policies are left open to service_role.
-- To enforce: uncomment the policies below and remove the "open" service_role bypass.

-- CREATE POLICY "users_see_own_workspaces" ON workspaces FOR SELECT TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM workspace_members wm
--       WHERE wm.workspace_id = workspaces.id
--       AND wm.clerk_user_id = (auth.jwt() ->> 'sub')
--     )
--   );
--
-- CREATE POLICY "users_see_own_memberships" ON workspace_members FOR SELECT TO authenticated
--   USING (clerk_user_id = (auth.jwt() ->> 'sub'));
--
-- CREATE POLICY "users_see_own_clients" ON clients FOR SELECT TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM workspace_members wm
--       WHERE wm.workspace_id = clients.workspace_id
--       AND wm.clerk_user_id = (auth.jwt() ->> 'sub')
--     )
--   );
--
-- (repeat pattern for close_periods, checklist_items, documents, etc.)
