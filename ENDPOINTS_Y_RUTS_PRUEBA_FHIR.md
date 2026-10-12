# Endpoints FHIR y Datos de Prueba de Interoperabilidad - SICHCP

Este documento consolida la información técnica de los **endpoints de prueba externos** (MINSAL y HL7 Chile) consumidos por el sistema **SICHCP**, junto con los **RUTs de pacientes** disponibles para demostraciones y pruebas del sistema.

> **Importante:** Todos estos datos son leídos en tiempo real vía HTTP (GET) directamente por el BFF NestJS y se procesan en memoria para alimentar las pantallas del Frontend (Gestión Clínica, Historiales, Atenciones y Ficha Clínica). **Ningún dato externo es insertado ni persistido en la base de datos PostgreSQL local.**

---

## 1. Resumen de RUTs de Pacientes para Pruebas

| RUT | Nombre Completo | Edad / Sexo | Origen / Guía | Establecimiento de Referencia | Recursos Clínicos Disponibles |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`90.000.000-6`** | María Josefina Gonzalez Morales | 51 años · Femenino | MINSAL TEI (0.2.3) | Complejo Asistencial Dr. Víctor Ríos Ruiz (Los Ángeles) | Atención, Anamnesis, Diagnóstico, Alergia, Medicamento, Examen Laboratorio |
| **`16.182.522-0`** | Javiera Castilla Muñoz | 30 años · Femenino | MINSAL NID (0.4.6) | Hospital Clínico San Borja Arriarán | Atención NID, Ocupación (Ing. Biomédico), Situación de Discapacidad |
| **`12.216.373-3`** | Andres Martinez | 44 años · Masculino | MINSAL NID (0.4.7) | Hospital Barros Luco Trudeau | Atención General, Observación (Chequeo preventivo) |
| **`19.241.323-8`** | Valentina Ester Henriquez (Vale) | 31 años · Femenino | HL7 Chile IPS / CLIPS | Hospital Dr. Sótero del Río | Atención, Diagnóstico, Alergia, Medicamento, Examen, Hábito Tabáquico |

---

## 2. Detalle de Pacientes y URLs Externas

### A. Paciente 1: María Josefina Gonzalez Morales (`90.000.000-6`)
* **Guía de referencia:** MINSAL Guía de Interoperabilidad TEI (Tiempos de Espera No GES) v0.2.3.
* **Características:** Caso clínico completo interconectado mediante un identificador común (`Patient/EjemploPatientLE`).

#### URLs de los Endpoints:
* **Paciente (Demografía):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Patient-EjemploPatientLE.json`
* **Atención Médica (Encounter):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Encounter-AtencionEjemplo.json`
* **Observación Clínica / Anamnesis:**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Observation-AnamnesisEjemplo.json`
* **Diagnóstico (Condition):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Condition-ConditionAtencionejemplo.json`  
  *(Código SNOMED: 24867002 · Insuficiencia adrenal severa)*
* **Alergia (AllergyIntolerance):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/AllergyIntolerance-AllergyIntoleranceExample.json`  
  *(Alergia a castaña de cajú)*
* **Medicamento (MedicationRequest):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/MedicationRequest-PrednisonaEjemplo.json`  
  *(Prednisona 5 mg · 2 veces al día por 1 mes)*
* **Examen de Laboratorio (Observation):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Observation-AnticuerpoAdrenal.json`  
  *(Ab adrenal en Sérum · 10 arb'U/mL)*
* **Profesional Tratante (Practitioner):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Practitioner-PractitionerProfesionalLEAtendedor.json`  
  *(Dr. Gonzalo Gonzalez Torres · RUN: 19.949.350-7 · RNPI: 1234543)*
* **Solicitud de Interconsulta (ServiceRequest):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/ServiceRequest-EjemploSolicitudInterconsultaFinalizada.json`
* **Bundle Contenedor (Mensajería Clínica):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/tei/0.2.3/Bundle-BundleIniciarEjemplo.json`  
  *(Contiene la Organización: Complejo Asistencial Dr. Víctor Ríos Ruiz de Los Ángeles · Código DEIS 120101)*

---

### B. Paciente 2: Javiera Castilla Muñoz (`16.182.522-0`)
* **Guía de referencia:** MINSAL Guía Nacional de Identificación Digital (NID) v0.4.6.
* **Características:** Demografía oficial del Registro Nacional y observaciones sociolaborales estructuradas.

#### URLs de los Endpoints:
* **Paciente (Demografía):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/nid/0.4.6/Patient-MinsalPacienteEjemplo.json`
* **Observación de Ocupación:**  
  `https://interoperabilidad.minsal.cl/fhir/ig/nid/0.4.6/Observation-EjemploOcupacion.json`  
  *(Ocupación: Ingenieros biomédicos · Código CIUO 2147)*
