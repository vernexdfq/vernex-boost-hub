-- Existing notification rows may have been created before the Verxor rebrand.
-- Update only user-facing notification copy; do not alter unrelated data.
update public.notifications
set
  title = regexp_replace(title, 'vernex', 'Verxor', 'gi'),
  body = regexp_replace(body, 'vernex', 'Verxor', 'gi')
where title ~* 'vernex'
   or body ~* 'vernex';
