-- ============================================================
-- DueMind Pro - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS duemind_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE duemind_pro;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           NOT NULL,
  title          VARCHAR(255)  NOT NULL,
  description    TEXT          DEFAULT NULL,
  category       VARCHAR(100)  DEFAULT 'General',
  priority       ENUM('Low','Medium','High')                       DEFAULT 'Medium',
  due_datetime   DATETIME      NOT NULL,
  status         ENUM('UPCOMING','DUE_SOON','OVERDUE','COMPLETED') DEFAULT 'UPCOMING',
  is_completed   TINYINT(1)    DEFAULT 0,
  recurring_type ENUM('None','Daily','Weekly','Monthly')           DEFAULT 'None',
  completed_at   TIMESTAMP     NULL DEFAULT NULL,
  snoozed_until  DATETIME      DEFAULT NULL,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_due_datetime (due_datetime),
  INDEX idx_is_completed (is_completed)
);

-- ============================================================
-- NOTIFICATION LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  task_id           INT         NOT NULL,
  user_id           INT         NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  sent_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_notification (task_id, notification_type),
  INDEX idx_task_id (task_id)
);