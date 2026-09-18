DROP FUNCTION IF EXISTS public.fn_gestion_clinica(integer, character varying);
DROP FUNCTION IF EXISTS public.fn_gestion_clinica(integer, varchar);

CREATE TABLE IF NOT EXISTS public.estado_clinica_catalogo (
    id_estado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria VARCHAR(40) NOT NULL,
    valor VARCHAR(80) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    predeterminado BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_estado_clinica_catalogo UNIQUE (categoria, valor)
);

INSERT INTO public.estado_clinica_catalogo (categoria, valor, orden, predeterminado)
VALUES
    ('atenciones', 'Realizada', 1, TRUE),
    ('atenciones', 'Programada', 2, FALSE),
    ('atenciones', 'En curso', 3, FALSE),
    ('diagnosticos', 'Confirmado', 1, TRUE),
    ('diagnosticos', 'Pendiente', 2, FALSE),
    ('diagnosticos', 'Descartado', 3, FALSE),
    ('alergias', 'Baja', 1, FALSE),
    ('alergias', 'Moderada', 2, TRUE),
    ('alergias', 'Alta', 3, FALSE),
    ('medicamentos', 'Activo', 1, TRUE),
    ('medicamentos', 'Suspendido', 2, FALSE),
    ('medicamentos', 'Finalizado', 3, FALSE),
    ('examenes', 'Completado', 1, TRUE),
    ('examenes', 'Pendiente', 2, FALSE),
    ('examenes', 'Anulado', 3, FALSE),
    ('observaciones', 'General', 1, TRUE),
    ('observaciones', 'Seguimiento', 2, FALSE),
    ('observaciones', 'Control', 3, FALSE)
ON CONFLICT (categoria, valor) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_gestion_clinica(
    p_opcion INT,
    p_rut VARCHAR DEFAULT NULL,
    p_id VARCHAR DEFAULT NULL,
    p_id_paciente UUID DEFAULT NULL,
    p_id_establecimiento UUID DEFAULT NULL,
    p_id_profesional UUID DEFAULT NULL,
    p_tipo_atencion VARCHAR DEFAULT NULL,
    p_motivo_consulta TEXT DEFAULT NULL,
    p_estado VARCHAR DEFAULT NULL,
    p_fecha_inicio TIMESTAMP DEFAULT NULL,
    p_fecha_fin TIMESTAMP DEFAULT NULL,
    p_codigo_cie10 VARCHAR DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL,
    p_fecha_diagnostico DATE DEFAULT NULL,
    p_alergeno VARCHAR DEFAULT NULL,
    p_tipo_reaccion VARCHAR DEFAULT NULL,
    p_criticidad VARCHAR DEFAULT NULL,
    p_observacion TEXT DEFAULT NULL,
    p_nombre_medicamento VARCHAR DEFAULT NULL,
    p_dosis VARCHAR DEFAULT NULL,
    p_frecuencia VARCHAR DEFAULT NULL,
    p_via_administracion VARCHAR DEFAULT NULL,
    p_tipo_examen VARCHAR DEFAULT NULL,
    p_resultado TEXT DEFAULT NULL,
    p_tipo_observacion VARCHAR DEFAULT NULL,
    p_valor TEXT DEFAULT NULL,
    p_unidad_medida VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    encontrado BOOLEAN,
    id_registro UUID,
    id_paciente UUID,
    rut VARCHAR,
    nombre_paciente VARCHAR,
    id_atencion UUID,
    id_establecimiento UUID,
    id_profesional UUID,
    tipo_atencion VARCHAR,
    motivo_consulta TEXT,
    estado VARCHAR,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    codigo_cie10 VARCHAR,
    descripcion TEXT,
    fecha_diagnostico DATE,
    alergeno VARCHAR,
    tipo_reaccion VARCHAR,
    criticidad VARCHAR,
    nombre_medicamento VARCHAR,
    dosis VARCHAR,
    frecuencia VARCHAR,
    via_administracion VARCHAR,
    tipo_examen VARCHAR,
    resultado TEXT,
    tipo_observacion VARCHAR,
    valor TEXT,
    unidad_medida VARCHAR,
    fecha_registro TIMESTAMP,
    establecimiento_origen VARCHAR,
    profesional_nombre VARCHAR,
    nombre_completo VARCHAR,
    edad INT,
    sexo VARCHAR,
    recursos_ficha INT,
    atenciones INT,
    alergias_registradas INT,
    medicamentos_activos INT
) AS $$
DECLARE
    v_clean_rut VARCHAR;
    v_id_paciente UUID;
    v_paciente RECORD;
    v_atencion RECORD;
    v_diagnostico RECORD;
    v_alergia RECORD;
    v_medicamento RECORD;
    v_examen RECORD;
    v_observacion RECORD;
