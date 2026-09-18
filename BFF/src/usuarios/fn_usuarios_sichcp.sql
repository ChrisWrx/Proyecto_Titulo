DROP FUNCTION IF EXISTS public.fn_usuarios_sichcp(integer, character varying, character varying, character varying, character varying, character varying, character varying, character varying, uuid, uuid, character varying, uuid);

CREATE OR REPLACE FUNCTION public.fn_usuarios_sichcp(
    p_opcion integer,
    p_rut character varying DEFAULT NULL::character varying,
    p_id_usuario character varying DEFAULT NULL::character varying,
    p_nombres character varying DEFAULT NULL::character varying,
    p_apellido_paterno character varying DEFAULT NULL::character varying,
    p_apellido_materno character varying DEFAULT NULL::character varying,
    p_correo character varying DEFAULT NULL::character varying,
    p_username character varying DEFAULT NULL::character varying,
    p_id_area uuid DEFAULT NULL::uuid,
    p_id_rol uuid DEFAULT NULL::uuid,
    p_password character varying DEFAULT NULL::character varying,
    p_id_establecimiento uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    nombre_completo text,
    correo character varying,
    username character varying,
    area character varying,
    id_rol uuid,
    nombre_rol character varying,
    mensaje character varying,
    rut_usuario character varying
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_usuario uuid;
    v_id_profesional uuid;
    v_nombres_comp text;
    v_password_hash text;
BEGIN
    IF p_opcion = 1 THEN
        -- Listar usuarios (filtrado opcional por id_establecimiento)
        RETURN QUERY
        SELECT 
            TRIM(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, ''))::text AS nombre_completo,
            u.correo,
            u.username,
            COALESCE(ap.nombre, 'Sin area')::character varying AS area,
            r.id_rol,
            r.nombre::character varying AS nombre_rol,
            NULL::character varying AS mensaje,
            u.rut::character varying AS rut_usuario
        FROM usuario_sistema u
        INNER JOIN rol r ON u.id_rol = r.id_rol
        LEFT JOIN profesional_salud ps ON u.id_profesional = ps.id_profesional
        LEFT JOIN area_profesional ap ON ps.id_area = ap.id_area
        WHERE COALESCE(u.activo, true) = true
          AND (p_id_establecimiento IS NULL OR u.id_establecimiento = p_id_establecimiento)
        ORDER BY u.fecha_creacion DESC;

    ELSIF p_opcion = 2 THEN
        -- Obtener usuario por RUT
        RETURN QUERY
        SELECT 
            TRIM(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, ''))::text AS nombre_completo,
            u.correo,
            u.username,
            COALESCE(ap.nombre, 'Sin area')::character varying AS area,
            r.id_rol,
            r.nombre::character varying AS nombre_rol,
            NULL::character varying AS mensaje,
            u.rut::character varying AS rut_usuario
        FROM usuario_sistema u
        INNER JOIN rol r ON u.id_rol = r.id_rol
        LEFT JOIN profesional_salud ps ON u.id_profesional = ps.id_profesional
        LEFT JOIN area_profesional ap ON ps.id_area = ap.id_area
        WHERE LOWER(REPLACE(REPLACE(u.rut, '.', ''), '-', '')) = LOWER(REPLACE(REPLACE(p_rut, '.', ''), '-', ''))
        LIMIT 1;

    ELSIF p_opcion = 3 THEN
        -- Listar áreas profesionales
        RETURN QUERY
        SELECT 
            NULL::text AS nombre_completo,
            NULL::character varying AS correo,
            NULL::character varying AS username,
            ap.nombre::character varying AS area,
            ap.id_area AS id_rol,
            NULL::character varying AS nombre_rol,
            NULL::character varying AS mensaje,
            NULL::character varying AS rut_usuario
        FROM area_profesional ap
        ORDER BY ap.nombre;

    ELSIF p_opcion = 4 THEN
        -- Listar roles
        RETURN QUERY
        SELECT 
            NULL::text AS nombre_completo,
            NULL::character varying AS correo,
            NULL::character varying AS username,
            NULL::character varying AS area,
            r.id_rol,
            r.nombre::character varying AS nombre_rol,
            NULL::character varying AS mensaje,
            NULL::character varying AS rut_usuario
        FROM rol r
        WHERE COALESCE(r.activo, true) = true
        ORDER BY r.nombre;

    ELSIF p_opcion = 5 THEN
        -- Crear o actualizar usuario
        IF p_id_usuario IS NOT NULL AND p_id_usuario <> '' AND p_id_usuario <> '0' THEN
            v_id_usuario := p_id_usuario::uuid;
        END IF;

        v_nombres_comp := TRIM(COALESCE(p_nombres, '') || ' ' || COALESCE(p_apellido_paterno, '') || ' ' || COALESCE(p_apellido_materno, ''));

        IF p_password IS NOT NULL AND p_password <> '' THEN
            v_password_hash := crypt(p_password, gen_salt('bf'));
        ELSE
            v_password_hash := crypt('admin123', gen_salt('bf'));
        END IF;

        IF v_id_usuario IS NULL THEN
            INSERT INTO usuario_sistema (
                rut,
                nombres,
                apellidos,
                correo,
                username,
                id_rol,
                password_hash,
                id_establecimiento
            ) VALUES (
                p_rut,
                p_nombres,
                TRIM(COALESCE(p_apellido_paterno, '') || ' ' || COALESCE(p_apellido_materno, '')),
                p_correo,
                p_username,
                p_id_rol,
                v_password_hash,
                p_id_establecimiento
            ) RETURNING id_usuario INTO v_id_usuario;
        ELSE
            UPDATE usuario_sistema
            SET rut = COALESCE(p_rut, rut),
                nombres = COALESCE(p_nombres, nombres),
                apellidos = COALESCE(TRIM(COALESCE(p_apellido_paterno, '') || ' ' || COALESCE(p_apellido_materno, '')), apellidos),
                correo = COALESCE(p_correo, correo),
                username = COALESCE(p_username, username),
                id_rol = COALESCE(p_id_rol, id_rol),
                id_establecimiento = COALESCE(p_id_establecimiento, id_establecimiento)
            WHERE id_usuario = v_id_usuario;
        END IF;

        RETURN QUERY
        SELECT 
            TRIM(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, ''))::text,
            u.correo,
            u.username,
            'Sin area'::character varying,
            r.id_rol,
            r.nombre::character varying,
            'OK'::character varying,
            u.rut::character varying
        FROM usuario_sistema u
        INNER JOIN rol r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = v_id_usuario;

    ELSIF p_opcion = 6 THEN
        -- Desactivar usuario lógicamente sin eliminar su historial del sistema.
        UPDATE usuario_sistema
        SET activo = false
        WHERE LOWER(REPLACE(REPLACE(rut, '.', ''), '-', '')) = LOWER(REPLACE(REPLACE(p_rut, '.', ''), '-', ''))
          AND COALESCE(activo, true) = true
        RETURNING id_usuario INTO v_id_usuario;

        IF v_id_usuario IS NOT NULL THEN
            RETURN QUERY
            SELECT
                TRIM(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, ''))::text,
                u.correo,
                u.username,
                'Sin area'::character varying,
                r.id_rol,
                r.nombre::character varying,
                'Usuario eliminado correctamente'::character varying,
                u.rut::character varying
            FROM usuario_sistema u
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = v_id_usuario;
        ELSE
            RETURN QUERY
            SELECT
                NULL::text,
                NULL::character varying,
                NULL::character varying,
                NULL::character varying,
                NULL::uuid,
                NULL::character varying,
                'Usuario no encontrado o ya desactivado'::character varying,
                NULL::character varying;
        END IF;
    END IF;
END;
$$;
