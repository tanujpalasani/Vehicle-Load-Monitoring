CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    vehicle_type TEXT NOT NULL,
    speed FLOAT NOT NULL,
    axle_count FLOAT NOT NULL,
    avg_axle_load FLOAT NOT NULL,
    suspension_pressure FLOAT NOT NULL,
    max_load_capacity FLOAT NOT NULL,
    predicted_load FLOAT NOT NULL,
    overloaded_status TEXT NOT NULL,
    anomaly_status TEXT NOT NULL,
    buzzer_alert TEXT NOT NULL
); 