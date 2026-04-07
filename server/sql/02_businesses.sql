-- ============================================
-- Table: businesses
-- Description: Pravni entitet/firma (može više po vlasniku)
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Owner Reference
    owner_id INT NOT NULL,
    -- Business Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM(
        'hair_salon',
        'barber',
        'beauty_salon',
        'spa',
        'nail_salon',
        'massage',
        'tattoo',
        'dental',
        'fitness',
        'personal_trainer',
        'restaurant',
        'cafe',
        'medical',
        'other'
    ) NOT NULL,
    -- Legal Information (Serbia)
    pib VARCHAR(20) COMMENT 'PIB - Poreski identifikacioni broj',
    registration_number VARCHAR(50) COMMENT 'Matični broj firme',
    -- Contact Information
    business_phone VARCHAR(20),
    business_whatsapp VARCHAR(20) COMMENT 'WhatsApp broj biznisa za komunikaciju sa klijentima',
    business_email VARCHAR(255),
    website VARCHAR(255),
    -- Images
    logo VARCHAR(255) COMMENT 'URL do logo-a',
    cover_image VARCHAR(255) COMMENT 'URL do cover slike',
    -- Status & Approval
    is_approved BOOLEAN DEFAULT FALSE COMMENT 'Da li je admin odobrio biznis',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    -- Ratings (agregat iz reviews tabele)
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (
        rating >= 0
        AND rating <= 5
    ),
    review_count INT DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    approved_by INT NULL COMMENT 'Admin koji je odobrio',
    -- Foreign Keys
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE
    SET
        NULL,
        -- Indexes
        INDEX idx_owner (owner_id),
        INDEX idx_category (category),
        INDEX idx_approved (is_approved),
        INDEX idx_active (is_active),
        INDEX idx_rating (rating),
        FULLTEXT INDEX idx_search (name, description)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- is_approved: Admin mora odobriti svaki novi biznis pre nego što bude vidljiv
-- is_active: Soft delete - nikad hard delete
-- Jedan owner može imati više biznisa (User.hasMany(Business))