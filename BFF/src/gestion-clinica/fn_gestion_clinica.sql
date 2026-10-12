DROP FUNCTION IF EXISTS public.fn_gestion_clinica(integer, character varying);
DROP FUNCTION IF EXISTS public.fn_gestion_clinica(integer, varchar);
DROP FUNCTION IF EXISTS public.fn_gestion_clinica(integer, character varying, character varying, uuid, uuid, uuid, character varying, text, character varying, timestamp without time zone, timestamp without time zone, character varying, text, date, character varying, character varying, character varying, text, character varying, character varying, character varying, character varying, character varying, text, character varying, text, character varying);

CREATE TABLE IF NOT EXISTS public.region (
    id_region UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(5) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    orden INT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.comuna (
    id_comuna UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_region UUID NOT NULL REFERENCES public.region(id_region),
    nombre VARCHAR(100) NOT NULL,
    CONSTRAINT uq_comuna_region_nombre UNIQUE (id_region, nombre)
);

CREATE INDEX IF NOT EXISTS idx_comuna_region ON public.comuna(id_region);

CREATE TABLE IF NOT EXISTS public.tipo_alergia (
    id_tipo_alergia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.atencion
    ADD COLUMN IF NOT EXISTS id_profesional_registra UUID,
    ADD COLUMN IF NOT EXISTS id_profesional_atiende UUID,
    ADD COLUMN IF NOT EXISTS id_area_derivada UUID,
    ADD COLUMN IF NOT EXISTS id_area_destino UUID,
    ADD COLUMN IF NOT EXISTS detalle_observaciones VARCHAR(300);

DO $$
BEGIN
    ALTER TABLE public.atencion
        ADD CONSTRAINT chk_atencion_detalle_observaciones
        CHECK (detalle_observaciones IS NULL OR char_length(detalle_observaciones) <= 300);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.medicamento
    ADD COLUMN IF NOT EXISTS id_atencion UUID REFERENCES public.atencion(id_atencion),
    ADD COLUMN IF NOT EXISTS intervalo_horas INTEGER,
    ADD COLUMN IF NOT EXISTS dias_tratamiento INTEGER;

ALTER TABLE public.alergia
    ADD COLUMN IF NOT EXISTS id_atencion UUID REFERENCES public.atencion(id_atencion);

CREATE TABLE IF NOT EXISTS public.catalogo_examen (
    nombre VARCHAR(150) PRIMARY KEY,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.catalogo_examen (nombre) VALUES
    ('Hemograma'),
    ('Glicemia'),
    ('PCR'),
    ('Radiografía de tórax'),
    ('Perfil lipídico'),
    ('Perfil bioquímico'),
    ('Orina completa'),
    ('Electrocardiograma'),
    ('Ecografía abdominal'),
    ('Creatinina plasmática'),
    ('Hemoglobina glicosilada')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.catalogo_medicamento (
    id_medicamento_catalogo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    dosis VARCHAR(50),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.catalogo_medicamento
    ADD COLUMN IF NOT EXISTS dosis VARCHAR(50);

ALTER TABLE public.catalogo_medicamento
    DROP CONSTRAINT IF EXISTS catalogo_medicamento_nombre_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_medicamento_presentacion
    ON public.catalogo_medicamento (nombre, COALESCE(dosis, ''));

CREATE TABLE IF NOT EXISTS public.catalogo_cie10 (
    codigo VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.catalogo_cie10 (codigo, descripcion) VALUES
    ('I10', 'Hipertensión esencial'),
    ('E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'),
    ('J06.9', 'Infección aguda de las vías respiratorias superiores, no especificada'),
    ('J00', 'Rinofaringitis aguda'),
    ('J45.9', 'Asma, no especificada'),
    ('K21.9', 'Enfermedad por reflujo gastroesofágico sin esofagitis'),
    ('G43.9', 'Migraña, no especificada'),
    ('M54.5', 'Dolor lumbar'),
    ('R51.9', 'Cefalea, no especificada'),
    ('R10.9', 'Dolor abdominal, no especificado'),
    ('A09', 'Gastroenteritis y colitis de origen no especificado'),
    ('N39.0', 'Infección urinaria, sitio no especificado'),
    ('L50.9', 'Urticaria, no especificada'),
    ('E78.5', 'Hiperlipidemia, no especificada'),
    ('E03.9', 'Hipotiroidismo, no especificado')
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = TRUE;

CREATE TABLE IF NOT EXISTS public.catalogo_observacion (
    codigo VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    tipo_valor VARCHAR(20) NOT NULL DEFAULT 'texto',
    formato VARCHAR(40) NOT NULL DEFAULT 'texto',
    unidad_sugerida VARCHAR(30),
    ejemplo VARCHAR(120),
    orden INTEGER NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.catalogo_observacion (codigo, nombre, tipo_valor, formato, unidad_sugerida, ejemplo, orden) VALUES
    ('GENERAL', 'General', 'texto', 'texto', NULL, 'Paciente refiere malestar general', 1),
    ('SEGUIMIENTO', 'Seguimiento', 'texto', 'texto', NULL, 'Evolución del paciente durante el tratamiento', 2),
    ('CONTROL', 'Control', 'texto', 'texto', NULL, 'Resultado o hallazgo del control', 3),
    ('PRESION_ARTERIAL', 'Presión arterial', 'numerico', 'presion_arterial', 'mmHg', '12080 se transforma en 120/80', 4),
    ('TEMPERATURA', 'Temperatura', 'numerico', 'temperatura', '°C', 'Ingrese temperatura', 5),
    ('PESO', 'Peso', 'numerico', 'decimal', 'kg', '75.5', 6),
    ('GLUCOSA', 'Glucosa', 'numerico', 'decimal', 'mg/dL', '110', 7),
    ('FRECUENCIA_CARDIACA', 'Frecuencia cardíaca', 'numerico', 'entero', 'lpm', '72', 8),
    ('SATURACION_OXIGENO', 'Saturación de oxígeno', 'numerico', 'entero', '%', '98', 9),
    ('DOLOR', 'Escala de dolor', 'numerico', 'entero_rango', '0-10', '7', 10)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo_valor = EXCLUDED.tipo_valor,
    formato = EXCLUDED.formato,
    unidad_sugerida = EXCLUDED.unidad_sugerida,
    ejemplo = EXCLUDED.ejemplo,
    orden = EXCLUDED.orden,
    activo = TRUE;

CREATE TABLE IF NOT EXISTS public.atencion_licencia (
    id_licencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_atencion UUID NOT NULL UNIQUE REFERENCES public.atencion(id_atencion) ON DELETE CASCADE,
    aplica BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_desde DATE,
    fecha_hasta DATE,
    registrado_por UUID REFERENCES public.profesional_salud(id_profesional),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_atencion_licencia_fechas CHECK (
        (aplica = FALSE AND fecha_desde IS NULL AND fecha_hasta IS NULL)
        OR (aplica = TRUE AND fecha_desde IS NOT NULL AND fecha_hasta IS NOT NULL AND fecha_hasta >= fecha_desde)
    )
);

CREATE INDEX IF NOT EXISTS idx_medicamento_atencion ON public.medicamento(id_atencion);

UPDATE public.atencion
SET id_profesional_registra = id_profesional,
    id_profesional_atiende = id_profesional
WHERE id_profesional_registra IS NULL OR id_profesional_atiende IS NULL;

CREATE TABLE IF NOT EXISTS public.disponibilidad_profesional (
    id_disponibilidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_profesional UUID NOT NULL REFERENCES public.profesional_salud(id_profesional),
    id_establecimiento UUID REFERENCES public.establecimiento_salud(id_establecimiento),
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_inicio DATE,
    fecha_fin DATE,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_disponibilidad_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_profesional_busqueda
    ON public.disponibilidad_profesional (id_profesional, id_establecimiento, disponible);

DO $$
BEGIN
    ALTER TABLE public.atencion
        ADD CONSTRAINT fk_atencion_profesional_registra
        FOREIGN KEY (id_profesional_registra) REFERENCES public.profesional_salud(id_profesional);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.atencion
        ADD CONSTRAINT fk_atencion_profesional_atiende
        FOREIGN KEY (id_profesional_atiende) REFERENCES public.profesional_salud(id_profesional);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.atencion
        ADD CONSTRAINT fk_atencion_area_derivada
        FOREIGN KEY (id_area_derivada) REFERENCES public.area_profesional(id_area);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.atencion
        ADD CONSTRAINT fk_atencion_area_destino
        FOREIGN KEY (id_area_destino) REFERENCES public.area_profesional(id_area);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.disponibilidad_profesional (id_profesional, disponible)
SELECT ps.id_profesional, TRUE
FROM public.profesional_salud ps
WHERE ps.activo
  AND NOT EXISTS (
      SELECT 1
      FROM public.disponibilidad_profesional dp
      WHERE dp.id_profesional = ps.id_profesional
  );

INSERT INTO public.region (codigo, nombre, orden) VALUES
    ('XV', 'Arica y Parinacota', 1),
    ('I', 'Tarapacá', 2),
    ('II', 'Antofagasta', 3),
    ('III', 'Atacama', 4),
    ('IV', 'Coquimbo', 5),
    ('V', 'Valparaíso', 6),
    ('RM', 'Metropolitana de Santiago', 7),
    ('VI', 'Libertador General Bernardo O''Higgins', 8),
    ('VII', 'Maule', 9),
    ('XVI', 'Ñuble', 10),
    ('VIII', 'Biobío', 11),
    ('IX', 'La Araucanía', 12),
    ('XIV', 'Los Ríos', 13),
    ('X', 'Los Lagos', 14),
    ('XI', 'Aysén del General Carlos Ibáñez del Campo', 15),
    ('XII', 'Magallanes y de la Antártica Chilena', 16)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.comuna (id_region, nombre)
SELECT r.id_region, c.nombre
FROM (VALUES
    ('XV', ARRAY['Arica','Camarones','Putre','General Lagos']),
    ('I', ARRAY['Iquique','Alto Hospicio','Pozo Almonte','Camiña','Colchane','Huara','Pica']),
    ('II', ARRAY['Antofagasta','Mejillones','Sierra Gorda','Taltal','Calama','Ollagüe','San Pedro de Atacama','Tocopilla','María Elena']),
    ('III', ARRAY['Copiapó','Caldera','Tierra Amarilla','Chañaral','Diego de Almagro','Vallenar','Alto del Carmen','Freirina','Huasco']),
    ('IV', ARRAY['La Serena','Coquimbo','Andacollo','La Higuera','Paiguano','Vicuña','Illapel','Canela','Los Vilos','Salamanca','Ovalle','Combarbalá','Monte Patria','Punitaqui','Río Hurtado']),
    ('V', ARRAY['Valparaíso','Casablanca','Concón','Juan Fernández','Puchuncaví','Quintero','Viña del Mar','Isla de Pascua','Los Andes','Calle Larga','Rinconada','San Esteban','La Ligua','Cabildo','Papudo','Petorca','Zapallar','Quillota','La Calera','Hijuelas','La Cruz','Nogales','San Antonio','Algarrobo','Cartagena','El Quisco','El Tabo','Santo Domingo','San Felipe','Catemu','Llaillay','Panquehue','Putaendo','Santa María','Quilpué','Limache','Olmué','Villa Alemana']),
    ('RM', ARRAY['Santiago','Cerrillos','Cerro Navia','Conchalí','El Bosque','Estación Central','Huechuraba','Independencia','La Cisterna','La Florida','La Granja','La Pintana','La Reina','Las Condes','Lo Barnechea','Lo Espejo','Lo Prado','Macul','Maipú','Ñuñoa','Pedro Aguirre Cerda','Peñalolén','Providencia','Pudahuel','Quilicura','Quinta Normal','Recoleta','Renca','San Joaquín','San Miguel','San Ramón','Vitacura','Puente Alto','Pirque','San José de Maipo','Colina','Lampa','Tiltil','San Bernardo','Buin','Calera de Tango','Paine','Melipilla','Alhué','Curacaví','María Pinto','San Pedro','Talagante','El Monte','Isla de Maipo','Padre Hurtado','Peñaflor']),
    ('VI', ARRAY['Rancagua','Codegua','Coinco','Coltauco','Doñihue','Graneros','Las Cabras','Machalí','Malloa','Mostazal','Olivar','Peumo','Pichidegua','Quinta de Tilcoco','Rengo','Requínoa','San Vicente','Pichilemu','La Estrella','Litueche','Marchigüe','Navidad','Paredones','San Fernando','Chépica','Chimbarongo','Lolol','Nancagua','Palmilla','Peralillo','Placilla','Pumanque','Santa Cruz']),
    ('VII', ARRAY['Talca','Constitución','Curepto','Empedrado','Maule','Pelarco','Pencahue','Río Claro','San Clemente','San Rafael','Cauquenes','Chanco','Pelluhue','Curicó','Hualañé','Licantén','Molina','Rauco','Romeral','Sagrada Familia','Teno','Vichuquén','Linares','Colbún','Longaví','Parral','Retiro','San Javier','Villa Alegre','Yerbas Buenas']),
    ('XVI', ARRAY['Chillán','Bulnes','Chillán Viejo','El Carmen','Pemuco','Pinto','Quillón','San Ignacio','Yungay','Quirihue','Cobquecura','Coelemu','Ninhue','Portezuelo','Ránquil','Treguaco','San Carlos','Coihueco','Ñiquén','San Fabián','San Nicolás']),
    ('VIII', ARRAY['Concepción','Coronel','Chiguayante','Florida','Hualqui','Lota','Penco','San Pedro de la Paz','Santa Juana','Talcahuano','Tomé','Hualpén','Lebu','Arauco','Cañete','Contulmo','Curanilahue','Los Álamos','Tirúa','Los Ángeles','Antuco','Cabrero','Laja','Mulchén','Nacimiento','Negrete','Quilaco','Quilleco','San Rosendo','Santa Bárbara','Tucapel','Yumbel','Alto Biobío']),
    ('IX', ARRAY['Temuco','Carahue','Cunco','Curarrehue','Freire','Galvarino','Gorbea','Lautaro','Loncoche','Melipeuco','Nueva Imperial','Padre Las Casas','Perquenco','Pitrufquén','Pucón','Saavedra','Teodoro Schmidt','Toltén','Vilcún','Villarrica','Cholchol','Angol','Collipulli','Curacautín','Ercilla','Lonquimay','Los Sauces','Lumaco','Purén','Renaico','Traiguén','Victoria']),
    ('XIV', ARRAY['Valdivia','Corral','Lanco','Los Lagos','Máfil','Mariquina','Paillaco','Panguipulli','La Unión','Futrono','Lago Ranco','Río Bueno']),
    ('X', ARRAY['Puerto Montt','Calbuco','Cochamó','Fresia','Frutillar','Los Muermos','Llanquihue','Maullín','Puerto Varas','Castro','Ancud','Chonchi','Curaco de Vélez','Dalcahue','Puqueldón','Queilén','Quellón','Quemchi','Quinchao','Osorno','Puerto Octay','Purranque','Puyehue','Río Negro','San Juan de la Costa','San Pablo','Chaitén','Futaleufú','Hualaihué','Palena']),
    ('XI', ARRAY['Coyhaique','Lago Verde','Aysén','Cisnes','Guaitecas','Cochrane','O''Higgins','Tortel','Chile Chico','Río Ibáñez']),
    ('XII', ARRAY['Punta Arenas','Laguna Blanca','Río Verde','San Gregorio','Cabo de Hornos','Antártica','Porvenir','Primavera','Timaukel','Natales','Torres del Paine'])
) AS v(codigo, comunas)
JOIN public.region r ON r.codigo = v.codigo
CROSS JOIN LATERAL unnest(v.comunas) AS c(nombre)
ON CONFLICT (id_region, nombre) DO NOTHING;

INSERT INTO public.tipo_alergia (nombre) VALUES
    ('Penicilina'), ('Amoxicilina'), ('Sulfas'), ('Aspirina'), ('Ibuprofeno'), ('Dipirona'),
    ('Anestésicos locales'), ('Yodo / medios de contraste'), ('Látex'), ('Mariscos'), ('Pescado'),
    ('Maní'), ('Frutos secos'), ('Huevo'), ('Leche de vaca'), ('Soya'), ('Trigo'), ('Polen'),
    ('Ácaros del polvo'), ('Moho'), ('Pelo de animales'), ('Picaduras de insectos'), ('Níquel')
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE public.paciente
    ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100),
    ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100),
    ADD COLUMN IF NOT EXISTS id_region UUID REFERENCES public.region(id_region),
    ADD COLUMN IF NOT EXISTS id_comuna UUID REFERENCES public.comuna(id_comuna);

UPDATE public.paciente p
SET apellido_paterno = split_part(p.apellidos, ' ', 1),
    apellido_materno = NULLIF(btrim(substr(p.apellidos, length(split_part(p.apellidos, ' ', 1)) + 1)), '')
WHERE p.apellido_paterno IS NULL;

ALTER TABLE public.atencion ALTER COLUMN id_establecimiento DROP NOT NULL;

UPDATE public.atencion
SET estado = 'Finalizado'
WHERE UPPER(TRIM(estado)) = 'FINALIZADA';

UPDATE public.atencion
SET motivo_consulta = REPLACE(REPLACE(motivo_consulta, 'Dolor tor?cico', 'Dolor torácico'), 'Control de enfermedad cr?nica', 'Control de enfermedad crónica')
WHERE motivo_consulta LIKE '%?%';

UPDATE public.profesional_salud
SET apellidos = REPLACE(REPLACE(REPLACE(REPLACE(apellidos, 'R?os Soto', 'Ríos Soto'), 'Riquelme D?az', 'Riquelme Díaz'), 'Navarro Pe?a', 'Navarro Peña'), 'Torres Le?n', 'Torres León')
WHERE apellidos LIKE '%?%';

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
    ('atenciones', 'Finalizado', 1, TRUE),
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

INSERT INTO public.estado_clinica_catalogo (categoria, valor, orden, predeterminado)
VALUES
    ('tipos_atencion', 'Consulta', 1, TRUE),
    ('tipos_atencion', 'Control', 2, FALSE),
    ('tipos_atencion', 'Urgencia', 3, FALSE),
    ('tipos_atencion', 'Procedimiento', 4, FALSE)
ON CONFLICT (categoria, valor) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_gestion_clinica_payload(p_ok BOOLEAN, p_id UUID, p_json JSONB)
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
    SELECT
        p_ok, p_id, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, NULL::UUID, NULL::UUID,
        NULL::VARCHAR, NULL::TEXT, NULL::VARCHAR, NULL::TIMESTAMP, NULL::TIMESTAMP, NULL::VARCHAR,
        p_json::TEXT,
        NULL::DATE, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT, NULL::VARCHAR, NULL::TEXT,
        NULL::VARCHAR, NULL::TIMESTAMP, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::INT,
        NULL::VARCHAR, NULL::INT, NULL::INT, NULL::INT, NULL::INT;
$$ LANGUAGE sql;

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
    p_unidad_medida VARCHAR DEFAULT NULL,
    p_datos JSONB DEFAULT NULL
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
    v_medicamento JSONB;
    v_examen RECORD;
    v_observacion RECORD;
    v_usuario RECORD;
    v_json JSONB;
    v_id_atencion UUID;
    v_id_estab UUID;
    v_registro JSONB;
    v_estado VARCHAR;
    v_alergia_nombre VARCHAR;
    v_nuevo BOOLEAN;
    v_fecha DATE;
    v_id_region UUID;
    v_id_comuna UUID;
    v_id_area_derivada UUID;
    v_id_area_destino UUID;
    v_id_profesional_registra UUID;
    v_id_profesional_atiende UUID;
    v_rut_norm VARCHAR;
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
     * Opción 15: catálogo de estados clínicos
     * Opción 16: catálogos de Nueva atención (regiones, tipos de alergia, tipos de atención, estado inicial)
     * Opción 17: comunas por región (p_id = id_region)
     * Opción 18: contexto del usuario logueado (p_id = id_usuario): profesional y centro de salud
     * Opción 19: datos del paciente por RUT para precargar el formulario
     * Opción 20: registrar Nueva atención (p_datos JSONB); crea el paciente si no existe
     * Opciones 26 a 29: detalle de diagnóstico, alergia, medicamento y examen (p_id = id del registro)
     * Las opciones 16 a 20 devuelven una fila cuyo campo descripcion contiene un JSON.
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
            (SELECT COUNT(DISTINCT LOWER(TRIM(al.alergeno)))::INT FROM alergia al WHERE al.id_paciente = v_paciente.id_paciente) AS alergias_registradas,
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

    ELSIF p_opcion = 21 THEN
        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            NULL,
            jsonb_build_object(
                'atenciones', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id_registro', a.id_atencion,
                            'id_atencion', a.id_atencion,
                            'id_paciente', a.id_paciente,
                            'rut', p.rut,
                            'nombre_paciente', TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')),
                            'tipo_atencion', a.tipo_atencion,
                            'estado', a.estado,
                            'fecha_inicio', a.fecha_inicio,
                            'fecha_fin', a.fecha_fin,
                            'motivo_consulta', a.motivo_consulta,
                            'area_derivada', COALESCE(ap_origen.nombre, 'Sin área'),
                            'area_destino', CASE
                                WHEN a.id_area_destino IS NULL AND a.estado = 'Programada' THEN 'Pendiente'
                                ELSE COALESCE(ap_destino.nombre, 'Sin destino')
                            END,
                            'medico_nombre', CASE
                                WHEN LOWER(TRANSLATE(COALESCE(ps_atiende.profesion, '') || ' ' || COALESCE(ps_atiende.especialidad, ''), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                                THEN NULLIF(TRIM(COALESCE(ps_atiende.nombres, '') || ' ' || COALESCE(ps_atiende.apellidos, '')), '')
                                ELSE NULL
                            END,
                            'profesional_nombre', COALESCE(
                                NULLIF(TRIM(COALESCE(ps_atiende.nombres, '') || ' ' || COALESCE(ps_atiende.apellidos, '')), ''),
                                'Sin profesional asignado'
                            ),
                            'profesional_registra', COALESCE(
                                NULLIF(TRIM(COALESCE(ps_registra.nombres, '') || ' ' || COALESCE(ps_registra.apellidos, '')), ''),
                                'Sin registro identificado'
                            ),
                            'establecimiento_origen', es.nombre
                        ) ORDER BY a.fecha_inicio DESC
                    )
                    FROM atencion a
                    INNER JOIN paciente p ON p.id_paciente = a.id_paciente
                    LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
                    LEFT JOIN area_profesional ap_origen ON ap_origen.id_area = a.id_area_derivada
                    LEFT JOIN area_profesional ap_destino ON ap_destino.id_area = a.id_area_destino
                    LEFT JOIN profesional_salud ps_atiende ON ps_atiende.id_profesional = COALESCE(a.id_profesional_atiende, a.id_profesional)
                    LEFT JOIN profesional_salud ps_registra ON ps_registra.id_profesional = COALESCE(a.id_profesional_registra, a.id_profesional)
                    WHERE (
                        NULLIF(v_clean_rut, '') IS NULL
                        OR LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
                    )
                    AND (
                        COALESCE((p_datos->>'codigo_rol') IN ('ADMIN', 'SUPER_ADMIN'), FALSE)
                        OR (
                            COALESCE(p_datos->>'codigo_rol', '') = 'TENS'
                            AND a.id_profesional_atiende IS NOT NULL
                        )
                        OR (
                            COALESCE(p_datos->>'codigo_rol', '') = 'MEDICO'
                            AND a.id_profesional_atiende = NULLIF(p_datos->>'id_profesional', '')::UUID
                        )
                        OR (
                            COALESCE(p_datos->>'codigo_rol', '') NOT IN ('ADMIN', 'SUPER_ADMIN', 'TENS', 'MEDICO')
                            AND a.id_area_derivada = NULLIF(p_datos->>'id_area', '')::UUID
                        )
                    )
                ), '[]'::JSONB)
            )
        );

    ELSIF p_opcion = 22 THEN
        v_id_atencion := NULLIF(p_id, '')::UUID;
        v_json := COALESCE(p_datos, '{}'::JSONB);
        v_id_area_derivada := NULLIF(v_json->>'id_area_derivada', '')::UUID;

        IF v_id_atencion IS NULL THEN
            RAISE EXCEPTION 'La atención seleccionada es obligatoria.';
        END IF;

        IF COALESCE(v_json->>'accion', '') = 'derivar' THEN
            IF COALESCE(v_json->>'codigo_rol', '') <> 'ADMIN'
               AND EXISTS (
                   SELECT 1
                   FROM atencion a
                   WHERE a.id_atencion = v_id_atencion
                     AND a.id_profesional_atiende IS NOT NULL
               ) THEN
                RAISE EXCEPTION 'Solo el usuario Administrador puede modificar una atención ya derivada.';
            END IF;

            v_id_area_derivada := NULLIF(v_json->>'id_area_derivada', '')::UUID;

            IF v_id_area_derivada IS NULL THEN
                RAISE EXCEPTION 'El área de derivación es obligatoria.';
            END IF;

            IF v_id_area_derivada = NULLIF(v_json->>'id_area', '')::UUID THEN
                RAISE EXCEPTION 'El área de destino debe ser distinta al área de origen.';
            END IF;

            IF COALESCE(v_json->>'id_profesional_atiende', '') = '' THEN
                RAISE EXCEPTION 'Debes seleccionar un médico antes de guardar la derivación.';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM area_profesional a
                WHERE a.id_area = v_id_area_derivada AND a.activo
            ) THEN
                RAISE EXCEPTION 'El área de derivación seleccionada no es válida.';
            END IF;

            SELECT ps.id_profesional INTO v_id_profesional_atiende
            FROM profesional_salud ps
            INNER JOIN disponibilidad_profesional dp ON dp.id_profesional = ps.id_profesional
            WHERE ps.id_profesional = NULLIF(v_json->>'id_profesional_atiende', '')::UUID
              AND ps.id_area = v_id_area_derivada
              AND ps.activo
                  AND (
                      LOWER(TRANSLATE(COALESCE(ps.profesion, '') || ' ' || COALESCE(ps.especialidad, ''), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                      OR EXISTS (
                          SELECT 1 FROM area_profesional am
                          WHERE am.id_area = ps.id_area
                            AND LOWER(TRANSLATE(am.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                      )
                  )
              AND dp.disponible
              AND (dp.id_establecimiento IS NULL OR dp.id_establecimiento = NULLIF(v_json->>'id_establecimiento', '')::UUID)
              AND (dp.fecha_inicio IS NULL OR dp.fecha_inicio <= CURRENT_DATE)
              AND (dp.fecha_fin IS NULL OR dp.fecha_fin >= CURRENT_DATE)
            LIMIT 1;

            IF v_id_profesional_atiende IS NULL THEN
                RAISE EXCEPTION 'El médico seleccionado no está disponible para el área seleccionada.';
            END IF;

            UPDATE atencion
            SET id_area_destino = v_id_area_derivada,
                id_profesional_atiende = v_id_profesional_atiende,
                                id_profesional = v_id_profesional_atiende,
                                estado = COALESCE((
                                        SELECT c.valor
                                        FROM estado_clinica_catalogo c
                                        WHERE c.categoria = 'atenciones'
                                            AND c.valor = 'En curso'
                                            AND c.activo
                                        LIMIT 1
                                ), 'En curso')
            WHERE atencion.id_atencion = v_id_atencion;
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            v_id_atencion,
            jsonb_build_object(
                'atencion', COALESCE((
                    SELECT jsonb_build_object(
                        'id_atencion', a.id_atencion,
                        'id_paciente', a.id_paciente,
                        'rut', p.rut,
                        'nombre_paciente', TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')),
                        'tipo_atencion', a.tipo_atencion,
                        'estado', a.estado,
                        'fecha_inicio', a.fecha_inicio,
                        'fecha_fin', a.fecha_fin,
                        'motivo_consulta', a.motivo_consulta,
                        'id_area_derivada', a.id_area_derivada,
                        'area_derivada', ap_origen.nombre,
                        'id_area_destino', a.id_area_destino,
                        'area_destino', ap_destino.nombre,
                        'id_profesional_atiende', COALESCE(a.id_profesional_atiende, a.id_profesional),
                        'profesional_nombre', NULLIF(TRIM(COALESCE(ps_atiende.nombres, '') || ' ' || COALESCE(ps_atiende.apellidos, '')), ''),
                        'profesional_registra', TRIM(COALESCE(ps_registra.nombres, '') || ' ' || COALESCE(ps_registra.apellidos, '')),
                        'establecimiento_origen', es.nombre
                    )
                    FROM atencion a
                    INNER JOIN paciente p ON p.id_paciente = a.id_paciente
                    LEFT JOIN area_profesional ap_origen ON ap_origen.id_area = a.id_area_derivada
                    LEFT JOIN area_profesional ap_destino ON ap_destino.id_area = a.id_area_destino
                    LEFT JOIN profesional_salud ps_atiende ON ps_atiende.id_profesional = a.id_profesional_atiende
                    LEFT JOIN profesional_salud ps_registra ON ps_registra.id_profesional = COALESCE(a.id_profesional_registra, a.id_profesional)
                    LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
                    WHERE a.id_atencion = v_id_atencion
                ), '{}'::JSONB),
                'areas_derivacion', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', a.id_area, 'nombre', a.nombre) ORDER BY a.nombre)
                    FROM area_profesional a
                    WHERE a.activo
                                            AND LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) NOT LIKE '%administr%'
                                            AND LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) NOT LIKE '%integracion de sistemas%'
                                            AND LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) NOT LIKE '%tecnologias de la informacion%'
                                                                                        AND (NULLIF(p_datos->>'id_area', '') IS NULL OR a.id_area <> NULLIF(p_datos->>'id_area', '')::UUID)
                      AND EXISTS (
                          SELECT 1 FROM profesional_salud ps
                          INNER JOIN disponibilidad_profesional dp ON dp.id_profesional = ps.id_profesional
                                                    WHERE ps.id_area = a.id_area
                                                        AND ps.activo
                                                        AND dp.disponible
                                                        AND (
                                                            LOWER(TRANSLATE(COALESCE(ps.profesion, '') || ' ' || COALESCE(ps.especialidad, ''), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                                                            OR LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                                                        )
                      )
                ), '[]'::JSONB),
                'profesionales_disponibles', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', ps.id_profesional,
                        'nombre', TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, '')),
                        'profesion', ps.profesion,
                        'especialidad', ps.especialidad,
                        'id_area', ps.id_area
                    ) ORDER BY ps.apellidos, ps.nombres)
                    FROM profesional_salud ps
                    INNER JOIN disponibilidad_profesional dp ON dp.id_profesional = ps.id_profesional
                    WHERE ps.id_area = COALESCE(v_id_area_derivada, (SELECT a.id_area_destino FROM atencion a WHERE a.id_atencion = v_id_atencion))
                      AND ps.activo AND dp.disponible
                                            AND (
                                                LOWER(TRANSLATE(COALESCE(ps.profesion, '') || ' ' || COALESCE(ps.especialidad, ''), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                                                OR EXISTS (
                                                    SELECT 1 FROM area_profesional am
                                                    WHERE am.id_area = ps.id_area
                                                      AND LOWER(TRANSLATE(am.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) LIKE '%medic%'
                                                )
                                            )
                      AND (dp.fecha_inicio IS NULL OR dp.fecha_inicio <= CURRENT_DATE)
                      AND (dp.fecha_fin IS NULL OR dp.fecha_fin >= CURRENT_DATE)
                ), '[]'::JSONB)
            )
        );

    ELSIF p_opcion = 23 THEN
        v_id_atencion := NULLIF(p_id, '')::UUID;
        v_json := COALESCE(p_datos, '{}'::JSONB);

        IF v_id_atencion IS NULL THEN
            RAISE EXCEPTION 'La atención seleccionada es obligatoria.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM atencion a
            WHERE a.id_atencion = v_id_atencion
              AND (
                  COALESCE(v_json->>'codigo_rol', '') IN ('ADMIN', 'SUPER_ADMIN')
                  OR (COALESCE(v_json->>'codigo_rol', '') = 'TENS' AND a.id_profesional_atiende IS NOT NULL)
                  OR (COALESCE(v_json->>'codigo_rol', '') = 'MEDICO' AND a.id_profesional_atiende = NULLIF(v_json->>'id_profesional', '')::UUID)
              )
        ) THEN
            RAISE EXCEPTION 'No tienes acceso a la ficha clínica de esta atención.';
        END IF;

        IF COALESCE(v_json->>'accion', '') = 'guardar' THEN
            IF COALESCE(v_json->>'codigo_rol', '') NOT IN ('ADMIN', 'MEDICO') THEN
                RAISE EXCEPTION 'Solo el médico tratante o el Administrador pueden modificar la ficha clínica.';
            END IF;

            IF COALESCE(v_json->>'codigo_rol', '') = 'MEDICO'
               AND NOT EXISTS (
                   SELECT 1 FROM atencion a
                   WHERE a.id_atencion = v_id_atencion
                     AND a.id_profesional_atiende = NULLIF(v_json->>'id_profesional', '')::UUID
               ) THEN
                RAISE EXCEPTION 'Solo el médico tratante puede modificar esta ficha clínica.';
            END IF;

            IF COALESCE(v_json->>'codigo_rol', '') = 'MEDICO'
               AND EXISTS (SELECT 1 FROM atencion a WHERE a.id_atencion = v_id_atencion AND a.estado = 'Finalizado') THEN
                RAISE EXCEPTION 'La atención está finalizada y no puede modificarse.';
            END IF;

            IF char_length(COALESCE(v_json->>'detalle_observaciones', '')) > 300 THEN
                RAISE EXCEPTION 'El detalle de observaciones no puede superar los 300 caracteres.';
            END IF;

            UPDATE atencion AS att
            SET detalle_observaciones = NULLIF(TRIM(v_json->>'detalle_observaciones'), ''),
                estado = CASE
                    WHEN NULLIF(v_json->>'estado', '') IN ('En curso', 'Finalizado') THEN NULLIF(v_json->>'estado', '')
                    ELSE att.estado
                END,
                fecha_fin = CASE
                    WHEN NULLIF(v_json->>'estado', '') = 'Finalizado' THEN COALESCE(att.fecha_fin, CURRENT_TIMESTAMP)
                    ELSE att.fecha_fin
                END
            WHERE att.id_atencion = v_id_atencion;

            INSERT INTO atencion_licencia (id_atencion, aplica, fecha_desde, fecha_hasta, registrado_por)
            VALUES (
                v_id_atencion,
                COALESCE((v_json->'licencia'->>'aplica')::BOOLEAN, FALSE),
                NULLIF(v_json->'licencia'->>'fecha_desde', '')::DATE,
                NULLIF(v_json->'licencia'->>'fecha_hasta', '')::DATE,
                NULLIF(v_json->>'id_profesional', '')::UUID
            )
            ON CONFLICT ON CONSTRAINT atencion_licencia_id_atencion_key DO UPDATE SET
                aplica = EXCLUDED.aplica,
                fecha_desde = EXCLUDED.fecha_desde,
                fecha_hasta = EXCLUDED.fecha_hasta,
                registrado_por = EXCLUDED.registrado_por,
                fecha_registro = CURRENT_TIMESTAMP;

            DELETE FROM diagnostico AS diag WHERE diag.id_atencion = v_id_atencion;
            INSERT INTO diagnostico (id_paciente, id_atencion, codigo_cie10, descripcion, estado, fecha_diagnostico)
            SELECT a.id_paciente, v_id_atencion, NULLIF(item->>'codigo_cie10', ''), item->>'descripcion',
                   COALESCE(NULLIF(item->>'estado', ''), 'Confirmado'),
                   COALESCE(NULLIF(item->>'fecha_diagnostico', '')::DATE, CURRENT_DATE)
            FROM atencion a
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v_json->'diagnosticos', '[]'::JSONB)) item
            WHERE a.id_atencion = v_id_atencion AND COALESCE(TRIM(item->>'descripcion'), '') <> '';

            DELETE FROM observacion_clinica AS obs WHERE obs.id_atencion = v_id_atencion;
            INSERT INTO observacion_clinica (id_paciente, id_atencion, tipo_observacion, valor, unidad_medida, fecha_observacion, registrado_por)
            SELECT a.id_paciente, v_id_atencion, item->>'tipo_observacion', item->>'valor', item->>'unidad_medida',
                   COALESCE(NULLIF(item->>'fecha_observacion', '')::TIMESTAMP, CURRENT_TIMESTAMP),
                   NULLIF(v_json->>'id_profesional', '')::UUID
            FROM atencion a
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v_json->'observaciones', '[]'::JSONB)) item
            WHERE a.id_atencion = v_id_atencion AND COALESCE(TRIM(item->>'valor'), '') <> '';

            DELETE FROM medicamento AS med WHERE med.id_atencion = v_id_atencion;
            FOR v_medicamento IN SELECT * FROM jsonb_array_elements(COALESCE(v_json->'medicamentos', '[]'::JSONB)) LOOP
                IF NULLIF(v_medicamento->>'nombre_medicamento', '') IS NULL THEN
                    RAISE EXCEPTION 'Cada medicamento debe tener un nombre.';
                END IF;
                IF COALESCE((v_medicamento->>'intervalo_horas')::INT, 0) NOT BETWEEN 1 AND 24 THEN
                    RAISE EXCEPTION 'El intervalo del medicamento debe estar entre 1 y 24 horas.';
                END IF;
                IF COALESCE((v_medicamento->>'dias_tratamiento')::INT, 0) NOT BETWEEN 1 AND 365 THEN
                    RAISE EXCEPTION 'La duración del medicamento debe estar entre 1 y 365 días.';
                END IF;

                INSERT INTO medicamento (id_paciente, id_atencion, nombre_medicamento, dosis, frecuencia, via_administracion, fecha_inicio, fecha_fin, estado, intervalo_horas, dias_tratamiento)
                SELECT a.id_paciente, v_id_atencion, v_medicamento->>'nombre_medicamento', v_medicamento->>'dosis',
                       format('Cada %s horas por %s días', (v_medicamento->>'intervalo_horas')::INT, (v_medicamento->>'dias_tratamiento')::INT),
                       v_medicamento->>'via_administracion', CURRENT_DATE,
                       CURRENT_DATE + ((v_medicamento->>'dias_tratamiento')::INT - 1), 'Activo',
                       (v_medicamento->>'intervalo_horas')::INT, (v_medicamento->>'dias_tratamiento')::INT
                FROM atencion a WHERE a.id_atencion = v_id_atencion;
            END LOOP;

            DELETE FROM alergia AS al
            WHERE al.id_atencion = v_id_atencion
              AND NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements(COALESCE(v_json->'alergias', '[]'::JSONB)) item
                  WHERE item->>'id_alergia' = al.id_alergia::TEXT
              );
            INSERT INTO alergia (id_paciente, id_atencion, alergeno, tipo_reaccion, criticidad, observacion)
            SELECT a.id_paciente, v_id_atencion, TRIM(item->>'alergeno'), NULLIF(TRIM(item->>'tipo_reaccion'), ''),
                   COALESCE(NULLIF(item->>'criticidad', ''), (SELECT c.valor FROM estado_clinica_catalogo c WHERE c.categoria = 'alergias' AND c.predeterminado AND c.activo LIMIT 1)),
                   NULLIF(TRIM(item->>'observacion'), '')
            FROM atencion a
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v_json->'alergias', '[]'::JSONB)) item
            WHERE a.id_atencion = v_id_atencion
              AND COALESCE(TRIM(item->>'alergeno'), '') <> ''
              AND NULLIF(item->>'id_alergia', '') IS NULL;

            DELETE FROM examen AS ex
            WHERE ex.id_atencion = v_id_atencion
              AND NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements(COALESCE(v_json->'examenes', '[]'::JSONB)) item
                  WHERE item->>'id_examen' = ex.id_examen::TEXT
              );
            INSERT INTO examen (id_paciente, id_atencion, tipo_examen, resultado, fecha_examen, id_establecimiento_origen)
            SELECT a.id_paciente, v_id_atencion, TRIM(item->>'tipo_examen'), NULLIF(TRIM(item->>'resultado'), ''),
                   COALESCE(NULLIF(item->>'fecha_examen', '')::TIMESTAMP, CURRENT_TIMESTAMP), a.id_establecimiento
            FROM atencion a
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v_json->'examenes', '[]'::JSONB)) item
            WHERE a.id_atencion = v_id_atencion
              AND COALESCE(TRIM(item->>'tipo_examen'), '') <> ''
              AND NULLIF(item->>'id_examen', '') IS NULL;
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            v_id_atencion,
            jsonb_build_object(
                'atencion', (
                    SELECT jsonb_build_object(
                        'id_atencion', a.id_atencion,
                        'rut', p.rut,
                        'nombre_paciente', TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')),
                        'estado', a.estado,
                        'tipo_atencion', a.tipo_atencion,
                        'motivo_consulta', a.motivo_consulta,
                        'fecha_inicio', a.fecha_inicio,
                        'fecha_fin', a.fecha_fin,
                        'detalle_observaciones', a.detalle_observaciones,
                        'profesional_nombre', TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, ''))
                    )
                    FROM atencion a
                    INNER JOIN paciente p ON p.id_paciente = a.id_paciente
                    LEFT JOIN profesional_salud ps ON ps.id_profesional = a.id_profesional_atiende
                    WHERE a.id_atencion = v_id_atencion
                ),
                'licencia', COALESCE((SELECT to_jsonb(l) FROM atencion_licencia l WHERE l.id_atencion = v_id_atencion), jsonb_build_object('aplica', FALSE, 'fecha_desde', NULL, 'fecha_hasta', NULL)),
                'diagnosticos', COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.fecha_registro DESC) FROM diagnostico d WHERE d.id_atencion = v_id_atencion), '[]'::JSONB),
                'observaciones', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.fecha_registro DESC) FROM observacion_clinica o WHERE o.id_atencion = v_id_atencion), '[]'::JSONB),
                'medicamentos', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.fecha_registro DESC) FROM medicamento m WHERE m.id_atencion = v_id_atencion), '[]'::JSONB),
                'alergias', COALESCE((SELECT jsonb_agg(to_jsonb(al) ORDER BY al.fecha_registro DESC) FROM alergia al WHERE al.id_atencion = v_id_atencion), '[]'::JSONB),
                'examenes', COALESCE((SELECT jsonb_agg(to_jsonb(ex) ORDER BY ex.fecha_registro DESC) FROM examen ex WHERE ex.id_atencion = v_id_atencion), '[]'::JSONB),
                'alergias_catalogo', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.nombre, 'nombre', t.nombre) ORDER BY t.nombre) FROM tipo_alergia t WHERE t.activo), '[]'::JSONB),
                'criticidad_catalogo', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.valor, 'nombre', c.valor) ORDER BY c.orden) FROM estado_clinica_catalogo c WHERE c.categoria = 'alergias' AND c.activo), '[]'::JSONB),
                'examenes_catalogo', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ce.nombre, 'nombre', ce.nombre) ORDER BY ce.nombre) FROM catalogo_examen ce WHERE ce.activo), '[]'::JSONB),
                'medicamentos_catalogo', COALESCE((SELECT jsonb_agg(catalogo.nombre ORDER BY catalogo.nombre) FROM (
                    SELECT TRIM(cm.nombre || COALESCE(' ' || cm.dosis, '')) AS nombre
                    FROM catalogo_medicamento AS cm
                    WHERE cm.activo
                    UNION
                    SELECT med.nombre_medicamento FROM medicamento AS med WHERE med.estado = 'Activo'
                ) AS catalogo), '[]'::JSONB),
                'diagnosticos_catalogo', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', c.codigo,
                        'nombre', c.codigo || ' (' || c.descripcion || ')',
                        'descripcion', c.descripcion
                    ) ORDER BY c.codigo)
                    FROM catalogo_cie10 c
                    WHERE c.activo
                ), '[]'::JSONB),
                'observaciones_catalogo', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', c.codigo,
                        'nombre', c.nombre,
                        'tipo_valor', c.tipo_valor,
                        'formato', c.formato,
                        'unidad_sugerida', c.unidad_sugerida,
                        'ejemplo', c.ejemplo
                    ) ORDER BY c.orden)
                    FROM catalogo_observacion c
                    WHERE c.activo
                ), '[]'::JSONB),
                'puede_editar', COALESCE(v_json->>'codigo_rol', '') = 'ADMIN'
                    OR (
                        COALESCE(v_json->>'codigo_rol', '') = 'MEDICO'
                        AND COALESCE((SELECT a.estado FROM atencion AS a WHERE a.id_atencion = v_id_atencion), '') <> 'Finalizado'
                    ),
                'puede_generar_diagnostico', COALESCE(v_json->>'codigo_rol', '') = 'TENS'
                    AND COALESCE((SELECT a.estado FROM atencion AS a WHERE a.id_atencion = v_id_atencion), '') = 'Finalizado'
                    AND EXISTS (
                        SELECT 1
                        FROM atencion AS a
                        WHERE a.id_atencion = v_id_atencion
                          AND a.id_establecimiento = NULLIF(v_json->>'id_establecimiento', '')::UUID
                    )
            )
        );

    ELSIF p_opcion = 24 THEN
        v_id_atencion := NULLIF(p_id, '')::UUID;
        v_json := COALESCE(p_datos, '{}'::JSONB);

        IF v_id_atencion IS NULL THEN
            RAISE EXCEPTION 'La atención seleccionada es obligatoria.';
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            v_id_atencion,
            (
                SELECT (f.descripcion::JSONB) || jsonb_build_object(
                    'establecimiento', COALESCE(v_json->'centro', '{}'::JSONB),
                                        'identidad', '{}'::JSONB,
                    'generado_en', CURRENT_TIMESTAMP
                )
                FROM public.fn_gestion_clinica(
                    p_opcion => 23,
                    p_id => p_id,
                    p_datos => v_json || jsonb_build_object('accion', 'consultar')
                ) f
                LIMIT 1
            )
        );

    ELSIF p_opcion = 25 THEN
        v_json := COALESCE(p_datos, '{}'::JSONB);

        IF NULLIF(p_id, '') IS NULL THEN
            RAISE EXCEPTION 'La observación seleccionada es obligatoria.';
        END IF;

        SELECT o.id_atencion
        INTO v_id_atencion
        FROM observacion_clinica o
        WHERE o.id_observacion = p_id::UUID;

        IF v_id_atencion IS NULL THEN
            RAISE EXCEPTION 'No se encontró la observación seleccionada.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM atencion a
            WHERE a.id_atencion = v_id_atencion
              AND (
                  COALESCE(v_json->>'codigo_rol', '') IN ('ADMIN', 'SUPER_ADMIN')
                  OR (COALESCE(v_json->>'codigo_rol', '') = 'TENS' AND a.id_profesional_atiende IS NOT NULL)
                  OR (COALESCE(v_json->>'codigo_rol', '') = 'MEDICO' AND a.id_profesional_atiende = NULLIF(v_json->>'id_profesional', '')::UUID)
              )
        ) THEN
            RAISE EXCEPTION 'No tienes acceso al detalle de esta observación.';
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            p_id::UUID,
            (
                SELECT jsonb_build_object(
                    'observacion', jsonb_build_object(
                        'id_observacion', o.id_observacion,
                        'tipo_observacion', o.tipo_observacion,
                        'valor', o.valor,
                        'unidad_medida', o.unidad_medida,
                        'fecha_observacion', o.fecha_observacion,
                        'fecha_registro', o.fecha_registro
                    ),
                    'paciente', jsonb_build_object(
                        'id_paciente', p.id_paciente,
                        'nombre_completo', TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')),
                        'rut', p.rut,
                        'fecha_nacimiento', p.fecha_nacimiento,
                        'sexo', CASE WHEN LOWER(p.sexo) IN ('m', 'masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f', 'femenino') THEN 'Femenino' ELSE COALESCE(p.sexo, 'No especificado') END,
                        'telefono', p.telefono,
                        'direccion', p.direccion
                    ),
                    'atencion', jsonb_build_object(
                        'id_atencion', a.id_atencion,
                        'tipo_atencion', a.tipo_atencion,
                        'motivo_consulta', a.motivo_consulta,
                        'estado', a.estado,
                        'fecha_inicio', a.fecha_inicio,
                        'fecha_fin', a.fecha_fin
                    ),
                    'establecimiento', jsonb_build_object(
                        'nombre', es.nombre,
                        'tipo', es.tipo_establecimiento,
                        'direccion', es.direccion,
                        'comuna', es.comuna,
                        'region', es.region
                    ),
                    'profesionales', jsonb_build_object(
                        'atiende', NULLIF(TRIM(COALESCE(ps_atiende.nombres, '') || ' ' || COALESCE(ps_atiende.apellidos, '')), ''),
                        'registra', NULLIF(TRIM(COALESCE(ps_registra.nombres, '') || ' ' || COALESCE(ps_registra.apellidos, '')), '')
                    ),
                    'medicamentos', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object(
                            'id_medicamento', m.id_medicamento,
                            'nombre_medicamento', m.nombre_medicamento,
                            'dosis', m.dosis,
                            'frecuencia', m.frecuencia,
                            'via_administracion', m.via_administracion,
                            'estado', m.estado,
                            'fecha_inicio', m.fecha_inicio,
                            'fecha_fin', m.fecha_fin,
                            'intervalo_horas', m.intervalo_horas,
                            'dias_tratamiento', m.dias_tratamiento
                        ) ORDER BY m.fecha_registro DESC)
                        FROM medicamento m
                        WHERE m.id_atencion = o.id_atencion
                           OR (
                               m.id_paciente = o.id_paciente
                               AND m.estado = 'Activo'
                               AND NOT EXISTS (SELECT 1 FROM medicamento ma WHERE ma.id_atencion = o.id_atencion)
                           )
                    ), '[]'::JSONB)
                )
                FROM observacion_clinica o
                INNER JOIN paciente p ON p.id_paciente = o.id_paciente
                INNER JOIN atencion a ON a.id_atencion = o.id_atencion
                LEFT JOIN establecimiento_salud es ON es.id_establecimiento = a.id_establecimiento
                LEFT JOIN profesional_salud ps_atiende ON ps_atiende.id_profesional = COALESCE(a.id_profesional_atiende, a.id_profesional)
                LEFT JOIN profesional_salud ps_registra ON ps_registra.id_profesional = o.registrado_por
                WHERE o.id_observacion = p_id::UUID
            )
        );

    ELSIF p_opcion IN (26, 27, 28, 29) THEN
        v_json := COALESCE(p_datos, '{}'::JSONB);

        IF NULLIF(p_id, '') IS NULL THEN
            RAISE EXCEPTION 'El registro seleccionado es obligatorio.';
        END IF;

        IF p_opcion = 26 THEN
            SELECT d.id_paciente, d.id_atencion, NULL::UUID,
                   jsonb_build_object(
                       'tipo', 'diagnostico',
                       'codigo_cie10', d.codigo_cie10,
                       'descripcion', d.descripcion,
                       'estado', d.estado,
                       'fecha_diagnostico', d.fecha_diagnostico,
                       'fecha_registro', d.fecha_registro
                   )
            INTO v_id_paciente, v_id_atencion, v_id_estab, v_registro
            FROM diagnostico d
            WHERE d.id_diagnostico = p_id::UUID;
        ELSIF p_opcion = 27 THEN
            SELECT al.id_paciente, al.id_atencion, NULL::UUID,
                   jsonb_build_object(
                       'tipo', 'alergia',
                       'alergeno', al.alergeno,
                       'tipo_reaccion', al.tipo_reaccion,
                       'criticidad', al.criticidad,
                       'observacion', al.observacion,
                       'fecha_registro', al.fecha_registro
                   )
            INTO v_id_paciente, v_id_atencion, v_id_estab, v_registro
            FROM alergia al
            WHERE al.id_alergia = p_id::UUID;
        ELSIF p_opcion = 28 THEN
            SELECT m.id_paciente, m.id_atencion, NULL::UUID,
                   jsonb_build_object(
                       'tipo', 'medicamento',
                       'nombre_medicamento', m.nombre_medicamento,
                       'dosis', m.dosis,
                       'frecuencia', m.frecuencia,
                       'via_administracion', m.via_administracion,
                       'estado', m.estado,
                       'fecha_inicio', m.fecha_inicio,
                       'fecha_fin', m.fecha_fin,
                       'intervalo_horas', m.intervalo_horas,
                       'dias_tratamiento', m.dias_tratamiento,
                       'fecha_registro', m.fecha_registro
                   )
            INTO v_id_paciente, v_id_atencion, v_id_estab, v_registro
            FROM medicamento m
            WHERE m.id_medicamento = p_id::UUID;
        ELSE
            SELECT ex.id_paciente, ex.id_atencion, ex.id_establecimiento_origen,
                   jsonb_build_object(
                       'tipo', 'examen',
                       'tipo_examen', ex.tipo_examen,
                       'resultado', ex.resultado,
                       'fecha_examen', ex.fecha_examen,
                       'fecha_registro', ex.fecha_registro
                   )
            INTO v_id_paciente, v_id_atencion, v_id_estab, v_registro
            FROM examen ex
            WHERE ex.id_examen = p_id::UUID;
        END IF;

        IF v_registro IS NULL THEN
            RAISE EXCEPTION 'No se encontró el registro seleccionado.';
        END IF;

        IF v_id_atencion IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM atencion a
            WHERE a.id_atencion = v_id_atencion
              AND (
                  COALESCE(v_json->>'codigo_rol', '') IN ('ADMIN', 'SUPER_ADMIN')
                  OR (COALESCE(v_json->>'codigo_rol', '') = 'TENS' AND a.id_profesional_atiende IS NOT NULL)
                  OR (COALESCE(v_json->>'codigo_rol', '') = 'MEDICO' AND a.id_profesional_atiende = NULLIF(v_json->>'id_profesional', '')::UUID)
              )
        ) THEN
            RAISE EXCEPTION 'No tienes acceso al detalle de este registro.';
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            p_id::UUID,
            (
                SELECT jsonb_build_object(
                    'registro', v_registro,
                    'paciente', jsonb_build_object(
                        'id_paciente', p.id_paciente,
                        'nombre_completo', TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')),
                        'rut', p.rut,
                        'fecha_nacimiento', p.fecha_nacimiento,
                        'sexo', CASE WHEN LOWER(p.sexo) IN ('m', 'masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f', 'femenino') THEN 'Femenino' ELSE COALESCE(p.sexo, 'No especificado') END,
                        'telefono', p.telefono,
                        'direccion', p.direccion
                    ),
                    'atencion', CASE WHEN a.id_atencion IS NULL THEN NULL ELSE jsonb_build_object(
                        'id_atencion', a.id_atencion,
                        'tipo_atencion', a.tipo_atencion,
                        'motivo_consulta', a.motivo_consulta,
                        'estado', a.estado,
                        'fecha_inicio', a.fecha_inicio,
                        'fecha_fin', a.fecha_fin
                    ) END,
                    'establecimiento', jsonb_build_object(
                        'nombre', es.nombre,
                        'tipo', es.tipo_establecimiento,
                        'direccion', es.direccion,
                        'comuna', es.comuna,
                        'region', es.region
                    ),
                    'profesionales', jsonb_build_object(
                        'atiende', NULLIF(TRIM(COALESCE(ps_atiende.nombres, '') || ' ' || COALESCE(ps_atiende.apellidos, '')), ''),
                        'registra', NULLIF(TRIM(COALESCE(ps_registra.nombres, '') || ' ' || COALESCE(ps_registra.apellidos, '')), '')
                    )
                )
                FROM paciente p
                LEFT JOIN atencion a ON a.id_atencion = v_id_atencion
                LEFT JOIN establecimiento_salud es ON es.id_establecimiento = COALESCE(a.id_establecimiento, v_id_estab)
                LEFT JOIN profesional_salud ps_atiende ON ps_atiende.id_profesional = COALESCE(a.id_profesional_atiende, a.id_profesional)
                LEFT JOIN profesional_salud ps_registra ON ps_registra.id_profesional = a.id_profesional_registra
                WHERE p.id_paciente = v_id_paciente
            )
        );

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
                COALESCE(p_estado, (SELECT ec.valor FROM estado_clinica_catalogo ec WHERE ec.categoria = 'atenciones' AND ec.predeterminado AND ec.activo LIMIT 1))
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
                COALESCE(p_estado, (SELECT ec.valor FROM estado_clinica_catalogo ec WHERE ec.categoria = 'diagnosticos' AND ec.predeterminado AND ec.activo LIMIT 1)),
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
            a.id_atencion,
            att.id_establecimiento,
            att.id_profesional_atiende AS id_profesional,
            att.tipo_atencion,
            att.motivo_consulta,
            att.estado,
            att.fecha_inicio,
            att.fecha_fin,
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
            COALESCE(es.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
            NULLIF(TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, '')), '')::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM alergia a
        INNER JOIN paciente p ON p.id_paciente = a.id_paciente
        LEFT JOIN atencion att ON att.id_atencion = a.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = att.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = COALESCE(att.id_profesional_atiende, att.id_profesional)
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
            m.id_atencion,
            att.id_establecimiento,
            att.id_profesional_atiende AS id_profesional,
            att.tipo_atencion,
            att.motivo_consulta,
            m.estado,
            m.fecha_inicio::TIMESTAMP AS fecha_inicio,
            m.fecha_fin::TIMESTAMP AS fecha_fin,
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
            COALESCE(es.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
            NULLIF(TRIM(COALESCE(ps.nombres, '') || ' ' || COALESCE(ps.apellidos, '')), '')::VARCHAR AS profesional_nombre,
            TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))::VARCHAR AS nombre_completo,
            COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento))::INT, 0) AS edad,
            (CASE WHEN LOWER(p.sexo) IN ('m','masculino') THEN 'Masculino' WHEN LOWER(p.sexo) IN ('f','femenino') THEN 'Femenino' ELSE COALESCE(p.sexo,'No especificado') END)::VARCHAR AS sexo,
            0::INT AS recursos_ficha,
            0::INT AS atenciones,
            0::INT AS alergias_registradas,
            0::INT AS medicamentos_activos
        FROM medicamento m
        INNER JOIN paciente p ON p.id_paciente = m.id_paciente
        LEFT JOIN atencion att ON att.id_atencion = m.id_atencion
        LEFT JOIN establecimiento_salud es ON es.id_establecimiento = att.id_establecimiento
        LEFT JOIN profesional_salud ps ON ps.id_profesional = COALESCE(att.id_profesional_atiende, att.id_profesional)
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
            UPDATE medicamento AS med
            SET id_paciente = COALESCE(v_id_paciente, med.id_paciente),
                nombre_medicamento = COALESCE(p_nombre_medicamento, med.nombre_medicamento),
                dosis = COALESCE(p_dosis, med.dosis),
                frecuencia = COALESCE(p_frecuencia, med.frecuencia),
                via_administracion = COALESCE(p_via_administracion, med.via_administracion),
                estado = COALESCE(p_estado, med.estado)
            WHERE med.id_medicamento::TEXT = p_id;
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
                COALESCE(p_estado, (SELECT ec.valor FROM estado_clinica_catalogo ec WHERE ec.categoria = 'medicamentos' AND ec.predeterminado AND ec.activo LIMIT 1))
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
                COALESCE(p_estado, (SELECT ec.valor FROM estado_clinica_catalogo ec WHERE ec.categoria = 'examenes' AND ec.predeterminado AND ec.activo LIMIT 1))
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
            o.valor::TEXT AS valor,
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
            o.valor::TEXT AS valor,
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

    ELSIF p_opcion = 16 THEN
        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            NULL,
            jsonb_build_object(
                'regiones', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', r.id_region, 'nombre', r.nombre) ORDER BY r.orden)
                    FROM region r
                ), '[]'::JSONB),
                'tipos_alergia', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', t.id_tipo_alergia, 'nombre', t.nombre) ORDER BY t.nombre)
                    FROM tipo_alergia t
                    WHERE t.activo
                ), '[]'::JSONB),
                'tipos_atencion', COALESCE((
                    SELECT jsonb_agg(c.valor ORDER BY c.orden)
                    FROM estado_clinica_catalogo c
                    WHERE c.categoria = 'tipos_atencion' AND c.activo
                ), '[]'::JSONB),
                'areas_derivacion', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', a.id_area, 'nombre', a.nombre) ORDER BY a.nombre)
                    FROM area_profesional a
                                        WHERE a.activo
                                            AND LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) NOT LIKE '%administr%'
                                            AND LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) NOT LIKE '%integracion de sistemas%'
                                            AND LOWER(TRANSLATE(a.nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn')) NOT LIKE '%tecnologias de la informacion%'
                                            AND EXISTS (
                                                    SELECT 1
                                                    FROM profesional_salud ps
                                                    INNER JOIN disponibilidad_profesional dp ON dp.id_profesional = ps.id_profesional
                                                    WHERE ps.id_area = a.id_area
                                                        AND ps.activo
                                                        AND dp.disponible
                                                        AND (dp.fecha_inicio IS NULL OR dp.fecha_inicio <= CURRENT_DATE)
                                                        AND (dp.fecha_fin IS NULL OR dp.fecha_fin >= CURRENT_DATE)
                                            )
                ), '[]'::JSONB),
                'estado_inicial', (
                    SELECT c.valor
                    FROM estado_clinica_catalogo c
                    WHERE c.categoria = 'atenciones' AND c.valor = 'Programada' AND c.activo
                    LIMIT 1
                )
            )
        );

    ELSIF p_opcion = 17 THEN
        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            NULL,
            jsonb_build_object(
                'comunas', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', co.id_comuna, 'nombre', co.nombre) ORDER BY co.nombre)
                    FROM comuna co
                    WHERE co.id_region::TEXT = p_id
                ), '[]'::JSONB)
            )
        );

    ELSIF p_opcion = 18 THEN
        SELECT u.id_profesional AS id_profesional,
               u.id_establecimiento AS id_establecimiento,
             ps.id_area AS id_area,
               TRIM(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, '')) AS profesional,
               (r.codigo = 'SUPER_ADMIN' OR COALESCE(r.es_super_admin, FALSE)) AS es_super_admin,
               r.codigo AS codigo_rol,
               r.nombre AS nombre_rol,
               (r.codigo = 'ADMIN') AS es_administrador,
               e.nombre AS centro_nombre,
               e.tipo_establecimiento AS centro_tipo,
               e.direccion AS centro_direccion,
               e.comuna AS centro_comuna,
               e.region AS centro_region
        INTO v_usuario
        FROM usuario_sistema u
        INNER JOIN rol r ON r.id_rol = u.id_rol
        LEFT JOIN profesional_salud ps ON ps.id_profesional = u.id_profesional
        LEFT JOIN establecimiento_salud e ON e.id_establecimiento = u.id_establecimiento
        WHERE u.id_usuario::TEXT = p_id
        LIMIT 1;

        IF v_usuario.profesional IS NULL THEN
            RETURN QUERY SELECT * FROM public.fn_gestion_clinica_payload(FALSE, NULL, '{}'::JSONB);
            RETURN;
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            NULL,
            jsonb_build_object(
                'id_profesional', v_usuario.id_profesional,
                'id_establecimiento', v_usuario.id_establecimiento,
                'id_area', v_usuario.id_area,
                'es_super_admin', v_usuario.es_super_admin,
                'codigo_rol', v_usuario.codigo_rol,
                'nombre_rol', v_usuario.nombre_rol,
                'es_administrador', v_usuario.es_administrador,
                'profesional', v_usuario.profesional,
                'centro', CASE
                    WHEN v_usuario.es_super_admin THEN jsonb_build_object(
                        'nombre', 'SICHCP',
                        'tipo', U&'Administraci\00f3n Central',
                        'direccion', 'Nivel Central',
                        'comuna', 'Santiago',
                        'region', 'Metropolitana de Santiago'
                    )
                    ELSE jsonb_build_object(
                        'nombre', COALESCE(v_usuario.centro_nombre, U&'Red P\00fablica SICHCP'),
                        'tipo', COALESCE(v_usuario.centro_tipo, 'CENTRO DE SALUD'),
                        'direccion', COALESCE(v_usuario.centro_direccion, ''),
                        'comuna', COALESCE(v_usuario.centro_comuna, ''),
                        'region', COALESCE(v_usuario.centro_region, '')
                    )
                END
            )
        );

    ELSIF p_opcion = 19 THEN
        IF v_clean_rut IS NULL OR v_clean_rut = '' THEN
            RETURN QUERY SELECT * FROM public.fn_gestion_clinica_payload(FALSE, NULL, '{}'::JSONB);
            RETURN;
        END IF;

        SELECT p.id_paciente AS id_paciente,
               p.rut AS rut,
               p.nombres AS nombres,
               COALESCE(p.apellido_paterno, split_part(COALESCE(p.apellidos, ''), ' ', 1)) AS apellido_paterno,
               COALESCE(p.apellido_materno, NULLIF(btrim(substr(COALESCE(p.apellidos, ''), length(split_part(COALESCE(p.apellidos, ''), ' ', 1)) + 1)), '')) AS apellido_materno,
               to_char(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
               (CASE
                   WHEN LOWER(p.sexo) IN ('m', 'masculino') THEN 'M'
                   WHEN LOWER(p.sexo) IN ('f', 'femenino') THEN 'F'
                   ELSE ''
               END) AS sexo,
               p.telefono AS telefono,
               p.direccion AS direccion,
               p.id_region AS id_region,
               p.id_comuna AS id_comuna
        INTO v_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = v_clean_rut
        LIMIT 1;

        IF v_paciente.id_paciente IS NULL THEN
            RETURN QUERY SELECT * FROM public.fn_gestion_clinica_payload(FALSE, NULL, '{}'::JSONB);
            RETURN;
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            v_paciente.id_paciente,
            jsonb_build_object(
                'id_paciente', v_paciente.id_paciente,
                'rut', v_paciente.rut,
                'nombres', v_paciente.nombres,
                'apellido_paterno', v_paciente.apellido_paterno,
                'apellido_materno', COALESCE(v_paciente.apellido_materno, ''),
                'fecha_nacimiento', COALESCE(v_paciente.fecha_nacimiento, ''),
                'sexo', v_paciente.sexo,
                'telefono', COALESCE(v_paciente.telefono, ''),
                'direccion', COALESCE(v_paciente.direccion, ''),
                'id_region', v_paciente.id_region,
                'id_comuna', v_paciente.id_comuna
            )
        );

    ELSIF p_opcion = 20 THEN
        v_json := COALESCE(p_datos, '{}'::JSONB);
        v_rut_norm := UPPER(REGEXP_REPLACE(COALESCE(v_json->>'rut', ''), '[^0-9kK]', '', 'g'));

        IF LENGTH(v_rut_norm) < 2 THEN
            RAISE EXCEPTION 'El RUT es obligatorio.';
        END IF;
        IF COALESCE(TRIM(v_json->>'nombres'), '') = '' THEN
            RAISE EXCEPTION 'Los nombres son obligatorios.';
        END IF;
        IF COALESCE(TRIM(v_json->>'apellido_paterno'), '') = '' THEN
            RAISE EXCEPTION 'El apellido paterno es obligatorio.';
        END IF;
        IF COALESCE(TRIM(v_json->>'apellido_materno'), '') = '' THEN
            RAISE EXCEPTION 'El apellido materno es obligatorio.';
        END IF;
        IF COALESCE(v_json->>'fecha_nacimiento', '') = '' THEN
            RAISE EXCEPTION 'La fecha de nacimiento es obligatoria.';
        END IF;
        IF UPPER(COALESCE(v_json->>'sexo', '')) NOT IN ('M', 'F') THEN
            RAISE EXCEPTION 'El sexo es obligatorio.';
        END IF;
        IF COALESCE(TRIM(v_json->>'direccion'), '') = '' THEN
            RAISE EXCEPTION 'La dirección es obligatoria.';
        END IF;
        IF COALESCE(v_json->>'id_region', '') = '' OR COALESCE(v_json->>'id_comuna', '') = '' THEN
            RAISE EXCEPTION 'La región y la comuna son obligatorias.';
        END IF;
        IF COALESCE(TRIM(v_json->>'tipo_atencion'), '') = '' THEN
            RAISE EXCEPTION 'El tipo de atención es obligatorio.';
        END IF;
        IF COALESCE(TRIM(v_json->>'motivo_consulta'), '') = '' THEN
            RAISE EXCEPTION 'El motivo de la asistencia es obligatorio.';
        END IF;
        IF COALESCE(v_json->>'id_profesional_registra', '') = '' THEN
            RAISE EXCEPTION 'No se pudo identificar al profesional que registra la atención.';
        END IF;
        IF COALESCE(v_json->>'id_area_derivada', '') = '' THEN
            RAISE EXCEPTION 'El área de derivación es obligatoria.';
        END IF;

        v_id_region := (v_json->>'id_region')::UUID;
        v_id_comuna := (v_json->>'id_comuna')::UUID;
        v_id_profesional_registra := (v_json->>'id_profesional_registra')::UUID;
        v_id_area_derivada := NULLIF(v_json->>'id_area', '')::UUID;
        v_id_area_destino := (v_json->>'id_area_derivada')::UUID;

        IF NOT EXISTS (SELECT 1 FROM comuna co WHERE co.id_comuna = v_id_comuna AND co.id_region = v_id_region) THEN
            RAISE EXCEPTION 'La comuna no pertenece a la región seleccionada.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM profesional_salud ps WHERE ps.id_profesional = v_id_profesional_registra AND ps.activo) THEN
            RAISE EXCEPTION 'El profesional que registra la atención no está activo.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM area_profesional a WHERE a.id_area = v_id_area_destino AND a.activo) THEN
            RAISE EXCEPTION 'El área de derivación seleccionada no es válida.';
        END IF;

        SELECT ps.id_profesional INTO v_id_profesional_atiende
        FROM profesional_salud ps
        INNER JOIN disponibilidad_profesional dp ON dp.id_profesional = ps.id_profesional
        WHERE ps.id_area = v_id_area_destino
          AND ps.activo
          AND dp.disponible
          AND (dp.id_establecimiento IS NULL OR dp.id_establecimiento = NULLIF(v_json->>'id_establecimiento', '')::UUID)
          AND (dp.fecha_inicio IS NULL OR dp.fecha_inicio <= CURRENT_DATE)
          AND (dp.fecha_fin IS NULL OR dp.fecha_fin >= CURRENT_DATE)
        ORDER BY
            CASE WHEN dp.id_establecimiento IS NOT NULL THEN 0 ELSE 1 END,
            (SELECT COUNT(*) FROM atencion a WHERE a.id_profesional_atiende = ps.id_profesional AND a.estado = 'En curso'),
            ps.apellidos,
            ps.nombres
        LIMIT 1;

        IF v_id_profesional_atiende IS NULL THEN
            RAISE EXCEPTION 'No hay profesionales disponibles para el área seleccionada.';
        END IF;

        SELECT p.id_paciente INTO v_id_paciente
        FROM paciente p
        WHERE LOWER(REPLACE(REPLACE(p.rut, '.', ''), '-', '')) = LOWER(v_rut_norm)
        LIMIT 1;

        v_nuevo := v_id_paciente IS NULL;

        IF v_nuevo THEN
            INSERT INTO paciente (
                rut, nombres, apellidos, apellido_paterno, apellido_materno,
                fecha_nacimiento, sexo, telefono, direccion, id_region, id_comuna
            ) VALUES (
                SUBSTR(v_rut_norm, 1, LENGTH(v_rut_norm) - 1) || '-' || RIGHT(v_rut_norm, 1),
                TRIM(v_json->>'nombres'),
                TRIM(v_json->>'apellido_paterno') || ' ' || TRIM(v_json->>'apellido_materno'),
                TRIM(v_json->>'apellido_paterno'),
                TRIM(v_json->>'apellido_materno'),
                (v_json->>'fecha_nacimiento')::DATE,
                UPPER(v_json->>'sexo'),
                NULLIF(TRIM(v_json->>'telefono'), ''),
                TRIM(v_json->>'direccion'),
                v_id_region,
                v_id_comuna
            )
            RETURNING paciente.id_paciente INTO v_id_paciente;
        ELSE
            UPDATE paciente
            SET nombres = TRIM(v_json->>'nombres'),
                apellidos = TRIM(v_json->>'apellido_paterno') || ' ' || TRIM(v_json->>'apellido_materno'),
                apellido_paterno = TRIM(v_json->>'apellido_paterno'),
                apellido_materno = TRIM(v_json->>'apellido_materno'),
                fecha_nacimiento = (v_json->>'fecha_nacimiento')::DATE,
                sexo = UPPER(v_json->>'sexo'),
                telefono = NULLIF(TRIM(v_json->>'telefono'), ''),
                direccion = TRIM(v_json->>'direccion'),
                id_region = v_id_region,
                id_comuna = v_id_comuna
            WHERE paciente.id_paciente = v_id_paciente;
        END IF;

        IF COALESCE(v_json->>'id_tipo_alergia', '') <> '' THEN
            SELECT t.nombre INTO v_alergia_nombre
            FROM tipo_alergia t
            WHERE t.id_tipo_alergia::TEXT = v_json->>'id_tipo_alergia' AND t.activo;

            IF v_alergia_nombre IS NULL THEN
                RAISE EXCEPTION 'El tipo de alergia seleccionado no es válido.';
            END IF;

            INSERT INTO alergia (id_paciente, alergeno, criticidad)
            SELECT v_id_paciente,
                   v_alergia_nombre,
                   (SELECT c.valor FROM estado_clinica_catalogo c WHERE c.categoria = 'alergias' AND c.predeterminado AND c.activo LIMIT 1)
            WHERE NOT EXISTS (
                SELECT 1 FROM alergia a WHERE a.id_paciente = v_id_paciente AND a.alergeno = v_alergia_nombre
            );
        END IF;

        SELECT c.valor INTO v_estado
        FROM estado_clinica_catalogo c
        WHERE c.categoria = 'atenciones' AND c.valor = 'Programada' AND c.activo
        LIMIT 1;

        v_fecha := COALESCE(NULLIF(v_json->>'fecha_atencion', '')::DATE, CURRENT_DATE);

        INSERT INTO atencion (
            id_paciente, id_profesional, id_profesional_registra, id_profesional_atiende,
            id_area_derivada, id_area_destino, id_establecimiento, tipo_atencion,
            fecha_inicio, motivo_consulta, estado
        ) VALUES (
            v_id_paciente,
            v_id_profesional_atiende,
            v_id_profesional_registra,
            v_id_profesional_atiende,
            v_id_area_derivada,
            v_id_area_destino,
            NULLIF(v_json->>'id_establecimiento', '')::UUID,
            TRIM(v_json->>'tipo_atencion'),
            (v_fecha + LOCALTIME),
            TRIM(v_json->>'motivo_consulta'),
            COALESCE(v_estado, 'Programada')
        )
        RETURNING atencion.id_atencion INTO v_id_atencion;

        IF v_alergia_nombre IS NOT NULL THEN
            UPDATE alergia AS al
            SET id_atencion = v_id_atencion
            WHERE al.id_paciente = v_id_paciente
              AND al.alergeno = v_alergia_nombre
              AND al.id_atencion IS NULL
              AND al.fecha_registro >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
        END IF;

        RETURN QUERY
        SELECT * FROM public.fn_gestion_clinica_payload(
            TRUE,
            v_id_atencion,
            jsonb_build_object(
                'id_atencion', v_id_atencion,
                'id_paciente', v_id_paciente,
                'paciente_nuevo', v_nuevo,
                'id_profesional_registra', v_id_profesional_registra,
                'id_profesional_atiende', v_id_profesional_atiende,
                'id_area_derivada', v_id_area_derivada,
                'id_area_destino', v_id_area_destino
            )
        );

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
    WITH alergias_agrupadas AS (
        SELECT
            (array_agg(al.id_alergia ORDER BY al.fecha_registro DESC NULLS LAST, al.id_alergia))[1] AS id_recurso,
            al.id_paciente,
            MAX(al.fecha_registro) AS fecha,
            MIN(al.alergeno) AS alergeno,
            string_agg(DISTINCT NULLIF(al.tipo_reaccion, ''), ', ') AS reacciones,
            CASE
                WHEN BOOL_OR(UPPER(COALESCE(al.criticidad, '')) = 'CRITICA') THEN 'CRITICA'
                WHEN BOOL_OR(UPPER(COALESCE(al.criticidad, '')) = 'ALTA') THEN 'ALTA'
                WHEN BOOL_OR(UPPER(COALESCE(al.criticidad, '')) = 'MODERADA') THEN 'MODERADA'
                WHEN BOOL_OR(UPPER(COALESCE(al.criticidad, '')) = 'BAJA') THEN 'BAJA'
                ELSE NULL
            END AS criticidad,
            COUNT(*)::INT AS total_registros
        FROM alergia al
        WHERE al.id_paciente = v_id_paciente
        GROUP BY al.id_paciente, LOWER(TRIM(al.alergeno))
    )
    SELECT a.id_atencion AS id_recurso,
           a.fecha_inicio AS fecha,
           'Atención'::VARCHAR AS tipo_recurso,
           'Encounter'::VARCHAR AS codigo_fhir,
           COALESCE(a.motivo_consulta, a.tipo_atencion, 'Consulta Médica Generada')::TEXT AS descripcion,
           COALESCE(e.nombre, 'Red Pública SICHCP')::VARCHAR AS establecimiento_origen,
           COALESCE(a.estado, 'Finalizado')::VARCHAR AS estado
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

    SELECT ag.id_recurso,
           ag.fecha,
           'Alergia'::VARCHAR AS tipo_recurso,
           'AllergyIntolerance'::VARCHAR AS codigo_fhir,
           CONCAT_WS(' - ',
               ag.alergeno,
               NULLIF('Reacciones: ' || COALESCE(ag.reacciones, ''), 'Reacciones: '),
               NULLIF('Criticidad: ' || COALESCE(ag.criticidad, ''), 'Criticidad: '),
               CASE WHEN ag.total_registros > 1 THEN ag.total_registros::TEXT || ' registros asociados' END
           )::TEXT AS descripcion,
           COALESCE(e.nombre, 'Sin establecimiento asociado')::VARCHAR AS establecimiento_origen,
           'Registrada'::VARCHAR AS estado
    FROM alergias_agrupadas ag
    LEFT JOIN LATERAL (
        SELECT a.id_establecimiento
        FROM atencion a
        WHERE a.id_paciente = ag.id_paciente
        ORDER BY ABS(EXTRACT(EPOCH FROM (a.fecha_inicio - ag.fecha))), a.fecha_inicio DESC
        LIMIT 1
    ) origen ON TRUE
    LEFT JOIN establecimiento_salud e ON e.id_establecimiento = origen.id_establecimiento

    UNION ALL

    SELECT m.id_medicamento AS id_recurso,
           m.fecha_registro AS fecha,
           'Medicamento'::VARCHAR AS tipo_recurso,
           'MedicationRequest'::VARCHAR AS codigo_fhir,
           (m.nombre_medicamento || COALESCE(' ' || m.dosis, '') || COALESCE(' - ' || m.frecuencia, ''))::TEXT AS descripcion,
            COALESCE(e.nombre, 'Sin establecimiento asociado')::VARCHAR AS establecimiento_origen,
           COALESCE(m.estado, 'Activo')::VARCHAR AS estado
    FROM medicamento m
        LEFT JOIN LATERAL (
         SELECT a.id_establecimiento
         FROM atencion a
         WHERE a.id_paciente = m.id_paciente
         ORDER BY ABS(EXTRACT(EPOCH FROM (a.fecha_inicio - m.fecha_registro))), a.fecha_inicio DESC
         LIMIT 1
        ) origen ON TRUE
        LEFT JOIN establecimiento_salud e ON e.id_establecimiento = origen.id_establecimiento
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