BEGIN
    v_clean_rut := LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')));

    /*
     * FN_GESTION_CLINICA
     * Función principal para la gestión clínica del sistema SICHCP.
     *
     * Opción 1: búsqueda de paciente por RUT e indicadores asociados
     * Opción 2: listado de atenciones por paciente
     * Opción 3: detalle de atención por id
     * Opción 4: crear/actualizar atención
     * Opción 5: listado de diagnósticos por paciente
     * Opción 6: crear/actualizar diagnóstico
     * Opción 7: listado de alergias por paciente
     * Opción 8: crear/actualizar alergia
     * Opción 9: listado de medicamentos por paciente
     * Opción 10: crear/actualizar medicamento
     * Opción 11: listado de exámenes por paciente
     * Opción 12: crear/actualizar examen
     * Opción 13: listado de observaciones por paciente
     * Opción 14: crear/actualizar observación clínica
     */

    IF p_opcion = 1 THEN
        IF v_clean_rut IS NULL OR v_clean_rut = '' THEN
            RETURN QUERY
            SELECT
                FALSE::BOOLEAN AS encontrado,
                NULL::UUID AS id_registro,
                NULL::UUID AS id_paciente,
                NULL::VARCHAR AS rut,
                NULL::VARCHAR AS nombre_paciente,
                NULL::UUID AS id_atencion,
                NULL::UUID AS id_establecimiento,
                NULL::UUID AS id_profesional,
                NULL::VARCHAR AS tipo_atencion,
                NULL::TEXT AS motivo_consulta,
                NULL::VARCHAR AS estado,
                NULL::TIMESTAMP AS fecha_inicio,
                NULL::TIMESTAMP AS fecha_fin,
                NULL::VARCHAR AS codigo_cie10,
                NULL::TEXT AS descripcion,
                NULL::DATE AS fecha_diagnostico,
                NULL::VARCHAR AS alergeno,
                NULL::VARCHAR AS tipo_reaccion,
                NULL::VARCHAR AS criticidad,
                NULL::VARCHAR AS nombre_medicamento,
                NULL::VARCHAR AS dosis,
                NULL::VARCHAR AS frecuencia,
                NULL::VARCHAR AS via_administracion,
                NULL::VARCHAR AS tipo_examen,
                NULL::TEXT AS resultado,
                NULL::VARCHAR AS tipo_observacion,
                NULL::TEXT AS valor,
                NULL::VARCHAR AS unidad_medida,
                NULL::TIMESTAMP AS fecha_registro,
                NULL::VARCHAR AS establecimiento_origen,
                NULL::VARCHAR AS profesional_nombre,
                NULL::VARCHAR AS nombre_completo,
                0::INT AS edad,
                NULL::VARCHAR AS sexo,
                0::INT AS recursos_ficha,
                0::INT AS atenciones,
                0::INT AS alergias_registradas,
                0::INT AS medicamentos_activos;
            RETURN;
        END IF;

        SELECT p.id_paciente,
               p.rut,
               TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
               COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
               (CASE
                   WHEN LOWER(p.sexo) IN ('m', 'masculino') THEN 'Masculino'
                   WHEN LOWER(p.sexo) IN ('f', 'femenino') THEN 'Femenino'
                   ELSE COALESCE(p.sexo, 'No especificado')
               END)::VARCHAR AS sexo
        INTO v_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_paciente.id_paciente IS NULL THEN
            RETURN QUERY
            SELECT
                FALSE::BOOLEAN AS encontrado,
                NULL::UUID AS id_registro,
                NULL::UUID AS id_paciente,
                NULL::VARCHAR AS rut,
                NULL::VARCHAR AS nombre_paciente,
                NULL::UUID AS id_atencion,
                NULL::UUID AS id_establecimiento,
                NULL::UUID AS id_profesional,
                NULL::VARCHAR AS tipo_atencion,
                NULL::TEXT AS motivo_consulta,
                NULL::VARCHAR AS estado,
                NULL::TIMESTAMP AS fecha_inicio,
                NULL::TIMESTAMP AS fecha_fin,
                NULL::VARCHAR AS codigo_cie10,
                NULL::TEXT AS descripcion,
                NULL::DATE AS fecha_diagnostico,
                NULL::VARCHAR AS alergeno,
                NULL::VARCHAR AS tipo_reaccion,
                NULL::VARCHAR AS criticidad,
                NULL::VARCHAR AS nombre_medicamento,
                NULL::VARCHAR AS dosis,
                NULL::VARCHAR AS frecuencia,
                NULL::VARCHAR AS via_administracion,
                NULL::VARCHAR AS tipo_examen,
                NULL::TEXT AS resultado,
                NULL::VARCHAR AS tipo_observacion,
                NULL::TEXT AS valor,
                NULL::VARCHAR AS unidad_medida,
                NULL::TIMESTAMP AS fecha_registro,
                NULL::VARCHAR AS establecimiento_origen,
                NULL::VARCHAR AS profesional_nombre,
                NULL::VARCHAR AS nombre_completo,
                0::INT AS edad,
                NULL::VARCHAR AS sexo,
                0::INT AS recursos_ficha,
                0::INT AS atenciones,
                0::INT AS alergias_registradas,
                0::INT AS medicamentos_activos;
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN AS encontrado,
            NULL::UUID AS id_registro,
            v_paciente.id_paciente AS id_paciente,
            v_paciente.rut::VARCHAR AS rut,
            v_paciente.nombre_completo::VARCHAR AS nombre_paciente,
            NULL::UUID AS id_atencion,
            NULL::UUID AS id_establecimiento,
            NULL::UUID AS id_profesional,
            NULL::VARCHAR AS tipo_atencion,
            NULL::TEXT AS motivo_consulta,
            NULL::VARCHAR AS estado,
            NULL::TIMESTAMP AS fecha_inicio,
            NULL::TIMESTAMP AS fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            NULL::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            NULL::TIMESTAMP AS fecha_registro,
            NULL::VARCHAR AS establecimiento_origen,
            NULL::VARCHAR AS profesional_nombre,
            v_paciente.nombre_completo::VARCHAR AS nombre_completo,
            v_paciente.edad::INT AS edad,
            v_paciente.sexo::VARCHAR AS sexo,
            (
                (CASE WHEN EXISTS (SELECT 1 FROM atencion a WHERE a.id_paciente = v_paciente.id_paciente) THEN 1 ELSE 0 END) +
                (CASE WHEN EXISTS (SELECT 1 FROM diagnostico d WHERE d.id_paciente = v_paciente.id_paciente) THEN 1 ELSE 0 END) +
                (CASE WHEN EXISTS (SELECT 1 FROM alergia al WHERE al.id_paciente = v_paciente.id_paciente) THEN 1 ELSE 0 END) +
                (CASE WHEN EXISTS (SELECT 1 FROM medicamento m WHERE m.id_paciente = v_paciente.id_paciente) THEN 1 ELSE 0 END) +
                (CASE WHEN EXISTS (SELECT 1 FROM examen ex WHERE ex.id_paciente = v_paciente.id_paciente) THEN 1 ELSE 0 END) +
                (CASE WHEN EXISTS (SELECT 1 FROM observacion_clinica obs WHERE obs.id_paciente = v_paciente.id_paciente) THEN 1 ELSE 0 END)
            )::INT AS recursos_ficha,
            (SELECT COUNT(*)::INT FROM atencion a WHERE a.id_paciente = v_paciente.id_paciente) AS atenciones,
            (SELECT COUNT(*)::INT FROM alergia al WHERE al.id_paciente = v_paciente.id_paciente) AS alergias_registradas,
            (SELECT COUNT(*)::INT FROM medicamento m WHERE m.id_paciente = v_paciente.id_paciente) AS medicamentos_activos;
        RETURN;

    ELSIF p_opcion = 2 THEN
        IF v_clean_rut IS NULL OR v_clean_rut = '' THEN
            RETURN QUERY SELECT NULL::BOOLEAN, NULL::UUID, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, NULL::UUID, NULL::UUID, NULL::VARCHAR, NULL::TEXT, NULL::VARCHAR, NULL::TIMESTAMP, NULL::TIMESTAMP, NULL::VARCHAR, NULL::TEXT, NULL::DATE, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT, NULL::VARCHAR, NULL::TEXT, NULL::VARCHAR, NULL::TIMESTAMP, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, 0::INT, NULL::VARCHAR, 0::INT, 0::INT, 0::INT, 0::INT;
            RETURN;
        END IF;

        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_id_paciente IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            a.id_atencion AS id_registro,
            a.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            a.id_atencion,
            a.id_establecimiento,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::DATE,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            a.fecha_creacion AS fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM atencion a
        INNER JOIN paciente p ON p.id_paciente = a.id_paciente
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE a.id_paciente = v_id_paciente
        ORDER BY a.fecha_inicio DESC;

    ELSIF p_opcion = 3 THEN
        IF p_id IS NULL OR p_id = '' THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            a.id_atencion AS id_registro,
            a.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            a.id_atencion,
            a.id_establecimiento,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::DATE,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            a.fecha_creacion AS fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM atencion a
        INNER JOIN paciente p ON p.id_paciente = a.id_paciente
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE a.id_atencion::TEXT = p_id
        LIMIT 1;

    ELSIF p_opcion = 4 THEN
        IF p_id_paciente IS NULL AND (p_rut IS NULL OR p_rut = '') THEN
            RETURN;
        END IF;

        IF p_id_paciente IS NULL THEN
            SELECT p.id_paciente INTO v_id_paciente
            FROM paciente p
            WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')))
            LIMIT 1;
        ELSE
            v_id_paciente := p_id_paciente;
        END IF;

        IF p_id IS NOT NULL AND p_id <> '' THEN
            UPDATE atencion
            SET id_paciente = COALESCE(v_id_paciente, id_paciente),
                id_establecimiento = COALESCE(p_id_establecimiento, id_establecimiento),
                id_profesional = COALESCE(p_id_profesional, id_profesional),
                tipo_atencion = COALESCE(p_tipo_atencion, tipo_atencion),
                motivo_consulta = COALESCE(p_motivo_consulta, motivo_consulta),
                estado = COALESCE(p_estado, estado),
                fecha_inicio = COALESCE(p_fecha_inicio, fecha_inicio),
                fecha_fin = COALESCE(p_fecha_fin, fecha_fin)
            WHERE id_atencion::TEXT = p_id;
        ELSE
            INSERT INTO atencion (
                id_paciente,
                id_profesional,
                id_establecimiento,
                tipo_atencion,
                fecha_inicio,
                fecha_fin,
                motivo_consulta,
                estado
            ) VALUES (
                v_id_paciente,
                p_id_profesional,
                p_id_establecimiento,
                p_tipo_atencion,
                COALESCE(p_fecha_inicio, CURRENT_TIMESTAMP),
                p_fecha_fin,
                p_motivo_consulta,
                COALESCE(p_estado, (SELECT valor FROM estado_clinica_catalogo WHERE categoria = 'atenciones' AND predeterminado AND activo LIMIT 1))
            );
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            a.id_atencion AS id_registro,
            a.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            a.id_atencion,
            a.id_establecimiento,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::DATE,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            a.fecha_creacion AS fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM atencion a
        INNER JOIN paciente p ON p.id_paciente = a.id_paciente
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE a.id_paciente = COALESCE(v_id_paciente, a.id_paciente)
        ORDER BY a.fecha_creacion DESC
        LIMIT 1;

    ELSIF p_opcion = 5 THEN
        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_id_paciente IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            d.id_diagnostico AS id_registro,
            d.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            d.id_atencion,
            a.id_establecimiento,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            d.codigo_cie10,
            d.descripcion,
            d.fecha_diagnostico,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            d.fecha_registro AS fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM diagnostico d
        INNER JOIN paciente p ON p.id_paciente = d.id_paciente
        LEFT JOIN atencion a ON a.id_atencion = d.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE d.id_paciente = v_id_paciente
        ORDER BY d.fecha_registro DESC;

    ELSIF p_opcion = 6 THEN
        IF p_id_paciente IS NULL AND (p_rut IS NULL OR p_rut = '') THEN
            RETURN;
        END IF;

        IF p_id_paciente IS NULL THEN
            SELECT p.id_paciente INTO v_id_paciente
            FROM paciente p
            WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')))
            LIMIT 1;
        ELSE
            v_id_paciente := p_id_paciente;
        END IF;

        IF p_id IS NOT NULL AND p_id <> '' THEN
            UPDATE diagnostico
            SET id_paciente = COALESCE(v_id_paciente, id_paciente),
                id_atencion = COALESCE(p_id_establecimiento, id_atencion),
                codigo_cie10 = COALESCE(p_codigo_cie10, codigo_cie10),
                descripcion = COALESCE(p_descripcion, descripcion),
                estado = COALESCE(p_estado, estado),
                fecha_diagnostico = COALESCE(p_fecha_diagnostico, fecha_diagnostico)
            WHERE id_diagnostico::TEXT = p_id;
        ELSE
            INSERT INTO diagnostico (
                id_paciente,
                id_atencion,
                codigo_cie10,
                descripcion,
                estado,
                fecha_diagnostico
            ) VALUES (
                v_id_paciente,
                p_id_establecimiento,
                p_codigo_cie10,
                p_descripcion,
                COALESCE(p_estado, (SELECT valor FROM estado_clinica_catalogo WHERE categoria = 'diagnosticos' AND predeterminado AND activo LIMIT 1)),
                COALESCE(p_fecha_diagnostico, CURRENT_DATE)
            );
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            d.id_diagnostico AS id_registro,
            d.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            d.id_atencion,
            a.id_establecimiento,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            d.codigo_cie10,
            d.descripcion,
            d.fecha_diagnostico,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            d.fecha_registro AS fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM diagnostico d
        INNER JOIN paciente p ON p.id_paciente = d.id_paciente
        LEFT JOIN atencion a ON a.id_atencion = d.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE d.id_paciente = v_id_paciente
        ORDER BY d.fecha_registro DESC
        LIMIT 1;

    ELSIF p_opcion = 7 THEN
        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_id_paciente IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            a.id_alergia AS id_registro,
            a.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            NULL::UUID AS id_atencion,
            NULL::UUID AS id_establecimiento,
            NULL::UUID AS id_profesional,
            NULL::VARCHAR AS tipo_atencion,
            NULL::TEXT AS motivo_consulta,
            NULL::VARCHAR AS estado,
            NULL::TIMESTAMP AS fecha_inicio,
            NULL::TIMESTAMP AS fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            a.observacion AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            a.alergeno,
            a.tipo_reaccion,
            a.criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            a.fecha_registro,
            'Red Pública SICHCP'::VARCHAR AS establecimiento_origen,
            NULL::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM alergia a
        INNER JOIN paciente p ON p.id_paciente = a.id_paciente
        WHERE a.id_paciente = v_id_paciente
        ORDER BY a.fecha_registro DESC;

    ELSIF p_opcion = 8 THEN
        IF p_id_paciente IS NULL AND (p_rut IS NULL OR p_rut = '') THEN
            RETURN;
        END IF;

        IF p_id_paciente IS NULL THEN
            SELECT p.id_paciente INTO v_id_paciente
            FROM paciente p
            WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')))
            LIMIT 1;
        ELSE
            v_id_paciente := p_id_paciente;
        END IF;

        IF p_id IS NOT NULL AND p_id <> '' THEN
            UPDATE alergia
            SET id_paciente = COALESCE(v_id_paciente, id_paciente),
                alergeno = COALESCE(p_alergeno, alergeno),
                tipo_reaccion = COALESCE(p_tipo_reaccion, tipo_reaccion),
                criticidad = COALESCE(p_criticidad, criticidad),
                observacion = COALESCE(p_observacion, observacion)
            WHERE id_alergia::TEXT = p_id;
        ELSE
            INSERT INTO alergia (
                id_paciente,
                alergeno,
                tipo_reaccion,
                criticidad,
                observacion
            ) VALUES (
                v_id_paciente,
                p_alergeno,
                p_tipo_reaccion,
                p_criticidad,
                p_observacion
            );
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            a.id_alergia AS id_registro,
            a.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            NULL::UUID AS id_atencion,
            NULL::UUID AS id_establecimiento,
            NULL::UUID AS id_profesional,
            NULL::VARCHAR AS tipo_atencion,
            NULL::TEXT AS motivo_consulta,
            NULL::VARCHAR AS estado,
            NULL::TIMESTAMP AS fecha_inicio,
            NULL::TIMESTAMP AS fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            a.observacion AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            a.alergeno,
            a.tipo_reaccion,
            a.criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            a.fecha_registro,
            'Red Pública SICHCP'::VARCHAR AS establecimiento_origen,
            NULL::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM alergia a
        INNER JOIN paciente p ON p.id_paciente = a.id_paciente
        WHERE a.id_paciente = v_id_paciente
        ORDER BY a.fecha_registro DESC
        LIMIT 1;

    ELSIF p_opcion = 9 THEN
        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_id_paciente IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            m.id_medicamento AS id_registro,
            m.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            NULL::UUID AS id_atencion,
            NULL::UUID AS id_establecimiento,
            NULL::UUID AS id_profesional,
            NULL::VARCHAR AS tipo_atencion,
            NULL::TEXT AS motivo_consulta,
            NULL::VARCHAR AS estado,
            NULL::TIMESTAMP AS fecha_inicio,
            NULL::TIMESTAMP AS fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            (m.nombre_medicamento || COALESCE(' ' || m.dosis, '') || COALESCE(' - ' || m.frecuencia, ''))::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            m.nombre_medicamento,
            m.dosis,
            m.frecuencia,
            m.via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            m.fecha_registro,
            'Red Pública SICHCP'::VARCHAR AS establecimiento_origen,
            NULL::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM medicamento m
        INNER JOIN paciente p ON p.id_paciente = m.id_paciente
        WHERE m.id_paciente = v_id_paciente
        ORDER BY m.fecha_registro DESC;

    ELSIF p_opcion = 10 THEN
        IF p_id_paciente IS NULL AND (p_rut IS NULL OR p_rut = '') THEN
            RETURN;
        END IF;

        IF p_id_paciente IS NULL THEN
            SELECT p.id_paciente INTO v_id_paciente
            FROM paciente p
            WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')))
            LIMIT 1;
        ELSE
            v_id_paciente := p_id_paciente;
        END IF;

        IF p_id IS NOT NULL AND p_id <> '' THEN
            UPDATE medicamento
            SET id_paciente = COALESCE(v_id_paciente, id_paciente),
                nombre_medicamento = COALESCE(p_nombre_medicamento, nombre_medicamento),
                dosis = COALESCE(p_dosis, dosis),
                frecuencia = COALESCE(p_frecuencia, frecuencia),
                via_administracion = COALESCE(p_via_administracion, via_administracion),
                estado = COALESCE(p_estado, estado)
            WHERE id_medicamento::TEXT = p_id;
        ELSE
            INSERT INTO medicamento (
                id_paciente,
                nombre_medicamento,
                dosis,
                frecuencia,
                via_administracion,
                estado
            ) VALUES (
                v_id_paciente,
                p_nombre_medicamento,
                p_dosis,
                p_frecuencia,
                p_via_administracion,
                COALESCE(p_estado, (SELECT valor FROM estado_clinica_catalogo WHERE categoria = 'medicamentos' AND predeterminado AND activo LIMIT 1))
            );
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            m.id_medicamento AS id_registro,
            m.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            NULL::UUID AS id_atencion,
            NULL::UUID AS id_establecimiento,
            NULL::UUID AS id_profesional,
            NULL::VARCHAR AS tipo_atencion,
            NULL::TEXT AS motivo_consulta,
            NULL::VARCHAR AS estado,
            NULL::TIMESTAMP AS fecha_inicio,
            NULL::TIMESTAMP AS fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            (m.nombre_medicamento || COALESCE(' ' || m.dosis, '') || COALESCE(' - ' || m.frecuencia, ''))::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            m.nombre_medicamento,
            m.dosis,
            m.frecuencia,
            m.via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            m.fecha_registro,
            'Red Pública SICHCP'::VARCHAR AS establecimiento_origen,
            NULL::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM medicamento m
        INNER JOIN paciente p ON p.id_paciente = m.id_paciente
        WHERE m.id_paciente = v_id_paciente
        ORDER BY m.fecha_registro DESC
        LIMIT 1;

    ELSIF p_opcion = 11 THEN
        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_id_paciente IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            e.id_examen AS id_registro,
            e.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            e.id_atencion,
            e.id_establecimiento_origen,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            (e.tipo_examen || COALESCE(': ' || e.resultado, ''))::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            e.tipo_examen,
            e.resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            e.fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM examen e
        INNER JOIN paciente p ON p.id_paciente = e.id_paciente
        LEFT JOIN atencion a ON a.id_atencion = e.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = e.id_establecimiento_origen
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE e.id_paciente = v_id_paciente
        ORDER BY e.fecha_registro DESC;

    ELSIF p_opcion = 12 THEN
        IF p_id_paciente IS NULL AND (p_rut IS NULL OR p_rut = '') THEN
            RETURN;
        END IF;

        IF p_id_paciente IS NULL THEN
            SELECT p.id_paciente INTO v_id_paciente
            FROM paciente p
            WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')))
            LIMIT 1;
        ELSE
            v_id_paciente := p_id_paciente;
        END IF;

        IF p_id IS NOT NULL AND p_id <> '' THEN
            UPDATE examen
            SET id_paciente = COALESCE(v_id_paciente, id_paciente),
                id_atencion = COALESCE(p_id_establecimiento, id_atencion),
                id_establecimiento_origen = COALESCE(p_id_establecimiento, id_establecimiento_origen),
                tipo_examen = COALESCE(p_tipo_examen, tipo_examen),
                resultado = COALESCE(p_resultado, resultado),
                estado = COALESCE(p_estado, estado)
            WHERE id_examen::TEXT = p_id;
        ELSE
            INSERT INTO examen (
                id_paciente,
                id_atencion,
                id_establecimiento_origen,
                tipo_examen,
                resultado,
                estado
            ) VALUES (
                v_id_paciente,
                p_id_establecimiento,
                p_id_establecimiento,
                p_tipo_examen,
                p_resultado,
                COALESCE(p_estado, (SELECT valor FROM estado_clinica_catalogo WHERE categoria = 'examenes' AND predeterminado AND activo LIMIT 1))
            );
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            e.id_examen AS id_registro,
            e.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            e.id_atencion,
            e.id_establecimiento_origen,
            a.id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            (e.tipo_examen || COALESCE(': ' || e.resultado, ''))::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            e.tipo_examen,
            e.resultado,
            NULL::VARCHAR AS tipo_observacion,
            NULL::TEXT AS valor,
            NULL::VARCHAR AS unidad_medida,
            e.fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM examen e
        INNER JOIN paciente p ON p.id_paciente = e.id_paciente
        LEFT JOIN atencion a ON a.id_atencion = e.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = e.id_establecimiento_origen
        LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional
        WHERE e.id_paciente = v_id_paciente
        ORDER BY e.fecha_registro DESC
        LIMIT 1;

    ELSIF p_opcion = 13 THEN
        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_id_paciente IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            o.id_observacion AS id_registro,
            o.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            o.id_atencion,
            a.id_establecimiento,
            o.registrado_por AS id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            (o.tipo_observacion || COALESCE(': ' || o.valor || ' ' || COALESCE(o.unidad_medida, ''), ''))::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            o.tipo_observacion,
            o.valor,
            o.unidad_medida,
            o.fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM observacion_clinica o
        INNER JOIN paciente p ON p.id_paciente = o.id_paciente
        LEFT JOIN atencion a ON a.id_atencion = o.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = o.registrado_por
        WHERE o.id_paciente = v_id_paciente
        ORDER BY o.fecha_registro DESC;

    ELSIF p_opcion = 14 THEN
        IF p_id_paciente IS NULL AND (p_rut IS NULL OR p_rut = '') THEN
            RETURN;
        END IF;

        IF p_id_paciente IS NULL THEN
            SELECT p.id_paciente INTO v_id_paciente
            FROM paciente p
            WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')))
            LIMIT 1;
        ELSE
            v_id_paciente := p_id_paciente;
        END IF;

        IF p_id IS NOT NULL AND p_id <> '' THEN
            UPDATE observacion_clinica
            SET id_paciente = COALESCE(v_id_paciente, id_paciente),
                id_atencion = COALESCE(p_id_establecimiento, id_atencion),
                tipo_observacion = COALESCE(p_tipo_observacion, tipo_observacion),
                valor = COALESCE(p_valor, valor),
                unidad_medida = COALESCE(p_unidad_medida, unidad_medida),
                registrado_por = COALESCE(p_id_profesional, registrado_por)
            WHERE id_observacion::TEXT = p_id;
        ELSE
            INSERT INTO observacion_clinica (
                id_paciente,
                id_atencion,
                tipo_observacion,
                valor,
                unidad_medida,
                registrado_por
            ) VALUES (
                v_id_paciente,
                p_id_establecimiento,
                p_tipo_observacion,
                p_valor,
                p_unidad_medida,
                p_id_profesional
            );
        END IF;

        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            o.id_observacion AS id_registro,
            o.id_paciente,
            p.rut,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_paciente,
            o.id_atencion,
            a.id_establecimiento,
            o.registrado_por AS id_profesional,
            a.tipo_atencion,
            a.motivo_consulta,
            a.estado,
            a.fecha_inicio,
            a.fecha_fin,
            NULL::VARCHAR AS codigo_cie10,
            (o.tipo_observacion || COALESCE(': ' || o.valor || ' ' || COALESCE(o.unidad_medida, ''), ''))::TEXT AS descripcion,
            NULL::DATE AS fecha_diagnostico,
            NULL::VARCHAR AS alergeno,
            NULL::VARCHAR AS tipo_reaccion,
            NULL::VARCHAR AS criticidad,
            NULL::VARCHAR AS nombre_medicamento,
            NULL::VARCHAR AS dosis,
            NULL::VARCHAR AS frecuencia,
            NULL::VARCHAR AS via_administracion,
            NULL::VARCHAR AS tipo_examen,
            NULL::TEXT AS resultado,
            o.tipo_observacion,
            o.valor,
            o.unidad_medida,
            o.fecha_registro,
            es.nombre AS establecimiento_origen,
            TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM observacion_clinica o
        INNER JOIN paciente p ON p.id_paciente = o.id_paciente
        LEFT JOIN atencion a ON a.id_atencion = o.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = o.registrado_por
        WHERE o.id_paciente = v_id_paciente
        ORDER BY o.fecha_registro DESC
        LIMIT 1;

    ELSIF p_opcion = 15 THEN
        RETURN QUERY
        SELECT
            TRUE::BOOLEAN,
            NULL::UUID,
            NULL::UUID,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::UUID,
            NULL::UUID,
            NULL::UUID,
            c.categoria::VARCHAR,
            NULL::TEXT,
            c.valor::VARCHAR,
            NULL::TIMESTAMP,
            NULL::TIMESTAMP,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::DATE,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TEXT,
            NULL::VARCHAR,
            NULL::TIMESTAMP,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::VARCHAR,
            NULL::INT,
            NULL::VARCHAR,
            NULL::INT,
            NULL::INT,
            NULL::INT,
            NULL::INT
        FROM estado_clinica_catalogo c
        WHERE c.activo
        ORDER BY c.categoria, c.orden, c.valor;

    ELSE
        RAISE EXCEPTION 'Opción % no es válida para FN_GESTION_CLINICA', p_opcion;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_recursos_ficha_paciente(p_rut VARCHAR)
