-- Módulo Auditoría (Auditoría de Accesos): bitácora única de accesos y acciones de todo SICHCP.
-- Nunca guarda datos clínicos: solo quién hizo qué, cuándo y con qué resultado; el RUT se almacena enmascarado.

DROP FUNCTION IF EXISTS public.fn_auditoria(integer, uuid, jsonb);

-- Catálogos que alimentan los combobox y las etiquetas de la pantalla.
CREATE TABLE IF NOT EXISTS public.auditoria_modulo_catalogo (
    codigo VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.auditoria_accion_catalogo (
    codigo VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    modulo VARCHAR(40) NOT NULL REFERENCES public.auditoria_modulo_catalogo(codigo),
    orden INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.auditoria_resultado_catalogo (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL,
    exito BOOLEAN NOT NULL,
    orden INT NOT NULL DEFAULT 1
);

INSERT INTO public.auditoria_modulo_catalogo (codigo, nombre, orden) VALUES
    ('AUTENTICACION', 'Autenticación', 1),
    ('GESTION_CLINICA', 'Gestión Clínica', 2),
    ('INTEROPERABILIDAD', 'Interoperabilidad', 3),
    ('AUDITORIA', 'Auditoría', 4),
    ('SEGURIDAD', 'Seguridad', 5),
    ('AUTORIZACION', 'Autorización', 6)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.auditoria_accion_catalogo (codigo, nombre, modulo, orden) VALUES
    ('LOGIN_EXITOSO', 'Inicio de sesión exitoso', 'AUTENTICACION', 1),
    ('LOGIN_FALLIDO', 'Inicio de sesión fallido', 'AUTENTICACION', 2),
    ('CONSULTA_PACIENTE', 'Consulta de paciente', 'GESTION_CLINICA', 3),
    ('CONSULTA_FICHA', 'Consulta de ficha clínica', 'GESTION_CLINICA', 4),
    ('REGISTRAR_ATENCION', 'Registro de atención', 'GESTION_CLINICA', 5),
    ('DERIVAR_ATENCION', 'Derivación de atención', 'GESTION_CLINICA', 6),
    ('CONSULTA_FHIR', 'Consulta de recurso FHIR', 'INTEROPERABILIDAD', 7),
    ('REGISTRAR_INTEGRACION', 'Registro de integración', 'INTEROPERABILIDAD', 8),
    ('ACTUALIZAR_INTEGRACION', 'Actualización de integración', 'INTEROPERABILIDAD', 9),
    ('HABILITAR_INTEGRACION', 'Habilitación de integración', 'INTEROPERABILIDAD', 10),
    ('DESHABILITAR_INTEGRACION', 'Deshabilitación de integración', 'INTEROPERABILIDAD', 11),
    ('PRUEBA_CONEXION', 'Prueba de conexión', 'INTEROPERABILIDAD', 12),
    ('EXPORTAR_AUDITORIA', 'Exportación de auditoría', 'AUDITORIA', 13),
    ('LOGOUT', 'Cierre de sesión', 'AUTENTICACION', 14),
    ('CONSULTA_HISTORIAL', 'Consulta de historial clínico', 'GESTION_CLINICA', 15),
    ('CREAR_USUARIO', 'Creación de usuario', 'SEGURIDAD', 16),
    ('ACTUALIZAR_USUARIO', 'Actualización de usuario', 'SEGURIDAD', 17),
    ('CAMBIAR_CONTRASENA', 'Cambio de contraseña de usuario', 'SEGURIDAD', 18),
    ('DESACTIVAR_USUARIO', 'Desactivación de usuario', 'SEGURIDAD', 19),
    ('ACCESO_DENEGADO', 'Acceso denegado', 'AUTORIZACION', 20),
    ('CONFIGURAR_RETENCION', 'Configuración de retención de auditoría', 'AUDITORIA', 21),
    ('PURGAR_AUDITORIA', 'Purga de auditoría fuera de plazo', 'AUDITORIA', 22)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.auditoria_resultado_catalogo (codigo, nombre, exito, orden) VALUES
    ('EXITOSO', 'Exitoso', TRUE, 1),
    ('FALLIDO', 'Fallido', FALSE, 2)
ON CONFLICT (codigo) DO NOTHING;

-- Nota: la tabla preexistente auditoria_acceso (consultas de profesionales a pacientes) no se modifica; esta bitácora usa auditoria_evento.
CREATE TABLE IF NOT EXISTS public.auditoria_evento (
    id_auditoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES public.usuario_sistema(id_usuario),
    usuario_intentado VARCHAR(100),
    rol VARCHAR(50),
    accion VARCHAR(40) NOT NULL REFERENCES public.auditoria_accion_catalogo(codigo),
    recurso VARCHAR(60),
    rut_enmascarado VARCHAR(20),
    referencia VARCHAR(150),
    exito BOOLEAN NOT NULL,
    mensaje VARCHAR(300),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento_fecha ON public.auditoria_evento (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_evento_usuario ON public.auditoria_evento (id_usuario, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_evento_accion ON public.auditoria_evento (accion, fecha DESC);

-- IP del cliente y fuente u origen de la información consultada (ej. servidor FHIR).
ALTER TABLE public.auditoria_evento
    ADD COLUMN IF NOT EXISTS ip_origen VARCHAR(45),
    ADD COLUMN IF NOT EXISTS origen VARCHAR(150);

-- Configuración de la auditoría (ej. RETENCION_MESES). Sin fila = política aún no definida.
CREATE TABLE IF NOT EXISTS public.auditoria_configuracion (
    clave VARCHAR(60) PRIMARY KEY,
    valor VARCHAR(200),
    descripcion VARCHAR(300),
    id_usuario UUID REFERENCES public.usuario_sistema(id_usuario),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Traspaso de la auditoría previa de Interoperabilidad (idempotente: conserva el mismo id).
DO $$
BEGIN
    IF to_regclass('public.interoperabilidad_auditoria') IS NOT NULL THEN
        INSERT INTO public.auditoria_evento (id_auditoria, id_usuario, rol, accion, recurso, rut_enmascarado, referencia, exito, mensaje, fecha)
        SELECT o.id_auditoria, o.id_usuario, o.rol, o.accion, o.recurso, o.rut_enmascarado, i.nombre, o.exito, o.mensaje, o.fecha
        FROM public.interoperabilidad_auditoria o
        LEFT JOIN public.integracion_externa i ON i.id_integracion = o.id_integracion
        WHERE EXISTS (SELECT 1 FROM public.auditoria_accion_catalogo a WHERE a.codigo = o.accion)
        ON CONFLICT (id_auditoria) DO NOTHING;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_auditoria(
    p_opcion INT,
    p_id UUID DEFAULT NULL,
    p_datos JSONB DEFAULT NULL
)
RETURNS TABLE (
    ok BOOLEAN,
    mensaje VARCHAR,
    datos JSONB
) AS $$
DECLARE
    d JSONB := COALESCE(p_datos, '{}'::JSONB);
    v_rol VARCHAR;
    v_super BOOLEAN;
    v_rut VARCHAR;
    v_pagina INT;
    v_tamano INT;
    v_meses INT;
    v_eliminados BIGINT;
    v_total BIGINT;
    v_filas JSONB;
BEGIN
    -- OPCIÓN 1: Registrar un evento de auditoría (p_id = id_usuario, nulo en login fallido); el RUT se guarda enmascarado.
    IF p_opcion = 1 THEN
        SELECT r.codigo INTO v_rol
        FROM public.usuario_sistema u
        JOIN public.rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = p_id;

        v_rut := regexp_replace(upper(COALESCE(d->>'rut', '')), '[^0-9K]', '', 'g');
        IF v_rut = '' THEN
            v_rut := NULL;
        ELSE
            v_rut := repeat('*', GREATEST(length(v_rut) - 4, 0)) || right(v_rut, 4);
        END IF;

        INSERT INTO public.auditoria_evento (
            id_usuario, usuario_intentado, rol, accion, recurso, rut_enmascarado, referencia, exito, mensaje, ip_origen, origen
        ) VALUES (
            CASE WHEN v_rol IS NULL THEN NULL ELSE p_id END,
            LEFT(NULLIF(d->>'usuario_intentado', ''), 100),
            v_rol,
            COALESCE(NULLIF(d->>'accion', ''), 'DESCONOCIDA'),
            LEFT(NULLIF(d->>'recurso', ''), 60),
            v_rut,
            LEFT(NULLIF(d->>'referencia', ''), 150),
            COALESCE((d->>'exito')::BOOLEAN, FALSE),
            LEFT(d->>'mensaje', 300),
            LEFT(NULLIF(d->>'ip_origen', ''), 45),
            LEFT(NULLIF(d->>'origen', ''), 150)
        );
        RETURN QUERY SELECT TRUE, 'Evento registrado'::VARCHAR, NULL::JSONB;
        RETURN;
    END IF;

    -- OPCIÓN 2: Permisos del usuario (p_id = id_usuario): ver (roles con menú Auditoría) y exportar.
    IF p_opcion = 2 THEN
        SELECT r.codigo, COALESCE(r.es_super_admin, FALSE)
        INTO v_rol, v_super
        FROM public.usuario_sistema u
        JOIN public.rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = p_id AND COALESCE(u.activo, TRUE);

        RETURN QUERY SELECT
            (v_rol IS NOT NULL),
            'Permisos de auditoría'::VARCHAR,
            jsonb_build_object(
                'rol', v_rol,
                'puede_ver', v_super OR v_rol IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPERVISOR'),
                'puede_exportar', v_super OR v_rol IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR'),
                'puede_configurar', v_super OR v_rol = 'SUPER_ADMIN'
            );
        RETURN;
    END IF;

    -- OPCIÓN 3: Indicadores del día (accesos, fallidos, usuarios activos y consultas de información de pacientes).
    IF p_opcion = 3 THEN
        RETURN QUERY
        SELECT TRUE, 'Indicadores de auditoría'::VARCHAR,
               jsonb_build_object(
                   'accesos_hoy', COUNT(*),
                   'fallidos_hoy', COUNT(*) FILTER (WHERE NOT au.exito),
                   'usuarios_activos_hoy', COUNT(DISTINCT au.id_usuario),
                   'consultas_hoy', COUNT(*) FILTER (WHERE au.accion IN ('CONSULTA_PACIENTE', 'CONSULTA_FICHA', 'CONSULTA_HISTORIAL', 'CONSULTA_FHIR'))
               )
        FROM public.auditoria_evento au
        WHERE au.fecha >= CURRENT_DATE;
        RETURN;
    END IF;

    -- OPCIÓN 4 y 11: Listado filtrado. La 4 pagina (pagina, tamano); la 11 devuelve hasta 5000 filas para exportar.
    -- Filtros en p_datos: desde, hasta, id_usuario, rol, modulo, accion, resultado.
    IF p_opcion IN (4, 11) THEN
        v_tamano := CASE WHEN p_opcion = 11 THEN 5000 ELSE LEAST(GREATEST(COALESCE(NULLIF(d->>'tamano', '')::INT, 7), 1), 100) END;
        v_pagina := CASE WHEN p_opcion = 11 THEN 1 ELSE GREATEST(COALESCE(NULLIF(d->>'pagina', '')::INT, 1), 1) END;

        SELECT COUNT(*) INTO v_total
        FROM public.auditoria_evento au
        JOIN public.auditoria_accion_catalogo ac ON ac.codigo = au.accion
        WHERE (NULLIF(d->>'desde', '') IS NULL OR au.fecha >= (d->>'desde')::DATE)
          AND (NULLIF(d->>'hasta', '') IS NULL OR au.fecha < (d->>'hasta')::DATE + 1)
          AND (NULLIF(d->>'id_usuario', '') IS NULL OR au.id_usuario = (d->>'id_usuario')::UUID)
          AND (NULLIF(d->>'rol', '') IS NULL OR au.rol = d->>'rol')
          AND (NULLIF(d->>'modulo', '') IS NULL OR ac.modulo = d->>'modulo')
          AND (NULLIF(d->>'accion', '') IS NULL OR au.accion = d->>'accion')
          AND (NULLIF(d->>'resultado', '') IS NULL OR au.exito = (d->>'resultado' = 'EXITOSO'));

        SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.fecha DESC), '[]'::JSONB) INTO v_filas
        FROM (
            SELECT au.id_auditoria,
                   au.fecha,
                   COALESCE(NULLIF(btrim(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, '')), ''), u.username, au.usuario_intentado) AS usuario,
                   au.rol,
                   m.nombre AS modulo,
                   ac.nombre AS accion,
                   au.accion AS accion_codigo,
                   au.recurso,
                   au.rut_enmascarado,
                   au.referencia,
                   au.ip_origen,
                   au.origen,
                   au.exito,
                   au.mensaje
            FROM public.auditoria_evento au
            JOIN public.auditoria_accion_catalogo ac ON ac.codigo = au.accion
            JOIN public.auditoria_modulo_catalogo m ON m.codigo = ac.modulo
            LEFT JOIN public.usuario_sistema u ON u.id_usuario = au.id_usuario
            WHERE (NULLIF(d->>'desde', '') IS NULL OR au.fecha >= (d->>'desde')::DATE)
              AND (NULLIF(d->>'hasta', '') IS NULL OR au.fecha < (d->>'hasta')::DATE + 1)
              AND (NULLIF(d->>'id_usuario', '') IS NULL OR au.id_usuario = (d->>'id_usuario')::UUID)
              AND (NULLIF(d->>'rol', '') IS NULL OR au.rol = d->>'rol')
              AND (NULLIF(d->>'modulo', '') IS NULL OR ac.modulo = d->>'modulo')
              AND (NULLIF(d->>'accion', '') IS NULL OR au.accion = d->>'accion')
              AND (NULLIF(d->>'resultado', '') IS NULL OR au.exito = (d->>'resultado' = 'EXITOSO'))
            ORDER BY au.fecha DESC
            LIMIT v_tamano OFFSET (v_pagina - 1) * v_tamano
        ) f;

        RETURN QUERY SELECT TRUE, 'Eventos de auditoría'::VARCHAR,
            jsonb_build_object('total', v_total, 'pagina', v_pagina, 'tamano', v_tamano, 'filas', v_filas);
        RETURN;
    END IF;

    -- OPCIÓN 5: Detalle de un evento (p_id = id_auditoria).
    IF p_opcion = 5 THEN
        RETURN QUERY
        SELECT TRUE, 'Detalle del evento'::VARCHAR,
               jsonb_build_object(
                   'id_auditoria', au.id_auditoria,
                   'fecha', au.fecha,
                   'usuario', COALESCE(NULLIF(btrim(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, '')), ''), u.username, au.usuario_intentado),
                   'username', COALESCE(u.username, au.usuario_intentado),
                   'rol', au.rol,
                   'modulo', m.nombre,
                   'accion', ac.nombre,
                   'accion_codigo', au.accion,
                   'recurso', au.recurso,
                   'rut_enmascarado', au.rut_enmascarado,
                   'referencia', au.referencia,
                   'ip_origen', au.ip_origen,
                   'origen', au.origen,
                   'exito', au.exito,
                   'mensaje', au.mensaje
               )
        FROM public.auditoria_evento au
        JOIN public.auditoria_accion_catalogo ac ON ac.codigo = au.accion
        JOIN public.auditoria_modulo_catalogo m ON m.codigo = ac.modulo
        LEFT JOIN public.usuario_sistema u ON u.id_usuario = au.id_usuario
        WHERE au.id_auditoria = p_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 'Evento no encontrado'::VARCHAR, NULL::JSONB;
        END IF;
        RETURN;
    END IF;

    -- OPCIÓN 6: Módulos (combobox "Módulo"), tabla auditoria_modulo_catalogo.
    IF p_opcion = 6 THEN
        RETURN QUERY
        SELECT TRUE, 'Módulos'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', m.codigo, 'nombre', m.nombre) ORDER BY m.orden), '[]'::JSONB)
        FROM public.auditoria_modulo_catalogo m
        WHERE m.activo;
        RETURN;
    END IF;

    -- OPCIÓN 7: Acciones (combobox "Acción"), tabla auditoria_accion_catalogo; p_datos.modulo filtra por módulo.
    IF p_opcion = 7 THEN
        RETURN QUERY
        SELECT TRUE, 'Acciones'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', a.codigo, 'nombre', a.nombre) ORDER BY a.orden), '[]'::JSONB)
        FROM public.auditoria_accion_catalogo a
        WHERE a.activo AND (NULLIF(d->>'modulo', '') IS NULL OR a.modulo = d->>'modulo');
        RETURN;
    END IF;

    -- OPCIÓN 8: Usuarios (combobox "Usuario"), tabla usuario_sistema.
    IF p_opcion = 8 THEN
        RETURN QUERY
        SELECT TRUE, 'Usuarios'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object(
                   'id', u.id_usuario,
                   'nombre', COALESCE(NULLIF(btrim(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, '')), ''), u.username)
               ) ORDER BY COALESCE(NULLIF(btrim(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, '')), ''), u.username)), '[]'::JSONB)
        FROM public.usuario_sistema u;
        RETURN;
    END IF;

    -- OPCIÓN 9: Roles (combobox "Rol"), tabla rol.
    IF p_opcion = 9 THEN
        RETURN QUERY
        SELECT TRUE, 'Roles'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', r.codigo, 'nombre', r.nombre) ORDER BY r.nombre), '[]'::JSONB)
        FROM public.rol r
        WHERE COALESCE(r.activo, TRUE) AND r.codigo IS NOT NULL;
        RETURN;
    END IF;

    -- OPCIÓN 10: Resultados (combobox "Resultado"), tabla auditoria_resultado_catalogo.
    IF p_opcion = 10 THEN
        RETURN QUERY
        SELECT TRUE, 'Resultados'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', c.codigo, 'nombre', c.nombre) ORDER BY c.orden), '[]'::JSONB)
        FROM public.auditoria_resultado_catalogo c;
        RETURN;
    END IF;

    -- OPCIÓN 12: Política de retención vigente: meses configurados (nulo si no se ha definido), eventos totales y fuera de plazo.
    IF p_opcion = 12 THEN
        SELECT NULLIF(c.valor, '')::INT INTO v_meses
        FROM public.auditoria_configuracion c
        WHERE c.clave = 'RETENCION_MESES';

        RETURN QUERY
        SELECT TRUE, 'Política de retención'::VARCHAR,
               jsonb_build_object(
                   'retencion_meses', v_meses,
                   'eventos_total', COUNT(*),
                   'evento_mas_antiguo', MIN(au.fecha),
                   'eventos_fuera_de_plazo',
                       CASE WHEN v_meses IS NULL THEN NULL
                            ELSE COUNT(*) FILTER (WHERE au.fecha < CURRENT_TIMESTAMP - make_interval(months => v_meses)) END
               )
        FROM public.auditoria_evento au;
        RETURN;
    END IF;

    -- OPCIÓN 13: Definir la retención en meses (p_id = id_usuario, p_datos.retencion_meses entero positivo).
    IF p_opcion = 13 THEN
        v_meses := NULLIF(d->>'retencion_meses', '')::INT;
        IF v_meses IS NULL OR v_meses < 1 THEN
            RAISE EXCEPTION 'La retención debe ser un número entero de meses mayor a cero';
        END IF;

        INSERT INTO public.auditoria_configuracion (clave, valor, descripcion, id_usuario, fecha_actualizacion)
        VALUES ('RETENCION_MESES', v_meses::TEXT, 'Meses que se conservan los eventos de auditoría', p_id, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE
        SET valor = EXCLUDED.valor, id_usuario = EXCLUDED.id_usuario, fecha_actualizacion = CURRENT_TIMESTAMP;

        RETURN QUERY SELECT TRUE, 'Retención actualizada'::VARCHAR, jsonb_build_object('retencion_meses', v_meses);
        RETURN;
    END IF;

    -- OPCIÓN 14: Elimina los eventos fuera de plazo; con p_datos.simular = true solo cuenta cuántos se eliminarían.
    IF p_opcion = 14 THEN
        SELECT NULLIF(c.valor, '')::INT INTO v_meses
        FROM public.auditoria_configuracion c
        WHERE c.clave = 'RETENCION_MESES';

        IF v_meses IS NULL THEN
            RAISE EXCEPTION 'No hay una política de retención definida';
        END IF;

        IF COALESCE((d->>'simular')::BOOLEAN, TRUE) THEN
            SELECT COUNT(*) INTO v_eliminados
            FROM public.auditoria_evento au
            WHERE au.fecha < CURRENT_TIMESTAMP - make_interval(months => v_meses);
        ELSE
            DELETE FROM public.auditoria_evento au
            WHERE au.fecha < CURRENT_TIMESTAMP - make_interval(months => v_meses);
            GET DIAGNOSTICS v_eliminados = ROW_COUNT;
        END IF;

        RETURN QUERY SELECT TRUE,
            (CASE WHEN COALESCE((d->>'simular')::BOOLEAN, TRUE) THEN 'Simulación de purga' ELSE 'Purga realizada' END)::VARCHAR,
            jsonb_build_object('retencion_meses', v_meses, 'eventos_afectados', v_eliminados, 'simulacion', COALESCE((d->>'simular')::BOOLEAN, TRUE));
        RETURN;
    END IF;

    RAISE EXCEPTION 'Opción % no válida para fn_auditoria', p_opcion;
END;
$$ LANGUAGE plpgsql;
