-- Suscripciones Web Push (una fila por navegador/dispositivo suscrito).
-- El backend también intenta crearla automáticamente al iniciar (CREATE TABLE IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  endpoint VARCHAR(700) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_endpoint (endpoint(255)),
  KEY idx_push_usuario (id_usuario)
);

-- Bandeja de notificaciones dentro de la web.
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  destino_tipo ENUM('todos','rol','usuario') NOT NULL,
  destino_valor VARCHAR(50) NULL,
  categoria VARCHAR(30) NOT NULL DEFAULT 'aviso',
  titulo VARCHAR(120) NOT NULL,
  mensaje VARCHAR(300) NOT NULL,
  url VARCHAR(255) NULL,
  fecha_creacion DATETIME NOT NULL,
  KEY idx_notif_destino (destino_tipo, destino_valor),
  KEY idx_notif_fecha (fecha_creacion)
);

CREATE TABLE IF NOT EXISTS notificaciones_leidas (
  id_notificacion INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacion, id_usuario),
  KEY idx_leidas_usuario (id_usuario)
);
