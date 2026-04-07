-- ============================================
-- Table: services
-- Description: Usluge koje biznis nudi
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Business Reference
    business_id INT NOT NULL COMMENT 'Usluge pripadaju bizuisu, dostupne na svim lokacijama',
    -- Service Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INT NOT NULL COMMENT 'Trajanje usluge u minutima',
    price DECIMAL(10, 2) NOT NULL COMMENT 'Cena usluge u RSD',
    -- Category (opciono za dodatno filtriranje)
    category VARCHAR(100) COMMENT 'Kategorija usluge (npr. "Šišanje", "Farbanje")',
    -- Status
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_business (business_id),
    INDEX idx_active (is_active),
    INDEX idx_category (category),
    INDEX idx_price (price)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- duration: Trajanje u minutima (npr. 30, 60, 90, 120)
-- price: U dinarima (RSD)
-- is_active: Soft delete - nikad hard delete
-- 
-- Primer podataka:
-- Frizerski salon "Lux"
-- - Šišanje muško: 30min, 1500 RSD
-- - Šišanje žensko: 60min, 3000 RSD
-- - Farbanje: 120min, 5000 RSD
-- - Feniranje: 30min, 1000 RSD