RETURNS TABLE (
    id_recurso UUID,
    fecha TIMESTAMP,
    tipo_recurso VARCHAR,
    codigo_fhir VARCHAR,
    descripcion TEXT,
    establecimiento_origen VARCHAR,
    estado VARCHAR
) AS $$
DECLARE
    v_clean_rut VARCHAR;
    v_id_paciente UUID;
BEGIN
    v_clean_rut := LOWER(TRIM(REPLACE(REPLACE(COALESCE(p_rut, ''), '.', ''), '-', '')));

    SELECT p.id_paciente INTO v_id_paciente
    FROM paciente p
    WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
    LIMIT 1;

    IF v_id_paciente IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT a.id_atencion AS id_recurso,
           a.fecha_inicio AS fecha,
           'Atención'::VARCHAR AS tipo_recurso,
           'Encounter'::VARCHAR AS codigo_fhir,
           COALESCE(a.motivo_consulta, a.tipo_atencion, 'Consulta Médica Generada')::TEXT AS descripcion,
           COALESCE(e.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
           COALESCE(a.estado, 'Realizada')::VARCHAR AS estado
    FROM atencion a
    LEFT JOIN establecimiento_salud e ON a.id_establecimiento = e.id_establecimiento
    WHERE a.id_paciente = v_id_paciente

    UNION ALL

    SELECT d.id_diagnostico AS id_recurso,
           d.fecha_registro AS fecha,
           'Diagnóstico'::VARCHAR AS tipo_recurso,
           'Condition'::VARCHAR AS codigo_fhir,
           (CASE WHEN d.codigo_cie10 IS NOT NULL AND d.codigo_cie10 <> '' THEN d.codigo_cie10 || ' - ' ELSE '' END || d.descripcion)::TEXT AS descripcion,
           COALESCE(e.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
           COALESCE(d.estado, 'Confirmado')::VARCHAR AS estado
    FROM diagnostico d
    LEFT JOIN atencion a ON d.id_atencion = a.id_atencion
    LEFT JOIN establecimiento_salud e ON a.id_establecimiento = e.id_establecimiento
    WHERE d.id_paciente = v_id_paciente

    UNION ALL

    SELECT al.id_alergia AS id_recurso,
           al.fecha_registro AS fecha,
           'Alergia'::VARCHAR AS tipo_recurso,
           'AllergyIntolerance'::VARCHAR AS codigo_fhir,
           (al.alergeno || COALESCE(' (' || al.tipo_reaccion || ')', '') || COALESCE(' - Criticidad: ' || al.criticidad, ''))::TEXT AS descripcion,
           'Red Pública SICHCP'::VARCHAR AS establecimiento_origen,
           'Activo'::VARCHAR AS estado
    FROM alergia al
    WHERE al.id_paciente = v_id_paciente

    UNION ALL

    SELECT m.id_medicamento AS id_recurso,
           m.fecha_registro AS fecha,
           'Medicamento'::VARCHAR AS tipo_recurso,
           'MedicationRequest'::VARCHAR AS codigo_fhir,
           (m.nombre_medicamento || COALESCE(' ' || m.dosis, '') || COALESCE(' - ' || m.frecuencia, ''))::TEXT AS descripcion,
           'Red Pública SICHCP'::VARCHAR AS establecimiento_origen,
           COALESCE(m.estado, 'Activo')::VARCHAR AS estado
    FROM medicamento m
    WHERE m.id_paciente = v_id_paciente

    UNION ALL

    SELECT ex.id_examen AS id_recurso,
           ex.fecha_registro AS fecha,
           'Examen'::VARCHAR AS tipo_recurso,
           'DiagnosticReport'::VARCHAR AS codigo_fhir,
           (ex.tipo_examen || COALESCE(': ' || ex.resultado, ''))::TEXT AS descripcion,
           COALESCE(e.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
           'Completado'::VARCHAR AS estado
    FROM examen ex
    LEFT JOIN establecimiento_salud e ON ex.id_establecimiento_origen = e.id_establecimiento
    WHERE ex.id_paciente = v_id_paciente

    UNION ALL

    SELECT obs.id_observacion AS id_recurso,
           obs.fecha_registro AS fecha,
           'Observación Clínica'::VARCHAR AS tipo_recurso,
           'Observation'::VARCHAR AS codigo_fhir,
           (obs.tipo_observacion || COALESCE(': ' || obs.valor || ' ' || COALESCE(obs.unidad_medida, ''), ''))::TEXT AS descripcion,
           COALESCE(e.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
           'Finalizado'::VARCHAR AS estado
    FROM observacion_clinica obs
    LEFT JOIN atencion a ON obs.id_atencion = a.id_atencion
    LEFT JOIN establecimiento_salud e ON a.id_establecimiento = e.id_establecimiento
    WHERE obs.id_paciente = v_id_paciente
    ORDER BY fecha DESC;
END;
$$ LANGUAGE plpgsql;
