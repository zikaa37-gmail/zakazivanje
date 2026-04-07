-- ============================================
-- Table: blocked_time_slots
-- Description: Blokirani/nedostupni termini (pauze, odmori, sastanci)
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_time_slots (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- References (jedan od ova tri mora biti postavljen)
    business_id INT NULL COMMENT 'Blokiranje za ceo biznis (sve lokacije)',
    location_id INT NULL COMMENT 'Blokiranje za specifičnu lokaciju',
    employee_id INT NULL COMMENT 'Blokiranje za specifičnog zaposlenog',
    -- Time Slot
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    -- Reason
    reason VARCHAR(255) COMMENT 'Razlog blokiranja (npr. "Godišnji odmor", "Sastanak")',
    -- Status
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Može se deaktivirati ako se planovi promene',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_business_date (business_id, date),
    INDEX idx_location_date (location_id, date),
    INDEX idx_employee_date (employee_id, date),
    INDEX idx_active (is_active),
    -- Provera: Bar jedno od ova tri polja mora biti postavljeno
    CHECK (
        (business_id IS NOT NULL)
        OR (location_id IS NOT NULL)
        OR (employee_id IS NOT NULL)
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- Koristi se za blokiranje nedostupnih termina:
-- 
-- 1. Nivo biznisa (business_id):
--    - Ceo biznis je zatvoren (praznik, renoviranje)
--    - Sve lokacije su nedostupne
-- 
-- 2. Nivo lokacije (location_id):
--    - Specifična lokacija je zatvorena
--    - Svi zaposleni na toj lokaciji su nedostupni
-- 
-- 3. Nivo zaposlenog (employee_id):
--    - Zaposleni je na pauzi za ručak (12:00-13:00)
--    - Zaposleni je na godišnjem odmoru
--    - Zaposleni ima sastanak/obavezu
-- 
-- is_active: Može se promeniti ako se planovi promene
-- 
-- Exempel:
-- - Pauza za ručak: 12:00-13:00 (svaki dan)
-- - Godišnji odmor: 01.08.2026 - 15.08.2026
-- - Sastanak: 14:00-15:00 (specifičan datum)