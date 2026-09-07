-- ============================================================================
-- CHATBOT CATASTRAL GAMC – Esquema MySQL Completo
-- ============================================================================
-- Base de datos: catastro_gamc
-- Motor:        MySQL 8.0+
-- Charset:      utf8mb4 (soporte completo de emojis y caracteres especiales)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS catastro_gamc
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE catastro_gamc;

-- ============================================================================
-- 1. TABLA: tramites
-- ============================================================================
CREATE TABLE IF NOT EXISTS tramites (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    clave                VARCHAR(100)  NOT NULL UNIQUE,
    nombre               VARCHAR(255)  NOT NULL,
    descripcion          TEXT,
    costo_monto          DECIMAL(10,2),
    costo_moneda         VARCHAR(10)   DEFAULT 'Bs.',
    costo_nota           VARCHAR(255),
    tiempo_min_dias      INT,
    tiempo_max_dias      INT,
    categoria            VARCHAR(100),
    base_legal           TEXT,
    donde_se_realiza     VARCHAR(255),
    horario_atencion     VARCHAR(255),
    requiere_inspeccion  TINYINT(1)    NOT NULL DEFAULT 0,
    requiere_cita_previa TINYINT(1)    NOT NULL DEFAULT 0,
    resultado_entregable VARCHAR(255),
    activo               TINYINT(1)    NOT NULL DEFAULT 1,
    created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tramites_categoria (categoria),
    INDEX idx_tramites_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 2. TABLA: aliases
-- ============================================================================
CREATE TABLE IF NOT EXISTS aliases (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    tramite_id INT          NOT NULL,
    alias      VARCHAR(255) NOT NULL,

    INDEX idx_aliases_tramite_id (tramite_id),
    INDEX idx_aliases_alias (alias),
    CONSTRAINT fk_aliases_tramite FOREIGN KEY (tramite_id) REFERENCES tramites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 3. TABLA: requisitos
-- ============================================================================
CREATE TABLE IF NOT EXISTS requisitos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    tramite_id        INT          NOT NULL,
    descripcion       TEXT         NOT NULL,
    detalle           TEXT,
    orden             INT          NOT NULL DEFAULT 0,
    obligatorio       TINYINT(1)   NOT NULL DEFAULT 1,
    tipo              VARCHAR(50)  DEFAULT 'documento',
    donde_obtener     VARCHAR(255),
    vigencia          VARCHAR(100),
    costo_aproximado  VARCHAR(100),

    INDEX idx_requisitos_tramite_id (tramite_id),
    INDEX idx_requisitos_obligatorio (obligatorio),
    CONSTRAINT fk_requisitos_tramite FOREIGN KEY (tramite_id) REFERENCES tramites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 4. TABLA: pasos_procedimiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS pasos_procedimiento (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    tramite_id         INT          NOT NULL,
    numero_paso        INT          NOT NULL,
    titulo             VARCHAR(255) NOT NULL,
    descripcion        TEXT,
    ubicacion          VARCHAR(255),
    duracion_estimada  VARCHAR(100),
    nota               TEXT,

    UNIQUE KEY uq_paso (tramite_id, numero_paso),
    INDEX idx_pasos_tramite_id (tramite_id),
    CONSTRAINT fk_pasos_tramite FOREIGN KEY (tramite_id) REFERENCES tramites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 5. TABLA: faq
-- ============================================================================
CREATE TABLE IF NOT EXISTS faq (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    tramite_id       INT,
    pregunta         TEXT         NOT NULL,
    respuesta        TEXT         NOT NULL,
    categoria        VARCHAR(100) DEFAULT 'general',
    palabras_clave   TEXT,
    orden_prioridad  INT          DEFAULT 0,
    activo           TINYINT(1)   NOT NULL DEFAULT 1,

    INDEX idx_faq_tramite_id (tramite_id),
    INDEX idx_faq_categoria (categoria),
    INDEX idx_faq_activo (activo),
    CONSTRAINT fk_faq_tramite FOREIGN KEY (tramite_id) REFERENCES tramites(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 6. TABLA: contexto_institucional
-- ============================================================================
CREATE TABLE IF NOT EXISTS contexto_institucional (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    clave     VARCHAR(100) NOT NULL UNIQUE,
    categoria VARCHAR(100) NOT NULL,
    titulo    VARCHAR(255) NOT NULL,
    contenido TEXT         NOT NULL,
    orden     INT          DEFAULT 0,
    activo    TINYINT(1)   NOT NULL DEFAULT 1,

    INDEX idx_contexto_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 7. TABLA: glosario
-- ============================================================================
CREATE TABLE IF NOT EXISTS glosario (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    termino          VARCHAR(255) NOT NULL UNIQUE,
    definicion       TEXT         NOT NULL,
    ejemplo_uso      TEXT,
    donde_obtener    VARCHAR(255),
    costo_aproximado VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 8. TABLA: tramites_relacionados
-- ============================================================================
CREATE TABLE IF NOT EXISTS tramites_relacionados (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    tramite_origen_id   INT         NOT NULL,
    tramite_destino_id  INT         NOT NULL,
    tipo_relacion       VARCHAR(50) NOT NULL,
    descripcion         TEXT,

    UNIQUE KEY uq_relacion (tramite_origen_id, tramite_destino_id),
    INDEX idx_rel_origen (tramite_origen_id),
    INDEX idx_rel_destino (tramite_destino_id),
    CONSTRAINT fk_rel_origen  FOREIGN KEY (tramite_origen_id)  REFERENCES tramites(id) ON DELETE CASCADE,
    CONSTRAINT fk_rel_destino FOREIGN KEY (tramite_destino_id) REFERENCES tramites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 9. TABLA: excepciones_casos_especiales
-- ============================================================================
CREATE TABLE IF NOT EXISTS excepciones_casos_especiales (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    tramite_id              INT          NOT NULL,
    caso                    VARCHAR(255) NOT NULL,
    descripcion             TEXT         NOT NULL,
    requisitos_adicionales  TEXT,
    nota                    TEXT,

    INDEX idx_excepciones_tramite_id (tramite_id),
    CONSTRAINT fk_excepciones_tramite FOREIGN KEY (tramite_id) REFERENCES tramites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 10. TABLA: historial_conversaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS historial_conversaciones (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    session_id         VARCHAR(100) NOT NULL,
    role               VARCHAR(20)  NOT NULL,
    content            TEXT         NOT NULL,
    timestamp          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tramite_detectado  VARCHAR(100),
    score_match        DECIMAL(5,4),
    sin_respuesta      TINYINT(1)   NOT NULL DEFAULT 0,
    feedback           VARCHAR(20),

    INDEX idx_historial_session (session_id),
    INDEX idx_historial_timestamp (timestamp),
    INDEX idx_historial_tramite (tramite_detectado),
    INDEX idx_historial_sin_resp (sin_respuesta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ############################################################################
--                         DATOS SEMILLA (SEED DATA)
-- ############################################################################

-- ============================================================================
-- TRAMITES
-- ============================================================================
INSERT INTO tramites (clave, nombre, descripcion, costo_monto, costo_nota, tiempo_min_dias, tiempo_max_dias, categoria, base_legal, donde_se_realiza, requiere_inspeccion, resultado_entregable) VALUES
('cambio_de_nombre',
 'Cambio de Nombre de Propietario',
 'Trámite para actualizar el registro catastral cuando un inmueble cambia de propietario, ya sea por compra-venta, donación, sucesión hereditaria u otro acto jurídico válido.',
 50.00, 'sujeto a actualización', 5, 10, 'propiedad',
 'Ley N° 247 de Regularización del Derecho Propietario, Código Civil Art. 1538',
 'Ventanilla de Catastro, Planta Baja, Edificio Central GAMC',
 0, 'Registro catastral actualizado con el nuevo propietario'),

('visado_de_plano',
 'Visado de Plano',
 'Trámite mediante el cual la Dirección de Catastro revisa y aprueba el plano de un lote o propiedad, verificando que cumpla con la normativa urbanística vigente.',
 80.00, 'sujeto a actualización', 10, 15, 'planos',
 'Reglamento de Uso del Suelo Urbano, Norma Técnica de Catastro Municipal',
 'Ventanilla de Catastro, Planta Baja, Edificio Central GAMC',
 1, 'Plano con sello de aprobación (visado) de la Dirección de Catastro'),

('certificado_catastral',
 'Certificado Catastral',
 'Documento oficial emitido por la Dirección de Catastro que certifica los datos registrales de un inmueble: superficie, ubicación, código catastral y propietario registrado.',
 30.00, 'sujeto a actualización', 3, 5, 'certificados',
 'Ley N° 247, Reglamento de Catastro Municipal',
 'Ventanilla de Catastro, Planta Baja, Edificio Central GAMC',
 0, 'Certificado Catastral impreso con firma y sello oficial'),

('avaluo_catastral',
 'Avalúo Catastral',
 'Proceso técnico de valoración que determina el valor fiscal de un inmueble para efectos tributarios y legales, realizado por un perito designado por la Dirección de Catastro.',
 100.00, 'sujeto a actualización según superficie del inmueble', 10, 20, 'valuacion',
 'Ley N° 843 de Reforma Tributaria, Código Tributario Boliviano',
 'Ventanilla de Catastro, Planta Baja, Edificio Central GAMC',
 1, 'Informe de Avalúo Catastral con valor fiscal determinado');


-- ============================================================================
-- ALIASES
-- ============================================================================
INSERT INTO aliases (tramite_id, alias) VALUES
-- Cambio de Nombre (id=1)
(1, 'cambio de nombre'), (1, 'transferencia de propiedad'), (1, 'cambio de titular'),
(1, 'traspaso de propiedad'), (1, 'cambio de propietario'), (1, 'cambio de dueño'),
(1, 'transferencia de inmueble'), (1, 'nuevo propietario'),
(1, 'compra venta inmueble'), (1, 'cambio de nombre del dueño'),
-- Visado de Plano (id=2)
(2, 'visado de plano'), (2, 'visación de planos'), (2, 'aprobación de plano'),
(2, 'visar plano'), (2, 'visa de plano'), (2, 'visado'),
(2, 'revision de plano'), (2, 'revisión de planos'),
(2, 'aprobar plano'), (2, 'plano de lote'),
-- Certificado Catastral (id=3)
(3, 'certificado catastral'), (3, 'certificado de catastro'),
(3, 'certificación catastral'), (3, 'constancia catastral'),
(3, 'certificado de propiedad catastro'), (3, 'registro catastral'),
-- Avalúo Catastral (id=4)
(4, 'avalúo catastral'), (4, 'avaluo catastral'), (4, 'avalúo de propiedad'),
(4, 'valuación catastral'), (4, 'valor catastral'), (4, 'avalúo de inmueble'),
(4, 'avaluo fiscal'), (4, 'avalúo de terreno'),
(4, 'valor de la propiedad'), (4, 'cuánto vale mi propiedad');


-- ============================================================================
-- REQUISITOS
-- ============================================================================
-- Cambio de Nombre (id=1)
INSERT INTO requisitos (tramite_id, descripcion, detalle, orden, obligatorio, tipo, donde_obtener, vigencia, costo_aproximado) VALUES
(1, 'Fotocopia de Cédula de Identidad del nuevo propietario (vigente)',
 'Debe estar vigente y ser legible. Se aceptan fotocopias simples.', 1, 1, 'documento', 'SEGIP', 'Vigente (no vencida)', NULL),
(1, 'Fotocopia de Cédula de Identidad del anterior propietario (vigente)',
 'Del vendedor o propietario anterior.', 2, 1, 'documento', 'SEGIP', 'Vigente (no vencida)', NULL),
(1, 'Testimonio de Transferencia (Escritura Pública registrada en Derechos Reales)',
 'Es la escritura pública de compra-venta, donación u otro acto. Debe tener el sello de inscripción de Derechos Reales.',
 3, 1, 'documento', 'Notaría de Fe Pública + registro en Derechos Reales', NULL, 'Variable según valor del inmueble'),
(1, 'Folio Real actualizado (emitido por Derechos Reales)',
 'Documento que acredita la titularidad actual del inmueble ante Derechos Reales.',
 4, 1, 'documento', 'Oficina de Derechos Reales', '90 días máximo', 'Bs. 100 aprox.'),
(1, 'Certificado Catastral del inmueble (vigente)',
 'Certifica los datos registrales del inmueble en Catastro municipal.',
 5, 1, 'documento', 'Dirección de Catastro GAMC', '90 días', 'Bs. 30'),
(1, 'Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles',
 'Boleta de pago del impuesto anual a la propiedad. Debe estar al día.',
 6, 1, 'pago', 'Entidad financiera autorizada o GAMC', 'Gestión vigente', NULL),
(1, 'Formulario de solicitud de cambio de nombre',
 'Formulario oficial proporcionado gratuitamente en ventanilla.',
 7, 1, 'formulario', 'Ventanilla de Catastro GAMC', NULL, 'Gratuito');

-- Visado de Plano (id=2)
INSERT INTO requisitos (tramite_id, descripcion, detalle, orden, obligatorio, tipo, donde_obtener, vigencia, costo_aproximado) VALUES
(2, 'Plano de lote a escala 1:200 firmado por profesional habilitado (arquitecto o ing. civil)',
 'Debe contener las medidas perimetrales, superficie, colindancias y norte magnético. Firmado y sellado por profesional inscrito en el Colegio correspondiente.',
 1, 1, 'documento', 'Profesional habilitado (arquitecto/ingeniero civil)', NULL, 'Variable según profesional'),
(2, 'Plano de ubicación georeferenciado',
 'Plano a escala menor que muestra la ubicación del lote dentro de la manzana y zona.',
 2, 1, 'documento', 'Profesional habilitado', NULL, 'Incluido en plano de lote'),
(2, 'Fotocopia de Cédula de Identidad del propietario (vigente)',
 NULL, 3, 1, 'documento', 'SEGIP', 'Vigente', NULL),
(2, 'Testimonio de Propiedad o Título de Adjudicación',
 'Documento legal que acredita la propiedad del inmueble.',
 4, 1, 'documento', 'Notaría / Derechos Reales', NULL, NULL),
(2, 'Folio Real actualizado (emitido por Derechos Reales)',
 NULL, 5, 1, 'documento', 'Oficina de Derechos Reales', '90 días máximo', 'Bs. 100 aprox.'),
(2, 'Certificado de Registro Catastral vigente',
 NULL, 6, 1, 'documento', 'Dirección de Catastro GAMC', '90 días', 'Bs. 30'),
(2, 'Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles',
 NULL, 7, 1, 'pago', 'Entidad financiera autorizada o GAMC', 'Gestión vigente', NULL),
(2, 'Formulario de solicitud de visado de plano',
 'Formulario oficial proporcionado gratuitamente en ventanilla.',
 8, 1, 'formulario', 'Ventanilla de Catastro GAMC', NULL, 'Gratuito');

-- Certificado Catastral (id=3)
INSERT INTO requisitos (tramite_id, descripcion, detalle, orden, obligatorio, tipo, donde_obtener, vigencia, costo_aproximado) VALUES
(3, 'Fotocopia de Cédula de Identidad del propietario (vigente)',
 NULL, 1, 1, 'documento', 'SEGIP', 'Vigente', NULL),
(3, 'Folio Real actualizado (emitido por Derechos Reales)',
 NULL, 2, 1, 'documento', 'Oficina de Derechos Reales', '90 días máximo', 'Bs. 100 aprox.'),
(3, 'Testimonio de Propiedad o documento equivalente',
 'Escritura pública, título de adjudicación u otro documento que acredite la propiedad.',
 3, 1, 'documento', 'Notaría / Derechos Reales', NULL, NULL),
(3, 'Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles',
 NULL, 4, 1, 'pago', 'Entidad financiera autorizada o GAMC', 'Gestión vigente', NULL),
(3, 'Formulario de solicitud de certificado catastral',
 'Formulario oficial proporcionado gratuitamente en ventanilla.',
 5, 1, 'formulario', 'Ventanilla de Catastro GAMC', NULL, 'Gratuito');

-- Avalúo Catastral (id=4)
INSERT INTO requisitos (tramite_id, descripcion, detalle, orden, obligatorio, tipo, donde_obtener, vigencia, costo_aproximado) VALUES
(4, 'Solicitud escrita dirigida al Director de Catastro',
 'Carta de solicitud formal indicando el motivo del avalúo.',
 1, 1, 'documento', 'Redacción propia del solicitante', NULL, NULL),
(4, 'Fotocopia de Cédula de Identidad del propietario (vigente)',
 NULL, 2, 1, 'documento', 'SEGIP', 'Vigente', NULL),
(4, 'Certificado Alodial (emitido por la Alcaldía Municipal)',
 'Certifica que el inmueble está libre de gravámenes municipales.',
 3, 1, 'documento', 'Alcaldía Municipal de Cochabamba', '90 días', 'Bs. 20 aprox.'),
(4, 'Folio Real actualizado (emitido por Derechos Reales)',
 NULL, 4, 1, 'documento', 'Oficina de Derechos Reales', '90 días máximo', 'Bs. 100 aprox.'),
(4, 'Testimonio de Propiedad o documento equivalente',
 NULL, 5, 1, 'documento', 'Notaría / Derechos Reales', NULL, NULL),
(4, 'Plano aprobado del inmueble (con visado vigente)',
 'El plano debe tener el sello de visado de la Dirección de Catastro.',
 6, 1, 'documento', 'Dirección de Catastro GAMC (trámite de visado)', NULL, 'Bs. 80 (costo del visado)'),
(4, 'Último comprobante de pago del Impuesto a la Propiedad de Bienes Inmuebles',
 NULL, 7, 1, 'pago', 'Entidad financiera autorizada o GAMC', 'Gestión vigente', NULL);


-- ============================================================================
-- PASOS DE PROCEDIMIENTO
-- ============================================================================
-- Cambio de Nombre (id=1)
INSERT INTO pasos_procedimiento (tramite_id, numero_paso, titulo, descripcion, ubicacion, duracion_estimada, nota) VALUES
(1, 1, 'Reunir los documentos requeridos',
 'Recopile todos los requisitos documentales listados. Asegúrese de que el Folio Real y el Certificado Catastral estén vigentes (máx. 90 días).',
 NULL, '1-3 días', 'Verifique vigencia de todos los documentos antes de acudir'),
(1, 2, 'Llenar formulario de solicitud',
 'Solicite y llene el formulario de cambio de nombre en ventanilla. Se proporciona gratuitamente.',
 'Ventanilla de Catastro, Planta Baja', '10 minutos', NULL),
(1, 3, 'Presentar documentos en ventanilla',
 'Entregue toda la carpeta de documentos. El funcionario verificará que esté completa.',
 'Ventanilla de Catastro, Planta Baja', '15-30 minutos', 'Si falta algún documento, deberá volver con la carpeta completa'),
(1, 4, 'Pago del trámite',
 'Realice el pago correspondiente en caja. Se le entregará un comprobante.',
 'Caja GAMC, Planta Baja', '10 minutos', 'Conserve el comprobante de pago'),
(1, 5, 'Esperar procesamiento',
 'El equipo técnico de Catastro procesará la solicitud y actualizará el registro.',
 NULL, '5-10 días hábiles', NULL),
(1, 6, 'Recoger documento actualizado',
 'Acuda con su comprobante de pago y cédula de identidad para recoger el registro actualizado.',
 'Ventanilla de Catastro, Planta Baja', '10 minutos', 'Se le notificará cuando esté listo');

-- Visado de Plano (id=2)
INSERT INTO pasos_procedimiento (tramite_id, numero_paso, titulo, descripcion, ubicacion, duracion_estimada, nota) VALUES
(2, 1, 'Contratar un profesional habilitado',
 'Contrate a un arquitecto o ingeniero civil registrado en su Colegio Profesional para elaborar el plano del lote.',
 NULL, 'Variable', 'El profesional debe estar habilitado y tener matrícula vigente'),
(2, 2, 'Reunir los documentos requeridos',
 'Recopile todos los documentos: plano, CI, Testimonio, Folio Real, etc.',
 NULL, '1-3 días', NULL),
(2, 3, 'Presentar documentos en ventanilla',
 'Entregue la carpeta completa incluyendo el plano firmado por el profesional.',
 'Ventanilla de Catastro, Planta Baja', '20-30 minutos', NULL),
(2, 4, 'Inspección técnica en campo',
 'Un técnico de Catastro visitará el inmueble para verificar las medidas y colindancias del plano.',
 'En el inmueble', '1-2 horas', 'Debe estar presente el propietario o un representante'),
(2, 5, 'Revisión técnica del plano',
 'El equipo técnico revisa que el plano cumpla con la normativa urbanística.',
 'Oficina de Catastro', '5-10 días hábiles', 'Si hay observaciones, se le notificará para correcciones'),
(2, 6, 'Pago y recojo del plano visado',
 'Realice el pago y recoja el plano con el sello oficial de visado.',
 'Caja GAMC + Ventanilla de Catastro', '15 minutos', NULL);

-- Certificado Catastral (id=3)
INSERT INTO pasos_procedimiento (tramite_id, numero_paso, titulo, descripcion, ubicacion, duracion_estimada, nota) VALUES
(3, 1, 'Reunir los documentos requeridos',
 'Recopile la CI, Folio Real actualizado, Testimonio de Propiedad y último pago de impuesto.',
 NULL, '1-2 días', NULL),
(3, 2, 'Llenar formulario de solicitud',
 'Solicite y llene el formulario de certificado catastral en ventanilla.',
 'Ventanilla de Catastro, Planta Baja', '10 minutos', NULL),
(3, 3, 'Presentar documentos y pagar',
 'Entregue los documentos y realice el pago en caja.',
 'Ventanilla de Catastro + Caja GAMC', '20 minutos', NULL),
(3, 4, 'Recoger certificado',
 'En 3 a 5 días hábiles, recoja su certificado con CI y comprobante de pago.',
 'Ventanilla de Catastro, Planta Baja', '10 minutos', 'Puede consultar el estado por teléfono');

-- Avalúo Catastral (id=4)
INSERT INTO pasos_procedimiento (tramite_id, numero_paso, titulo, descripcion, ubicacion, duracion_estimada, nota) VALUES
(4, 1, 'Redactar solicitud dirigida al Director de Catastro',
 'Escriba una carta formal solicitando el avalúo e indicando el motivo (venta, hipoteca, tributario, etc.).',
 NULL, '30 minutos', NULL),
(4, 2, 'Reunir los documentos requeridos',
 'Recopile todos los requisitos incluyendo el plano visado y Certificado Alodial.',
 NULL, '1-5 días', 'El plano debe tener visado vigente de Catastro'),
(4, 3, 'Presentar documentos en ventanilla',
 'Entregue la carpeta completa.',
 'Ventanilla de Catastro, Planta Baja', '20-30 minutos', NULL),
(4, 4, 'Inspección y peritaje del inmueble',
 'Un perito valuador designado por Catastro visitará el inmueble para evaluar su estado, materiales, antigüedad y otros factores.',
 'En el inmueble', '1-3 horas', 'Debe facilitar el acceso completo al inmueble'),
(4, 5, 'Elaboración del informe de avalúo',
 'El perito elabora el informe técnico con el valor fiscal determinado.',
 'Oficina de Catastro', '10-15 días hábiles', NULL),
(4, 6, 'Pago y recojo del informe',
 'Realice el pago y recoja el informe oficial de avalúo.',
 'Caja GAMC + Ventanilla de Catastro', '15 minutos', 'El costo puede variar según la superficie del inmueble');


-- ============================================================================
-- FAQ
-- ============================================================================
-- Generales
INSERT INTO faq (tramite_id, pregunta, respuesta, categoria, palabras_clave, orden_prioridad) VALUES
(NULL, '¿Dónde queda la oficina de Catastro?',
 'La Dirección de Catastro del GAMC se encuentra en la Planta Baja del Edificio Central de la Alcaldía de Cochabamba, ubicado en la Plaza 14 de Septiembre.',
 'ubicacion', 'donde,oficina,catastro,direccion,ubicacion', 1),
(NULL, '¿Cuál es el horario de atención de Catastro?',
 'El horario de atención es de lunes a viernes de 8:00 a 12:00 y de 14:30 a 18:30. No se atiende sábados, domingos ni feriados.',
 'horarios', 'horario,atencion,hora,cuando,abierto', 2),
(NULL, '¿Puedo hacer trámites en línea?',
 'Actualmente los trámites de Catastro del GAMC se realizan de forma presencial en las oficinas de la Alcaldía. Se está trabajando en la implementación de servicios digitales.',
 'general', 'online,linea,internet,virtual,digital', 3),
(NULL, '¿Qué trámites puedo realizar en Catastro?',
 'En la Dirección de Catastro del GAMC puedes realizar: Cambio de Nombre de Propietario, Visado de Plano, Certificado Catastral y Avalúo Catastral, entre otros.',
 'general', 'tramites,cuales,lista,servicios', 4),
(NULL, '¿Necesito abogado para hacer trámites en Catastro?',
 'No es obligatorio contar con un abogado para la mayoría de los trámites catastrales. Sin embargo, para transferencias de propiedad es recomendable contar con asesoría legal para la Escritura Pública.',
 'general', 'abogado,necesito,obligatorio,asesor', 5),
(NULL, '¿Qué es el impuesto a la propiedad de bienes inmuebles?',
 'Es un impuesto anual que todo propietario de un inmueble debe pagar al municipio. El comprobante de pago al día es requisito para la mayoría de los trámites catastrales.',
 'costos', 'impuesto,propiedad,inmueble,pago,anual', 6);

-- FAQ por trámite
INSERT INTO faq (tramite_id, pregunta, respuesta, categoria, palabras_clave, orden_prioridad) VALUES
(1, '¿Puedo hacer el cambio de nombre sin la presencia del anterior propietario?',
 'Sí, el cambio de nombre se realiza con base en el Testimonio de Transferencia registrado en Derechos Reales. No es necesaria la presencia física del anterior propietario, pero sí se requiere fotocopia de su CI.',
 'requisitos', 'anterior,propietario,presencia,vendedor', 1),
(1, '¿Cuánto tarda el cambio de nombre?',
 'El trámite de Cambio de Nombre tarda entre 5 y 10 días hábiles una vez presentada la carpeta completa.',
 'plazos', 'tiempo,tarda,demora,cuanto,dias', 2),
(1, '¿El cambio de nombre sirve para herencias?',
 'Sí, el cambio de nombre aplica para herencias. En ese caso, en lugar del Testimonio de Transferencia (compra-venta), se presenta la Declaratoria de Herederos y la Aceptación de Herencia inscritas en Derechos Reales.',
 'requisitos', 'herencia,heredero,sucesion,fallecido', 3),
(3, '¿Para qué sirve el Certificado Catastral?',
 'El Certificado Catastral es un documento que certifica los datos oficiales de un inmueble: superficie, ubicación, código catastral y propietario registrado. Se necesita para transferencias de propiedad, trámites bancarios, y otros procedimientos legales.',
 'general', 'sirve,para que,necesito,usar', 1),
(3, '¿Cuánto tiempo tiene de validez el Certificado Catastral?',
 'El Certificado Catastral tiene una vigencia de 90 días a partir de su fecha de emisión.',
 'plazos', 'vigencia,validez,vence,caduca,tiempo', 2),
(4, '¿Para qué necesito un avalúo catastral?',
 'El Avalúo Catastral se necesita principalmente para: determinar el valor fiscal del inmueble para fines tributarios, procesos de compra-venta, hipotecas bancarias, divisiones de bienes, y procesos judiciales.',
 'general', 'necesito,para que,sirve,avaluo', 1),
(4, '¿Quién hace la inspección del avalúo?',
 'La inspección la realiza un perito valuador designado por la Dirección de Catastro del GAMC. Es un técnico especializado que evalúa el estado del inmueble, materiales de construcción, antigüedad, ubicación y otros factores.',
 'general', 'inspector,perito,quien,inspecciona,visita', 2);


-- ============================================================================
-- CONTEXTO INSTITUCIONAL
-- ============================================================================
INSERT INTO contexto_institucional (clave, categoria, titulo, contenido, orden) VALUES
('horarios_atencion', 'horarios', 'Horarios de Atención',
 'Lunes a Viernes: 8:00 a 12:00 y 14:30 a 18:30. Sábados, domingos y feriados: No hay atención.', 1),
('direccion_oficina', 'ubicacion', 'Dirección de la Oficina de Catastro',
 'Dirección de Catastro, Planta Baja, Edificio Central del Gobierno Autónomo Municipal de Cochabamba (GAMC). Plaza 14 de Septiembre, Cochabamba, Bolivia.', 2),
('telefono_contacto', 'contacto', 'Teléfonos de Contacto',
 'Teléfono central GAMC: (591-4) 425-8030. Dirección de Catastro: Interno 123. Para consultas generales puede llamar en horario de atención.', 3),
('requisitos_generales', 'general', 'Requisitos Generales para Todos los Trámites',
 'Para cualquier trámite catastral necesita: 1) Cédula de identidad vigente (original y fotocopia), 2) Estar al día con el pago del Impuesto a la Propiedad de Bienes Inmuebles.', 4),
('pagos_info', 'general', 'Información sobre Pagos',
 'Los pagos se realizan en la Caja del GAMC (Planta Baja) o en entidades financieras autorizadas. Se aceptan pagos en efectivo. Los montos están en Bolivianos (Bs.) y están sujetos a actualización.', 5),
('normativa_general', 'normativa', 'Marco Normativo',
 'Los trámites catastrales se rigen por: Ley N° 247 de Regularización del Derecho Propietario, la Ley N° 843 de Reforma Tributaria, el Código Civil Boliviano, y los reglamentos internos del GAMC.', 6),
('recomendaciones', 'general', 'Recomendaciones Generales',
 'Se recomienda: 1) Verificar la vigencia de todos los documentos antes de acudir, 2) Sacar fotocopias adicionales por seguridad, 3) Acudir temprano para evitar filas, 4) Consultar costos actualizados en ventanilla ya que pueden variar.', 7);


-- ============================================================================
-- GLOSARIO
-- ============================================================================
INSERT INTO glosario (termino, definicion, ejemplo_uso, donde_obtener, costo_aproximado) VALUES
('Folio Real',
 'Documento emitido por la oficina de Derechos Reales que certifica la titularidad y las cargas (hipotecas, gravámenes) que pesan sobre un inmueble. Es el registro oficial de propiedad en Bolivia.',
 'Se necesita para demostrar quién es el dueño registrado de un inmueble ante cualquier institución.',
 'Oficina de Derechos Reales de Cochabamba', 'Bs. 100 aproximadamente'),
('Testimonio de Propiedad',
 'Escritura Pública otorgada por un Notario de Fe Pública que documenta la adquisición de un inmueble (compra-venta, donación, adjudicación, etc.). Debe estar registrado en Derechos Reales para tener validez frente a terceros.',
 'Es el documento principal que prueba cómo adquirió su propiedad.',
 'Notaría de Fe Pública donde se realizó la transacción', 'Variable según el valor del inmueble'),
('Certificado Alodial',
 'Documento emitido por la Alcaldía Municipal que certifica que un inmueble está libre de deudas municipales (impuestos, tasas, multas).',
 'Se requiere para el trámite de Avalúo Catastral.',
 'Alcaldía Municipal de Cochabamba', 'Bs. 20 aproximadamente'),
('Código Catastral',
 'Número único de identificación que el municipio asigna a cada inmueble registrado en el sistema catastral. Funciona como la "cédula de identidad" del inmueble.',
 'Aparece en su Certificado Catastral y en su boleta de impuestos.',
 'Se asigna automáticamente al registrar el inmueble en Catastro', 'No tiene costo adicional'),
('Derechos Reales',
 'Institución pública encargada del registro oficial de la propiedad de bienes inmuebles en Bolivia. Toda transferencia de propiedad debe inscribirse aquí para tener validez legal.',
 'Después de firmar una escritura de compra-venta, debe inscribirla en Derechos Reales.',
 'Oficina de Derechos Reales (institución independiente del GAMC)', 'Variable según el trámite'),
('Visado de Plano',
 'Acto administrativo por el cual la Dirección de Catastro revisa y aprueba un plano de inmueble, verificando que cumple con las normas urbanísticas. El plano aprobado recibe un sello oficial.',
 'Necesita un plano visado para el trámite de Avalúo Catastral.',
 'Dirección de Catastro GAMC (es un trámite en sí mismo)', 'Bs. 80'),
('Impuesto a la Propiedad de Bienes Inmuebles',
 'Impuesto anual que todo propietario de un inmueble debe pagar al municipio donde se encuentra el bien. El monto depende del valor catastral del inmueble.',
 'Debe estar al día con este impuesto para realizar cualquier trámite catastral.',
 'Se paga en Caja GAMC o entidades financieras autorizadas', 'Variable según el valor catastral del inmueble');


-- ============================================================================
-- TRAMITES RELACIONADOS
-- ============================================================================
INSERT INTO tramites_relacionados (tramite_origen_id, tramite_destino_id, tipo_relacion, descripcion) VALUES
(1, 3, 'prerequisito', 'Para el Cambio de Nombre necesita un Certificado Catastral vigente. Si no lo tiene, debe tramitarlo primero.'),
(4, 2, 'prerequisito', 'Para el Avalúo Catastral necesita un plano con visado vigente. Si no lo tiene, debe hacer el Visado de Plano primero.'),
(1, 4, 'complementario', 'Después de un cambio de nombre, puede ser útil solicitar un nuevo Avalúo Catastral para actualizar el valor fiscal del inmueble.'),
(2, 3, 'complementario', 'Después de visar un plano, es recomendable solicitar un Certificado Catastral actualizado.');


-- ============================================================================
-- EXCEPCIONES Y CASOS ESPECIALES
-- ============================================================================
INSERT INTO excepciones_casos_especiales (tramite_id, caso, descripcion, requisitos_adicionales, nota) VALUES
(1, 'Herencia / Sucesión Hereditaria',
 'Cuando el cambio de nombre es por fallecimiento del propietario anterior y sus herederos asumen la propiedad.',
 'Declaratoria de Herederos inscrita en Derechos Reales, Certificado de Defunción del anterior propietario, Aceptación de Herencia (si aplica)',
 'En caso de múltiples herederos, todos deben firmar o designar un representante legal con poder notariado.'),
(1, 'Donación',
 'Cuando la transferencia es por donación (sin pago de por medio).',
 'Escritura Pública de Donación registrada en Derechos Reales (en lugar del Testimonio de Transferencia por compra-venta)',
 'La donación entre familiares directos puede tener beneficios tributarios.'),
(1, 'Persona Jurídica (empresa)',
 'Cuando el nuevo propietario es una empresa o institución.',
 'NIT de la empresa, Poder del Representante Legal, Testimonio de Constitución de la Empresa',
 'El representante legal debe presentar su CI personal además de la documentación de la empresa.'),
(4, 'Inmueble en construcción',
 'Cuando se solicita avalúo de un inmueble que aún está en proceso de construcción.',
 'Plano de construcción aprobado, Permiso de construcción vigente',
 'El valor del avalúo considerará el estado actual de avance de la obra.'),
(4, 'Terreno baldío (sin construcción)',
 'Cuando el inmueble es un terreno sin construcciones.',
 'No se requieren documentos adicionales, pero el avalúo considerará únicamente el valor del terreno.',
 'El costo del avalúo puede ser menor al no requerir valoración de construcciones.'),
(2, 'Lote en zona rural',
 'Cuando el lote se encuentra en área rural o periurbana.',
 'Certificado de Uso de Suelo emitido por la Dirección de Planificación del GAMC',
 'La normativa urbanística puede diferir de la zona urbana. Consulte previamente.');
