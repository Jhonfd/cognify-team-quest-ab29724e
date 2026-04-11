CREATE POLICY "Admins can delete quiz_results"
ON public.quiz_results
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));