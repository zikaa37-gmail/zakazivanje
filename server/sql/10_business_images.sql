-- ============================================
-- Table: business_images
-- Description: Galerija slika biznisa/lokacija
-- ============================================
CREATE TABLE IF NOT EXISTS business_images (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- References
    business_id INT NOT NULL,
    location_id INT NULL COMMENT 'NULL = slika je za ceo biznis, inače je za specifičnu lokaciju',
    -- Image Information
    url VARCHAR(255) NOT NULL COMMENT 'URL do slike (cloud storage)',
    caption VARCHAR(255) COMMENT 'Opis slike',
    display_order INT DEFAULT 0 COMMENT 'Redosled prikaza (0 = prva)',
    -- Status
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_business (business_id),
    INDEX idx_location (location_id),
    INDEX idx_order (display_order),
    INDEX idx_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- Galerija slika za prikaz na profilu biznisa
-- 
-- location_id NULL: Slika je generalna za biznis (prikazuje se na svim lokacijama)
-- location_id SET: Slika je specifična za tu lokaciju
-- 
-- display_order: Određuje redosled prikaza slika
-- is_active: Soft delete - nikad hard delete
-- 
-- Slike se čuvaju na cloud storage-u (npr. AWS S3, Cloudinary)
-- U bazi čuvamo samo URL