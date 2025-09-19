-- Enable RLS on Storage objects and enforce read-access via user_course_access

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow SELECT from course-materials only to owners (via user_course_access) or admins
CREATE POLICY IF NOT EXISTS storage_read_course_materials
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    -- Owner access: name should be like course/<document_id>/...
    EXISTS (
      SELECT 1
      FROM public.user_course_access a
      WHERE a.user_id = auth.uid()
        AND a.revoked_at IS NULL
        AND a.document_id = (
          NULLIF(substring(name FROM '^course/([0-9a-fA-F-]+)/'), '')::uuid
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
);

-- Deny INSERT/UPDATE/DELETE for authenticated users; service role bypasses RLS
CREATE POLICY IF NOT EXISTS storage_no_write_authenticated
ON storage.objects
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);