* **Observación de Discapacidad:**  
  `https://interoperabilidad.minsal.cl/fhir/ig/nid/0.4.6/Observation-EjemploSituacionDiscapacidad.json`  
  *(Sin situación de discapacidad reportada)*

---

### C. Paciente 3: Andres Martinez (`12.216.373-3`)
* **Guía de referencia:** MINSAL Guía Nacional de Identificación Digital (NID) v0.4.7.
* **Características:** Perfil de búsqueda unificada para paciente adulto chileno.

#### URLs de los Endpoints:
* **Paciente (Demografía):**  
  `https://interoperabilidad.minsal.cl/fhir/ig/nid/0.4.7/Patient-EjemploPacienteBusqueda.json`

---

### D. Paciente 4: Valentina Ester Henriquez (`19.241.323-8`)
* **Guía de referencia:** HL7 Chile - Guía del Resumen Clínico Internacional (CLIPS / IPS).
* **Características:** Resumen internacional de paciente con antecedentes clínicos cardiovasculares y farmacológicos.

#### URLs de los Endpoints:
* **Paciente (Demografía):**  
  `https://hl7chile.cl/fhir/ig/clips/Patient-PacienteClIpsEjemplo.json`
* **Diagnóstico (Condition):**  
  `https://hl7chile.cl/fhir/ig/clips/Condition-Condition-CL-Ejemplo.json`  
  *(Código SNOMED: 1201005 · Hipertensión esencial benigna)*
* **Alergia (AllergyIntolerance):**  
  `https://hl7chile.cl/fhir/ig/clips/AllergyIntolerance-Alergia-CL-Ejemplo.json`  
  *(Clotrimazol · Código ATC A01AB18 · Criticidad Moderada)*
* **Medicamento (MedicationRequest):**  
  `https://hl7chile.cl/fhir/ig/clips/MedicationRequest-MedicationRequest-CL-Ejemplo.json`  
  *(Aspirina 500 mg · Vía bucal)*
* **Examen de Laboratorio (Observation):**  
  `https://hl7chile.cl/fhir/ig/clips/Observation-LabPatologia-CL-Ejemplo.json`  
  *(Glucosa en sangre venosa mixta · LOINC 100746-7 · Resultado: 5.5 mmol/L)*
* **Observación de Hábitos (Tabaco):**  
  `https://hl7chile.cl/fhir/ig/clips/Observation-ObservacionConsumoTabacoEjemplo.json`  
  *(Fumador ocasional de tabaco · SNOMED 428041000124106)*

---

## 3. Endpoints Expuestos por el BFF Local (`http://localhost:3000`)

El Backend for Frontend (BFF) actúa como puente y normalizador de estas fuentes externas a través de las siguientes rutas:

### A. Módulo Exclusivo FHIR (`/fhir`):
* `GET /fhir/pacientes?rut={RUT}`: Consulta normalizada de datos demográficos.
* `GET /fhir/atenciones?rut={RUT}`: Consulta de atenciones médicas.
* `GET /fhir/diagnosticos?rut={RUT}`: Diagnósticos y condiciones clínicas.
* `GET /fhir/observaciones?rut={RUT}`: Observaciones clínicas y signos vitales.
* `GET /fhir/alergias?rut={RUT}`: Registro de alergias e intolerancias.
* `GET /fhir/medicamentos?rut={RUT}`: Prescripciones y tratamientos activos.
* `GET /fhir/examenes?rut={RUT}`: Resultados de exámenes de laboratorio.
* `GET /fhir/bundles`: Acceso al Bundle de mensajería interoperable.
* `GET /fhir/profesionales`: Datos del profesional de salud atendedor.
* `GET /fhir/interconsultas`: Detalle de la solicitud de derivación/interconsulta.

### B. Rutas Integradas en Gestión Clínica (`/gestion-clinica`):
* `GET /gestion-clinica/pacientes/buscar?rut={RUT}`: Búsqueda unificada en la pestaña Pacientes.
* `GET /gestion-clinica/nueva-atencion/paciente?rut={RUT}`: Autocompletado instantáneo de datos personales en el modal de Nueva Atención.
* `GET /gestion-clinica/atenciones?rut={RUT}`: Listado de atenciones con discriminación automática de rol médico.
* `GET /gestion-clinica/atenciones/{ID}/ficha`: Visualización de ficha clínica de atención de solo lectura.
* `GET /gestion-clinica/atenciones/{ID}/detalle`: Modal de derivación y profesional a cargo.
* `GET /gestion-clinica/{recurso}?rut={RUT}`: Listado en carrusel de tarjetas (`diagnosticos`, `alergias`, `medicamentos`, `examenes`, `observaciones`).
* `GET /gestion-clinica/{recurso}/{ID}`: Modal de detalle específico para cada registro clínico.
