DROP FUNCTION IF EXISTS public.fn_login_sistema(character varying, character varying);

CREATE OR REPLACE FUNCTION public.fn_login_sistema(p_username character varying, p_password_hash character varying)
RETURNS TABLE(
    id_usuario uuid, 
    nombres character varying, 
    apellidos character varying,
    id_establecimiento uuid,
    nombre_establecimiento character varying,
    tipo_establecimiento character varying,
    comuna_establecimiento character varying,
    direccion_establecimiento character varying
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id_usuario,
        u.nombres,
        u.apellidos,
        u.id_establecimiento,
        (CASE 
            WHEN r.codigo = 'SUPER_ADMIN' OR r.es_super_admin = true THEN 'SICHCP'
            ELSE COALESCE(e.nombre, U&'Red P\00fablica SICHCP')::character varying 
        END) AS nombre_establecimiento,
        (CASE 
            WHEN r.codigo = 'SUPER_ADMIN' OR r.es_super_admin = true THEN U&'Administraci\00f3n Central'
            ELSE COALESCE(e.tipo_establecimiento, 'CENTRO DE SALUD')::character varying 
        END) AS tipo_establecimiento,
        (CASE 
            WHEN r.codigo = 'SUPER_ADMIN' OR r.es_super_admin = true THEN 'Santiago'
            ELSE COALESCE(e.comuna, 'Santiago')::character varying 
        END) AS comuna_establecimiento,
        (CASE 
            WHEN r.codigo = 'SUPER_ADMIN' OR r.es_super_admin = true THEN 'Nivel Central'
            ELSE COALESCE(e.direccion, '')::character varying 
        END) AS direccion_establecimiento
    FROM public.usuario_sistema u
    INNER JOIN public.rol r ON u.id_rol = r.id_rol
    LEFT JOIN public.establecimiento_salud e ON u.id_establecimiento = e.id_establecimiento
    WHERE u.username = p_username 
      AND u.password_hash = crypt(p_password_hash, u.password_hash) 
      AND COALESCE(u.activo, true) = true;
END;
$$;
