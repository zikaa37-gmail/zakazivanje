-- ============================================
-- Table: reviews
-- Description: Recenzije biznisa od strane klijenata
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- References
    business_id INT NOT NULL,
    location_id INT NULL COMMENT 'Recenzija za specifičnu lokaciju (opciono)',
    user_id INT NOT NULL COMMENT 'Klijent koji je ostavio recenziju',
    appointment_id INT NULL COMMENT 'Vezano za specifičan termin',
    -- Review Content
    rating INT NOT NULL CHECK (
        rating >= 1
        AND rating <= 5
    ),
    COMMENT TEXT,
    -- Business Response
    response TEXT NULL COMMENT 'Odgovor biznisa na recenziju',
    response_at TIMESTAMP NULL,
    response_by INT NULL COMMENT 'Ko je odgovorio (user_id)',
    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    is_reported BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE
    SET
        NULL,
        FOREIGN KEY (response_by) REFERENCES users(id) ON DELETE
    SET
        NULL,
        -- Indexes
        INDEX idx_business (business_id),
        INDEX idx_location (location_id),
        INDEX idx_user (user_id),
        INDEX idx_rating (rating),
        INDEX idx_approved (is_approved),
        INDEX idx_active (is_active),
        -- Jedna recenzija po terminu (ako je vezano za appointment)
        UNIQUE INDEX idx_appointment (appointment_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- rating: 1-5 zvezdica
-- appointment_id: Ako je recenzija nakon završenog termina
-- is_approved: Admin može da moderira recenzije
-- is_reported: Korisnici mogu da prijave neprikladne recenzije
-- is_active: Soft delete - nikad hard delete
-- 
-- Recenzija može biti:
-- 1. Vezana za specifičan termin (appointment_id NOT NULL)
-- 2. Opšta recenzija biznisa (appointment_id NULL)
-- 3. Recenzija specifične lokacije (location_id NOT NULL)
-- 
-- Response: Vlasnik biznisa može da odgovori na recenziju