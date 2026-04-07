-- ============================================
-- Table: business_locations
-- Description: Fizičke lokacije biznisa (može više po bizuisu)
-- ============================================
CREATE TABLE IF NOT EXISTS business_locations (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Business Reference
    business_id INT NOT NULL,
    -- Location Information
    name VARCHAR(255) NOT NULL COMMENT 'Naziv lokacije (npr. "Salon Vračar", "Salon Novi Sad")',
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Serbia',
    postal_code VARCHAR(20),
    -- Geolocation
    lat DECIMAL(10, 8) COMMENT 'Geografska širina',
    lng DECIMAL(11, 8) COMMENT 'Geografska dužina',
    -- Contact (specifično za lokaciju)
    location_phone VARCHAR(20),
    location_whatsapp VARCHAR(20) COMMENT 'WhatsApp broj specifičan za lokaciju',
    -- Working Hours (JSON)
    working_hours JSON COMMENT 'Radno vreme lokacije po danima',
    -- Status
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    is_primary BOOLEAN DEFAULT FALSE COMMENT 'Da li je ovo glavna lokacija',
    -- Statistics (agregat)
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (
        rating >= 0
        AND rating <= 5
    ),
    review_count INT DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_business (business_id),
    INDEX idx_city (city),
    INDEX idx_active (is_active),
    INDEX idx_location (lat, lng),
    FULLTEXT INDEX idx_search (name, address, city)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- working_hours JSON format:
-- {
--   "monday": { "open": "08:00", "close": "20:00", "closed": false },
--   "tuesday": { "open": "08:00", "close": "20:00", "closed": false },
--   "wednesday": { "open": "08:00", "close": "20:00", "closed": false },
--   "thursday": { "open": "08:00", "close": "20:00", "closed": false },
--   "friday": { "open": "08:00", "close": "20:00", "closed": false },
--   "saturday": { "open": "09:00", "close": "18:00", "closed": false },
--   "sunday": { "open": null, "close": null, "closed": true }
-- }
-- 
-- is_primary: Prva kreirana lokacija biznisa
-- is_active: Soft delete - nikad hard delete
-- Jedan biznis može imati više lokacija (Business.hasMany(BusinessLocation))