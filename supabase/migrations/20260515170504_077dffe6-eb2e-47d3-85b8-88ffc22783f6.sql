
-- Hide invite_code column from general reads
REVOKE SELECT (invite_code) ON public.groups FROM authenticated;
REVOKE SELECT (invite_code) ON public.groups FROM anon;

-- Owner-or-admin invite code reader
CREATE OR REPLACE FUNCTION public.get_group_invite_code(p_group_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT invite_code INTO v_code
  FROM public.groups
  WHERE id = p_group_id
    AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_invite_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_invite_code(uuid) TO authenticated;

-- Student-facing: join a group by invite code without reading the codes table
CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO v_group_id
  FROM public.groups
  WHERE invite_code = upper(trim(p_code));

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- Each student can only belong to one group
  DELETE FROM public.group_members WHERE user_id = v_uid;
  INSERT INTO public.group_members (group_id, user_id) VALUES (v_group_id, v_uid);

  RETURN v_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated;
