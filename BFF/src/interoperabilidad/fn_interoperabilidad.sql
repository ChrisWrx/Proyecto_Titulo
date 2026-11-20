-- Módulo Interoperabilidad (Recursos FHIR e Integraciones).
-- Solo se persiste la configuración, el historial de pruebas y la auditoría de accesos; los recursos clínicos FHIR nunca se guardan.

DROP FUNCTION IF EXISTS public.fn_interoperabilidad(integer, uuid, jsonb);

-- Catálogos que alimentan los combobox y el catálogo de recursos.
CREATE TABLE IF NOT EXISTS public.integracion_tipo_catalogo (
    codigo VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.integracion_autenticacion_catalogo (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.integracion_version_fhir_catalogo (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    prefijo_numerico VARCHAR(10) NOT NULL,
    predeterminado BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.integracion_version_fhir_catalogo (codigo, nombre, prefijo_numerico, predeterminado, orden) VALUES
    ('DSTU2', 'DSTU2 (1.0.2)', '1.0', FALSE, 1),
    ('STU3', 'STU3 (3.0.2)', '3.0', FALSE, 2),
    ('R4', 'R4 (4.0.1)', '4.0', TRUE, 3),
    ('R4B', 'R4B (4.3.0)', '4.3', FALSE, 4),
    ('R5', 'R5 (5.0.0)', '5.0', FALSE, 5)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.recurso_fhir_catalogo (
    recurso VARCHAR(60) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    icono VARCHAR(40) NOT NULL,
    soportado BOOLEAN NOT NULL DEFAULT TRUE,
    requiere_rut BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.integracion_tipo_catalogo (codigo, nombre, orden) VALUES
    ('SERVIDOR_FHIR', 'Servidor FHIR', 1),
    ('REPOSITORIO_FHIR', 'Repositorio FHIR', 2),
    ('HOSPITAL', 'Hospital', 3),
    ('CESFAM', 'CESFAM', 4),
    ('SAPU_SAR', 'SAPU / SAR', 5),
    ('LABORATORIO', 'Laboratorio', 6),
    ('OTRO', 'Otro', 7)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.integracion_autenticacion_catalogo (codigo, nombre, orden) VALUES
    ('NINGUNA', 'Ninguna', 1),
    ('API_KEY', 'API Key', 2),
    ('OAUTH2', 'OAuth 2.0', 3)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.recurso_fhir_catalogo (orden, recurso, nombre, descripcion, icono, soportado) VALUES
    (1, 'Patient', 'Paciente', 'Datos de identificación de pacientes', 'bi-person-vcard', TRUE),
    (2, 'Encounter', 'Atención', 'Atenciones y encuentros clínicos', 'bi-clipboard2-pulse', TRUE),
    (3, 'Observation', 'Observación', 'Signos vitales y observaciones', 'bi-activity', TRUE),
    (4, 'Condition', 'Condición', 'Diagnósticos y condiciones clínicas', 'bi-heart-pulse', TRUE),
    (5, 'MedicationRequest', 'Prescripción', 'Prescripciones médicas', 'bi-capsule', TRUE),
    (6, 'MedicationStatement', 'Medicamento informado', 'Medicamentos informados', 'bi-capsule-pill', TRUE),
    (7, 'AllergyIntolerance', 'Alergia', 'Alergias e intolerancias', 'bi-shield-exclamation', TRUE),
    (8, 'DiagnosticReport', 'Informe diagnóstico', 'Informes de exámenes', 'bi-clipboard2-check', TRUE),
    (9, 'Immunization', 'Inmunización', 'Vacunas administradas (aún sin fuente de datos)', 'bi-bandaid', FALSE)
ON CONFLICT (recurso) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.integracion_externa (
    id_integracion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(300),
    tipo VARCHAR(40) NOT NULL DEFAULT 'SERVIDOR_FHIR',
    url_base VARCHAR(300) NOT NULL,
    version_fhir VARCHAR(20) NOT NULL DEFAULT 'R4',
    autenticacion VARCHAR(20) NOT NULL DEFAULT 'NINGUNA',
    id_establecimiento UUID REFERENCES public.establecimiento_salud(id_establecimiento),
    habilitada BOOLEAN NOT NULL DEFAULT TRUE,
    estado_conexion VARCHAR(20) NOT NULL DEFAULT 'SIN_VERIFICAR',
    ultima_verificacion TIMESTAMP,
    latencia_ms INT,
    recursos_soportados JSONB NOT NULL DEFAULT '[]'::JSONB,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_integracion_url UNIQUE (url_base),
    CONSTRAINT chk_integracion_estado CHECK (estado_conexion IN ('SIN_VERIFICAR', 'CONECTADO', 'ALCANZABLE', 'ERROR'))
);

-- Tipo y autenticación se validan contra los catálogos en lugar de listas fijas.
ALTER TABLE public.integracion_externa
    DROP CONSTRAINT IF EXISTS chk_integracion_tipo,
    DROP CONSTRAINT IF EXISTS chk_integracion_auth;

DO $$
BEGIN
    ALTER TABLE public.integracion_externa
        ADD CONSTRAINT fk_integracion_tipo FOREIGN KEY (tipo) REFERENCES public.integracion_tipo_catalogo(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.integracion_externa
        ADD CONSTRAINT fk_integracion_autenticacion FOREIGN KEY (autenticacion) REFERENCES public.integracion_autenticacion_catalogo(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Normaliza versiones numéricas guardadas antes del catálogo (ej. 4.0.1 -> R4).
UPDATE public.integracion_externa i
SET version_fhir = COALESCE(
    (SELECT v.codigo FROM public.integracion_version_fhir_catalogo v
     WHERE i.version_fhir LIKE v.prefijo_numerico || '%'
     ORDER BY length(v.prefijo_numerico) DESC LIMIT 1),
    (SELECT v.codigo FROM public.integracion_version_fhir_catalogo v WHERE v.predeterminado LIMIT 1))
WHERE NOT EXISTS (SELECT 1 FROM public.integracion_version_fhir_catalogo c WHERE c.codigo = i.version_fhir);

DO $$
BEGIN
    ALTER TABLE public.integracion_externa
        ADD CONSTRAINT fk_integracion_version_fhir FOREIGN KEY (version_fhir) REFERENCES public.integracion_version_fhir_catalogo(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.integracion_log (
    id_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_integracion UUID REFERENCES public.integracion_externa(id_integracion) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    recurso VARCHAR(60),
    exito BOOLEAN NOT NULL,
    codigo_http INT,
    latencia_ms INT,
    mensaje VARCHAR(500),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_integracion_log_tipo CHECK (tipo IN ('PRUEBA', 'CONSULTA'))
);

ALTER TABLE public.integracion_log
    ADD COLUMN IF NOT EXISTS id_usuario UUID REFERENCES public.usuario_sistema(id_usuario);

CREATE INDEX IF NOT EXISTS idx_integracion_log_integracion ON public.integracion_log (id_integracion, fecha DESC);

CREATE OR REPLACE FUNCTION public.fn_interoperabilidad(
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
    v_id UUID;
    v_nombre VARCHAR;
    v_url VARCHAR;
    v_tipo VARCHAR;
    v_auth VARCHAR;
    v_estado VARCHAR;
    v_exito BOOLEAN;
    v_rol VARCHAR;
    v_super BOOLEAN;
    v_version VARCHAR;
BEGIN
    -- OPCIÓN 1: Catálogo de recursos FHIR compatibles con SICHCP (tabla recurso_fhir_catalogo).
    IF p_opcion = 1 THEN
        RETURN QUERY
        SELECT TRUE, 'Catálogo de recursos FHIR'::VARCHAR,
               COALESCE(jsonb_agg(to_jsonb(c) - 'activo' ORDER BY c.orden), '[]'::JSONB)
        FROM public.recurso_fhir_catalogo c
        WHERE c.activo;
        RETURN;
    END IF;

    -- OPCIÓN 2: Resumen de integraciones (totales por estado) para las tarjetas superiores.
    IF p_opcion = 2 THEN
        RETURN QUERY
        SELECT TRUE, 'Resumen de integraciones'::VARCHAR,
               jsonb_build_object(
                   'total', COUNT(*),
                   'habilitadas', COUNT(*) FILTER (WHERE i.habilitada),
                   'conectadas', COUNT(*) FILTER (WHERE i.estado_conexion IN ('CONECTADO', 'ALCANZABLE')),
                   'con_error', COUNT(*) FILTER (WHERE i.estado_conexion = 'ERROR'),
                   'sin_verificar', COUNT(*) FILTER (WHERE i.estado_conexion = 'SIN_VERIFICAR')
               )
        FROM public.integracion_externa i;
        RETURN;
    END IF;

    -- OPCIÓN 3: Listado de integraciones registradas.
    IF p_opcion = 3 THEN
        RETURN QUERY
        SELECT TRUE, 'Listado de integraciones'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object(
                   'id_integracion', i.id_integracion,
                   'nombre', i.nombre,
                   'descripcion', i.descripcion,
                   'tipo', i.tipo,
                   'url_base', i.url_base,
                   'version_fhir', i.version_fhir,
                   'autenticacion', i.autenticacion,
                   'id_establecimiento', i.id_establecimiento,
                   'establecimiento', e.nombre,
                   'habilitada', i.habilitada,
                   'estado_conexion', i.estado_conexion,
                   'ultima_verificacion', i.ultima_verificacion,
                   'latencia_ms', i.latencia_ms,
                   'recursos_soportados', i.recursos_soportados
               ) ORDER BY i.nombre), '[]'::JSONB)
        FROM public.integracion_externa i
        LEFT JOIN public.establecimiento_salud e ON e.id_establecimiento = i.id_establecimiento;
        RETURN;
    END IF;

    -- OPCIÓN 4: Detalle de una integración con sus últimos 10 eventos.
    IF p_opcion = 4 THEN
        RETURN QUERY
        SELECT TRUE, 'Detalle de integración'::VARCHAR,
               to_jsonb(i) || jsonb_build_object(
                   'ultimos_eventos',
                   COALESCE((
                       SELECT jsonb_agg(to_jsonb(l) ORDER BY l.fecha DESC)
                       FROM (
                           SELECT lg.tipo, lg.recurso, lg.exito, lg.codigo_http, lg.latencia_ms, lg.mensaje, lg.fecha
                           FROM public.integracion_log lg
                           WHERE lg.id_integracion = i.id_integracion
                           ORDER BY lg.fecha DESC
                           LIMIT 10
                       ) l
                   ), '[]'::JSONB)
               )
        FROM public.integracion_externa i
        WHERE i.id_integracion = p_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 'Integración no encontrada'::VARCHAR, NULL::JSONB;
        END IF;
        RETURN;
    END IF;

    -- OPCIÓN 5: Crear (p_id nulo) o actualizar una integración; tipo y autenticación se validan contra los catálogos.
    IF p_opcion = 5 THEN
        v_nombre := NULLIF(btrim(COALESCE(p_datos->>'nombre', '')), '');
        v_url := regexp_replace(NULLIF(btrim(COALESCE(p_datos->>'url_base', '')), ''), '/+$', '');
        v_tipo := NULLIF(p_datos->>'tipo', '');
        v_auth := NULLIF(p_datos->>'autenticacion', '');
        v_version := NULLIF(p_datos->>'version_fhir', '');

        IF v_nombre IS NULL THEN
            RAISE EXCEPTION 'El nombre de la integración es obligatorio';
        END IF;
        IF v_url IS NULL OR v_url !~* '^https?://[^\s]+$' THEN
            RAISE EXCEPTION 'La URL base debe comenzar con http:// o https://';
        END IF;
        IF v_tipo IS NULL THEN
            RAISE EXCEPTION 'Debe seleccionar el tipo de integración';
        END IF;
        IF v_auth IS NULL THEN
            RAISE EXCEPTION 'Debe seleccionar el mecanismo de autenticación';
        END IF;
        IF v_version IS NULL THEN
            RAISE EXCEPTION 'Debe seleccionar la versión FHIR';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.integracion_version_fhir_catalogo v WHERE v.codigo = v_version AND v.activo) THEN
            RAISE EXCEPTION 'Versión FHIR no válida';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.integracion_tipo_catalogo t WHERE t.codigo = v_tipo AND t.activo) THEN
            RAISE EXCEPTION 'Tipo de integración no válido';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.integracion_autenticacion_catalogo a WHERE a.codigo = v_auth AND a.activo) THEN
            RAISE EXCEPTION 'Mecanismo de autenticación no válido';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.integracion_externa i
            WHERE i.url_base = v_url AND i.id_integracion IS DISTINCT FROM p_id
        ) THEN
            RAISE EXCEPTION 'Ya existe una integración con esa URL base';
        END IF;

        IF p_id IS NULL THEN
            INSERT INTO public.integracion_externa (
                nombre, descripcion, tipo, url_base, version_fhir, autenticacion, id_establecimiento, habilitada
            ) VALUES (
                v_nombre,
                NULLIF(btrim(COALESCE(p_datos->>'descripcion', '')), ''),
                v_tipo,
                v_url,
                v_version,
                v_auth,
                NULLIF(p_datos->>'id_establecimiento', '')::UUID,
                COALESCE((p_datos->>'habilitada')::BOOLEAN, TRUE)
            ) RETURNING id_integracion INTO v_id;
            RETURN QUERY SELECT TRUE, 'Integración registrada'::VARCHAR, jsonb_build_object('id_integracion', v_id);
        ELSE
            UPDATE public.integracion_externa i
            SET nombre = v_nombre,
                descripcion = NULLIF(btrim(COALESCE(p_datos->>'descripcion', '')), ''),
                tipo = v_tipo,
                url_base = v_url,
                version_fhir = v_version,
                autenticacion = v_auth,
                id_establecimiento = NULLIF(p_datos->>'id_establecimiento', '')::UUID,
                estado_conexion = CASE WHEN i.url_base <> v_url THEN 'SIN_VERIFICAR' ELSE i.estado_conexion END,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE i.id_integracion = p_id
            RETURNING i.id_integracion INTO v_id;

            IF v_id IS NULL THEN
                RAISE EXCEPTION 'Integración no encontrada';
            END IF;
            RETURN QUERY SELECT TRUE, 'Integración actualizada'::VARCHAR, jsonb_build_object('id_integracion', v_id);
        END IF;
        RETURN;
    END IF;

    -- OPCIÓN 6: Habilitar o deshabilitar una integración (p_datos.habilitada).
    IF p_opcion = 6 THEN
        UPDATE public.integracion_externa i
        SET habilitada = COALESCE((p_datos->>'habilitada')::BOOLEAN, NOT i.habilitada),
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE i.id_integracion = p_id
        RETURNING i.id_integracion, i.habilitada INTO v_id, v_exito;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'Integración no encontrada';
        END IF;
        RETURN QUERY SELECT TRUE,
            (CASE WHEN v_exito THEN 'Integración habilitada' ELSE 'Integración deshabilitada' END)::VARCHAR,
            jsonb_build_object('id_integracion', v_id, 'habilitada', v_exito);
        RETURN;
    END IF;

    -- OPCIÓN 7: Registrar el resultado de una prueba de conexión o consulta (con el usuario); la prueba actualiza estado, latencia y recursos soportados.
    IF p_opcion = 7 THEN
        v_tipo := COALESCE(NULLIF(p_datos->>'tipo', ''), 'PRUEBA');
        v_exito := COALESCE((p_datos->>'exito')::BOOLEAN, FALSE);
        v_estado := COALESCE(NULLIF(p_datos->>'estado', ''), CASE WHEN v_exito THEN 'CONECTADO' ELSE 'ERROR' END);

        IF NOT EXISTS (SELECT 1 FROM public.integracion_externa i WHERE i.id_integracion = p_id) THEN
            RAISE EXCEPTION 'Integración no encontrada';
        END IF;

        INSERT INTO public.integracion_log (id_integracion, id_usuario, tipo, recurso, exito, codigo_http, latencia_ms, mensaje)
        VALUES (
            p_id,
            NULLIF(p_datos->>'id_usuario', '')::UUID,
            v_tipo, NULLIF(p_datos->>'recurso', ''), v_exito,
            NULLIF(p_datos->>'codigo_http', '')::INT,
            NULLIF(p_datos->>'latencia_ms', '')::INT,
            LEFT(p_datos->>'mensaje', 500)
        );

        IF v_tipo = 'PRUEBA' THEN
            -- La versión numérica del servidor (ej. 4.0.1) se traduce al código del catálogo (R4); si no coincide se conserva la actual.
            SELECT v.codigo INTO v_version
            FROM public.integracion_version_fhir_catalogo v
            WHERE v.activo AND NULLIF(p_datos->>'version_fhir', '') LIKE v.prefijo_numerico || '%'
            ORDER BY length(v.prefijo_numerico) DESC
            LIMIT 1;

            UPDATE public.integracion_externa i
            SET estado_conexion = v_estado,
                ultima_verificacion = CURRENT_TIMESTAMP,
                latencia_ms = NULLIF(p_datos->>'latencia_ms', '')::INT,
                recursos_soportados = COALESCE(p_datos->'recursos', i.recursos_soportados),
                version_fhir = COALESCE(v_version, i.version_fhir),
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE i.id_integracion = p_id;
        END IF;

        RETURN QUERY SELECT TRUE, 'Evento registrado'::VARCHAR, jsonb_build_object('estado_conexion', v_estado);
        RETURN;
    END IF;

    -- OPCIÓN 8: Historial de eventos (últimos 100); p_id filtra por integración y p_datos.solo_errores limita a fallos.
    IF p_opcion = 8 THEN
        RETURN QUERY
        SELECT TRUE, 'Historial de eventos'::VARCHAR,
               COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.fecha DESC), '[]'::JSONB)
        FROM (
            SELECT lg.id_log, i.nombre AS integracion, lg.tipo, lg.recurso, lg.exito,
                   lg.codigo_http, lg.latencia_ms, lg.mensaje, lg.fecha
            FROM public.integracion_log lg
            JOIN public.integracion_externa i ON i.id_integracion = lg.id_integracion
            WHERE (p_id IS NULL OR lg.id_integracion = p_id)
              AND (NOT COALESCE((p_datos->>'solo_errores')::BOOLEAN, FALSE) OR lg.exito = FALSE)
            ORDER BY lg.fecha DESC
            LIMIT 100
        ) h;
        RETURN;
    END IF;

    -- OPCIÓN 9: Permisos del usuario (p_id = id_usuario): solo roles técnicos ven el módulo y solo algunos pueden editar.
    IF p_opcion = 9 THEN
        SELECT r.codigo, COALESCE(r.es_super_admin, FALSE)
        INTO v_rol, v_super
        FROM public.usuario_sistema u
        JOIN public.rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = p_id AND COALESCE(u.activo, TRUE);

        RETURN QUERY SELECT
            (v_rol IS NOT NULL),
            'Permisos de interoperabilidad'::VARCHAR,
            jsonb_build_object(
                'rol', v_rol,
                'puede_ver', v_super OR v_rol IN ('SUPER_ADMIN', 'ADMIN', 'INTEGRACION', 'AUDITOR'),
                'puede_editar', v_super OR v_rol IN ('SUPER_ADMIN', 'ADMIN', 'INTEGRACION')
            );
        RETURN;
    END IF;

    -- OPCIÓN 10: Tipos de integración (combobox "Tipo"), tabla integracion_tipo_catalogo.
    IF p_opcion = 10 THEN
        RETURN QUERY
        SELECT TRUE, 'Tipos de integración'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', t.codigo, 'nombre', t.nombre) ORDER BY t.orden), '[]'::JSONB)
        FROM public.integracion_tipo_catalogo t
        WHERE t.activo;
        RETURN;
    END IF;

    -- OPCIÓN 11: Mecanismos de autenticación (combobox "Autenticación"), tabla integracion_autenticacion_catalogo.
    IF p_opcion = 11 THEN
        RETURN QUERY
        SELECT TRUE, 'Mecanismos de autenticación'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', a.codigo, 'nombre', a.nombre) ORDER BY a.orden), '[]'::JSONB)
        FROM public.integracion_autenticacion_catalogo a
        WHERE a.activo;
        RETURN;
    END IF;

    -- OPCIÓN 14: Versiones FHIR (combobox "Versión FHIR"), tabla integracion_version_fhir_catalogo; marca la predeterminada.
    IF p_opcion = 14 THEN
        RETURN QUERY
        SELECT TRUE, 'Versiones FHIR'::VARCHAR,
               COALESCE(jsonb_agg(jsonb_build_object('id', v.codigo, 'nombre', v.nombre, 'predeterminado', v.predeterminado) ORDER BY v.orden), '[]'::JSONB)
        FROM public.integracion_version_fhir_catalogo v
        WHERE v.activo;
        RETURN;
    END IF;

    RAISE EXCEPTION 'Opción % no válida para fn_interoperabilidad', p_opcion;
END;
$$ LANGUAGE plpgsql;
