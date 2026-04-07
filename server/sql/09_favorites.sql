-- ============================================
-- Table: favorites
-- Description: Omiljeni biznisi korisnika
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- References
    user_id INT NOT NULL,
    business_id INT NOT NULL,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_user (user_id),
    INDEX idx_business (business_id),
    -- Jedna kombinacija user + business (spreči duplikate)
    UNIQUE INDEX idx_user_business (user_id, business_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- Korisnici mogu da "favorituju" biznise radi lakšeg pristupa
-- 
-- Koristi se za:
-- - Brz pristup omiljenim salonima/restoranima
-- - Notifikacije o akcijama (opciono u budućnosti)
-- - Personalizovane preporuke
-- 
-- UNIQUE constraint: Korisnik može da dodaje isti biznis samo jednom