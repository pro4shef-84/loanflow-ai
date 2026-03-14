-- =============================================================================
-- Migration 005: Storage RLS + Missing Table Policies
-- Fixes: rate-sheets bucket upload RLS failure
-- Adds: storage bucket creation + RLS policies for rate-sheets & documents
-- Adds: missing RLS policies on lender_submissions (via loan_files ownership)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- Create private buckets for rate sheets and documents if they don't exist
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('rate-sheets', 'rate-sheets', false)
  ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', false)
  ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- STORAGE RLS: rate-sheets bucket
-- Any authenticated user (loan officer) can upload/read/delete rate sheets
-- Ownership is enforced at the application level via rate_sheets table
-- -----------------------------------------------------------------------------
CREATE POLICY "officers_upload_rate_sheets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'rate-sheets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "officers_read_rate_sheets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'rate-sheets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "officers_delete_rate_sheets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'rate-sheets'
    AND auth.uid() IS NOT NULL
  );

-- -----------------------------------------------------------------------------
-- STORAGE RLS: documents bucket
-- Authenticated users can upload and read documents
-- Service role handles portal uploads (anonymous borrowers)
-- -----------------------------------------------------------------------------
CREATE POLICY "users_upload_documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "users_read_documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "service_role_documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND auth.role() = 'service_role'
  );

CREATE POLICY "anon_portal_documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'service_role'
  );

-- -----------------------------------------------------------------------------
-- FIX: lender_submissions RLS
-- The existing policy uses submitted_by = auth.uid(), but it should also
-- allow access via loan_files ownership for consistency with other tables.
-- Drop the old policy and create a more comprehensive one.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own submissions" ON public.lender_submissions;

CREATE POLICY "Users can manage own submissions" ON public.lender_submissions
  FOR ALL USING (
    auth.uid() = submitted_by
    OR EXISTS (
      SELECT 1 FROM public.loan_files
      WHERE loan_files.id = lender_submissions.loan_file_id
        AND loan_files.user_id = auth.uid()
    )
  );
