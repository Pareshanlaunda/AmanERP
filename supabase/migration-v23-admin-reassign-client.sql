-- Allow admins to reassign client ownership (submitted_by).

DROP POLICY IF EXISTS "Admins update onboardings" ON public.client_onboardings;
CREATE POLICY "Admins update onboardings"
  ON public.client_onboardings FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

COMMENT ON POLICY "Admins update onboardings" ON public.client_onboardings IS
  'Admins can reassign client_onboardings.submitted_by to another employee.';
