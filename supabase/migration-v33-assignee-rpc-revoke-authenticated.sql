-- replace_lead_additional_assignees is only called via service_role (createAdminClient).
-- Revoke authenticated EXECUTE so employees cannot invoke the RPC over PostgREST.

REVOKE ALL ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) TO service_role;
