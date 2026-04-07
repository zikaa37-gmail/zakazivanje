-- ============================================
-- Table: appointments
-- Description: Zakazani termini
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    -- Primary Key
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- References
    business_id INT NOT NULL,
    location_id INT NOT NULL COMMENT 'Na kojoj lokaciji je zakazan termin',
    service_id INT NOT NULL,
    client_id INT NOT NULL,
    employee_id INT NULL COMMENT 'NULL = klijent nije izabrao specifičnog zaposlenog',
    -- Appointment Details
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL COMMENT 'Automatski izračunato: start_time + service.duration',
    -- Status
    STATUS ENUM(
        'pending',
        'confirmed',
        'cancelled',
        'completed',
        'no_show'
    ) NOT NULL DEFAULT 'pending',
    -- Notes
    client_notes TEXT COMMENT 'Napomene od klijenta',
    business_notes TEXT COMMENT 'Interne napomene biznisa',
    -- Cancellation
    cancelled_at TIMESTAMP NULL,
    cancelled_by ENUM('client', 'business', 'admin') NULL,
    cancellation_reason TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign Keys
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE
    SET
        NULL,
        -- Indexes
        INDEX idx_business (business_id),
        INDEX idx_location (location_id),
        INDEX idx_client (client_id),
        INDEX idx_employee (employee_id),
        INDEX idx_date (appointment_date),
        INDEX idx_status (STATUS),
        -- Spreči da se isti zaposleni zakaže u isto vreme
        UNIQUE INDEX idx_employee_time (employee_id, appointment_date, start_time)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Comments
-- ============================================
-- Status flow:
-- pending → confirmed → completed
--    ↓          ↓
-- cancelled  cancelled
--               ↓
--            no_show
-- 
-- pending: Termin je kreiran, čeka potvrdu biznisa
-- confirmed: Biznis je potvrdio termin
-- cancelled: Termin je otkazan (od strane klijenta ili biznisa)
-- completed: Termin je završen uspešno
-- no_show: Klijent se nije pojavio na termin
-- 
-- employee_id NULL: Klijent nije izabrao zaposlenog, biznis će dodeliti
-- end_time: Automatski se izračunava iz start_time + service.duration
-- 
-- UNIQUE constraint na (employee_id, appointment_date, start_time):
-- Spreči duplo zakazivanje istog zaposlenog u isto vreme