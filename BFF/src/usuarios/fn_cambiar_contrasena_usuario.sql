CREATE OR REPLACE FUNCTION public.fn_cambiar_contrasena_usuario(
    p_rut character varying,
    p_password character varying
)
RETURNS TABLE(
    actualizado boolean,
    username character varying
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE usuario_sistema
    SET password_hash = crypt(p_password, gen_salt('bf'))
    WHERE LOWER(REPLACE(REPLACE(rut, '.', ''), '-', '')) = LOWER(REPLACE(REPLACE(p_rut, '.', ''), '-', ''))
      AND COALESCE(activo, true) = true
    RETURNING true, usuario_sistema.username;
END;
$$;
