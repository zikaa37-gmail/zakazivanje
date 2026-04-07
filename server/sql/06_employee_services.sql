-- ============================================
-- Table: employee_services
-- Description: Many-to-Many veza između zaposlenih i usluga
-- ============================================
CREATE TABLE IF NOT EXISTS employee_services (
    -- Composite Primary Key
    employee_id INT NOT NULL,
    service_id INT NOT NULL,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Primary Key
    PRIMARY KEY (employee_id, service_id),
    -- Foreign Keys
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- Ova tabela definiše koje usluge svaki zaposleni može da obavlja
-- 
-- Primer:
-- Zaposleni "Marko Marković" može da radi:
--   - Šišanje muško
--   - Šišanje žensko
--   - Feniranje
-- 
-- Zaposleni "Ana Anić" može da radi:
--   - Farbanje
--   - Feniranje
--   - Balayage
-- 
-- Koristi se za filtriranje dostupnih termina i zaposlenih pri zakazivanju