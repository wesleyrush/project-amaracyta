-- ============================================================
-- Data-Base-Update.sql  —  Reestruturação de Cobrança (v2)
-- ============================================================

-- 1. Adiciona tipo e preço ao módulo
ALTER TABLE `modules`
  ADD COLUMN `module_type` ENUM('free','fixed') NOT NULL DEFAULT 'free' AFTER `is_active`,
  ADD COLUMN `price_brl`   DECIMAL(10,2)        NULL                    AFTER `module_type`;

-- 2. Pacotes de módulos (desconto por quantidade)
CREATE TABLE IF NOT EXISTS `module_packages` (
  `id`          INT(11)        NOT NULL AUTO_INCREMENT,
  `quantity`    INT(11)        NOT NULL COMMENT 'Quantidade de módulos no pacote',
  `price_brl`   DECIMAL(10,2)  NOT NULL COMMENT 'Preço total do pacote em BRL',
  `description` VARCHAR(255)   NULL,
  `is_active`   TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_module_package_qty` (`quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Módulos adquiridos por usuário (módulos fixos)
CREATE TABLE IF NOT EXISTS `user_modules` (
  `id`           INT(11)  NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)  NOT NULL,
  `module_id`    INT(11)  NOT NULL,
  `order_id`     INT(11)  NULL,
  `purchased_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_module` (`user_id`,`module_id`),
  KEY `fk_um_user`   (`user_id`),
  KEY `fk_um_module` (`module_id`),
  CONSTRAINT `fk_um_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_um_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Pedidos de compra de módulos fixos
CREATE TABLE IF NOT EXISTS `module_orders` (
  `id`             INT(11)        NOT NULL AUTO_INCREMENT,
  `user_id`        INT(11)        NOT NULL,
  `module_ids`     TEXT           NOT NULL COMMENT 'JSON array com IDs dos módulos comprados',
  `quantity`       INT(11)        NOT NULL,
  `price_brl`      DECIMAL(10,2)  NOT NULL,
  `payment_method` VARCHAR(50)    NOT NULL,
  `status`         ENUM('completed','refunded','cancelled') NOT NULL DEFAULT 'completed',
  `created_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mo_user` (`user_id`),
  CONSTRAINT `fk_mo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Adiciona 'module_purchase' ao ENUM de coin_transactions
ALTER TABLE `coin_transactions`
  MODIFY COLUMN `type` ENUM('admin_credit','message_debit','chest_purchase','module_purchase') NOT NULL;

-- ============================================================
-- Reestruturação do Cadastro de Cliente (v3)
-- ============================================================

-- 6. Novos campos de perfil no usuário
ALTER TABLE `users`
  ADD COLUMN `initiatic_name` VARCHAR(255) NULL COMMENT 'Nome iniciático opcional (ex.: Zephyrion Arcturiano)' AFTER `full_name`,
  ADD COLUMN `birth_time`     VARCHAR(5)   NULL COMMENT 'Hora de nascimento no formato HH:MM'                  AFTER `birth_date`,
  ADD COLUMN `birth_country`  VARCHAR(100) NULL COMMENT 'País de nascimento'                                   AFTER `birth_time`,
  ADD COLUMN `birth_state`    VARCHAR(100) NULL COMMENT 'Estado/Província de nascimento'                       AFTER `birth_country`,
  ADD COLUMN `birth_city`     VARCHAR(100) NULL COMMENT 'Cidade de nascimento'                                 AFTER `birth_state`;

-- ============================================================
-- v5: Filhos (children) + child_id em sessions
-- ============================================================

-- Tabela de filhos dos clientes
CREATE TABLE IF NOT EXISTS `children` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `user_id`        INT          NOT NULL,
  `full_name`      VARCHAR(255) NOT NULL,
  `initiatic_name` VARCHAR(255) NULL DEFAULT NULL,
  `birth_date`     DATE         NULL DEFAULT NULL,
  `birth_time`     VARCHAR(5)   NULL DEFAULT NULL,
  `birth_country`  VARCHAR(100) NULL DEFAULT NULL,
  `birth_state`    VARCHAR(100) NULL DEFAULT NULL,
  `birth_city`     VARCHAR(100) NULL DEFAULT NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_children_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vincula sessão a um filho (NULL = sessão do próprio usuário)
ALTER TABLE `sessions`
  ADD COLUMN `child_id` INT NULL DEFAULT NULL AFTER `user_id`;

-- ============================================================
-- v6: Quantidade de módulos por usuário
-- ============================================================

-- Adiciona coluna de quantidade à tabela user_modules
-- (1 = padrão, pode ser incrementado por novas compras do mesmo módulo)
ALTER TABLE `user_modules`
  ADD COLUMN `quantity` INT NOT NULL DEFAULT 1 COMMENT 'Unidades adquiridas deste módulo' AFTER `module_id`;

-- ============================================================
-- v7: Configurações do site (logo e título do front-end agente)
-- ============================================================

CREATE TABLE IF NOT EXISTS `site_settings` (
  `key`        VARCHAR(64) NOT NULL,
  `value`      TEXT        NOT NULL DEFAULT '',
  `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `site_settings` (`key`, `value`) VALUES
  ('site_title', 'JORNADA AKASHA'),
  ('logo_svg',   ''),
  ('logo_url',   '');
