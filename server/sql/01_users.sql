-- ============================================
-- Table: users
-- Description: Svi korisnici - autentifikacija
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    PASSWORD VARCHAR(255) NOT NULL COMMENT 'Hashed password (bcrypt)',
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) COMMENT 'Telefon za WhatsApp komunikaciju',
    whatsapp_number VARCHAR(20) COMMENT 'WhatsApp broj (može biti isti kao phone)',
    avatar VARCHAR(255) COMMENT 'URL do profilne slike',
    -- Role & Status
    role ENUM('client', 'provider', 'admin') NOT NULL DEFAULT 'client',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    preferred_communication ENUM('email', 'whatsapp', 'both') DEFAULT 'whatsapp',
    -- Email Verification
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires DATETIME,
    -- Password Reset
    password_reset_token VARCHAR(255),
    password_reset_expires DATETIME,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active),
    INDEX idx_phone (phone)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- role: client = obični korisnik koji zakazuje termine
--       provider = vlasnik biznisa (pružalac usluga)
--       admin = admin platforme
-- is_active: FALSE = soft delete (nikad ne brisati hard delete)
-- preferred_communication: kako korisnik želi da prima notifikacije
