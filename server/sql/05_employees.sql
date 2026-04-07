-- ============================================
-- Table: employees
-- Description: Zaposleni u bizuisu (rade na lokacijama)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Business Reference
    business_id INT NOT NULL COMMENT 'Zaposleni pripadaju bizuisu',
    -- Location Reference (opciono - zaposleni može raditi na više lokacija)
    location_id INT NULL COMMENT 'Primarna lokacija zaposlenog (NULL = radi na svim lokacijama)',
    -- User Reference (opciono - ako zaposleni ima nalog na platformi)
    user_id INT NULL COMMENT 'Povezan user nalog ako zaposleni ima pristup platformi',
    -- Employee Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    avatar VARCHAR(255) COMMENT 'URL do profilne slike',
    position VARCHAR(100) COMMENT 'Pozicija/titula (npr. "Senior frizer", "Vlasnik")',
    -- Status
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    -- Working Hours (JSON)
    working_hours JSON COMMENT 'Radno vreme zaposlenog (može biti različito od radnog vremena lokacije)',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET
        NULL,
        -- Indexes
        INDEX idx_business (business_id),
        INDEX idx_location (location_id),
        INDEX idx_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- user_id: Ako zaposleni ima nalog, može da vidi svoje termine i upravlja njima
-- location_id: NULL znači da zaposleni radi na svim lokacijama biznisa
-- is_active: Soft delete - nikad hard delete
-- 
-- working_hours: Isti JSON format kao business_locations.working_hours
-- Može biti undefined/null što znači da koristi radno vreme lokacije