from flask import Flask, request, jsonify, render_template, g
import joblib
import numpy as np
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE = os.path.join('src', 'database', 'vehicle_monitoring.db')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    try:
        with app.app_context():
            db = get_db()
            schema_path = os.path.join('src', 'database', 'schema.sql')
            with app.open_resource(schema_path, mode='r') as f:
                db.cursor().executescript(f.read())
            db.commit()
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

def get_dashboard_stats():
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Get total vehicles count
        cursor.execute('SELECT COUNT(*) FROM predictions')
        total_vehicles = cursor.fetchone()[0]
        
        # Get normal loads count
        cursor.execute('SELECT COUNT(*) FROM predictions WHERE overloaded_status = "Normal"')
        normal_loads = cursor.fetchone()[0]
        
        # Get overloaded count
        cursor.execute('SELECT COUNT(*) FROM predictions WHERE overloaded_status = "Overloaded"')
        overloaded = cursor.fetchone()[0]
        
        # Get anomalies count
        cursor.execute('SELECT COUNT(*) FROM predictions WHERE anomaly_status = "Anomaly"')
        anomalies = cursor.fetchone()[0]
        
        # Get recent predictions
        cursor.execute('SELECT * FROM predictions ORDER BY timestamp DESC LIMIT 5')
        recent_predictions = cursor.fetchall()
        
        return {
            'total_vehicles': total_vehicles,
            'normal_loads': normal_loads,
            'overloaded': overloaded,
            'anomalies': anomalies,
            'recent_predictions': recent_predictions
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return {
            'total_vehicles': 0,
            'normal_loads': 0,
            'overloaded': 0,
            'anomalies': 0,
            'recent_predictions': []
        }

# Load models from src/models directory
try:
    model_dir = os.path.join('src', 'models')
    reg_model = joblib.load(os.path.join(model_dir, "regression_model.pkl"))
    anomaly_model = joblib.load(os.path.join(model_dir, "anomaly_detection_model.pkl"))
    logger.info("Models loaded successfully")
except Exception as e:
    logger.error(f"Error loading models: {str(e)}")
    raise

@app.route('/')
def index():
    try:
        stats = get_dashboard_stats()
        return render_template('index.html', **stats)
    except Exception as e:
        logger.error(f"Error rendering index: {str(e)}")
        return render_template('error.html', error=str(e))

@app.route('/predictions')
def view_predictions():
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM predictions ORDER BY timestamp DESC LIMIT 10')
        predictions = cursor.fetchall()
        return render_template('predictions.html', predictions=predictions)
    except Exception as e:
        logger.error(f"Error viewing predictions: {str(e)}")
        return render_template('error.html', error=str(e))

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Input validation
        required_fields = ["Speed", "Axle_Count", "Average_Axle_Load", 
                         "Suspension_Pressure", "Vehicle_Type", "Max_Load_Capacity"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
            if not isinstance(data[field], (int, float, str)):
                return jsonify({"error": f"Invalid data type for field: {field}"}), 400

        # Convert numeric fields with validation
        try:
            speed = float(data["Speed"])
            if speed < 0:
                return jsonify({"error": "Speed cannot be negative"}), 400
                
            axle_count = float(data["Axle_Count"])
            if axle_count <= 0:
                return jsonify({"error": "Axle count must be positive"}), 400
                
            avg_axle_load = float(data["Average_Axle_Load"])
            if avg_axle_load < 0:
                return jsonify({"error": "Average axle load cannot be negative"}), 400
                
            suspension_pressure = float(data["Suspension_Pressure"])
            if suspension_pressure < 0:
                return jsonify({"error": "Suspension pressure cannot be negative"}), 400
                
            max_load_capacity = float(data["Max_Load_Capacity"])
            if max_load_capacity <= 0:
                return jsonify({"error": "Max load capacity must be positive"}), 400
        except ValueError:
            return jsonify({"error": "Invalid numeric value provided"}), 400

        vehicle_type = data["Vehicle_Type"]
        vehicle_types = ["Bus", "Car", "SUV", "Truck", "Van"]
        if vehicle_type not in vehicle_types:
            return jsonify({"error": "Invalid vehicle type"}), 400

        # Prepare model input
        vehicle_encoded = [1 if vehicle_type == vt else 0 for vt in vehicle_types]
        speed_load_ratio = speed / (avg_axle_load * axle_count) if avg_axle_load * axle_count > 0 else 0

        model_input = np.array([
            axle_count, speed_load_ratio, avg_axle_load, speed, 
            suspension_pressure, *vehicle_encoded
        ]).reshape(1, -1)

        # Make predictions
        predicted_load = float(reg_model.predict(model_input)[0])
        overloaded = predicted_load > max_load_capacity
        anomaly = int(anomaly_model.predict(model_input)[0])
        anomaly_status = "Anomaly" if anomaly == -1 else "Normal"
        buzzer = overloaded or anomaly_status == "Anomaly"

        # Store prediction in database
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            INSERT INTO predictions (
                vehicle_type, speed, axle_count, avg_axle_load,
                suspension_pressure, max_load_capacity, predicted_load,
                overloaded_status, anomaly_status, buzzer_alert
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            vehicle_type, speed, axle_count, avg_axle_load,
            suspension_pressure, max_load_capacity, predicted_load,
            "Overloaded" if overloaded else "Normal",
            anomaly_status,
            "ON" if buzzer else "OFF"
        ))
        db.commit()

        return jsonify({
            "Predicted_Load": round(predicted_load, 2),
            "Overloaded_Status": "Overloaded" if overloaded else "Normal",
            "Anomaly_Status": anomaly_status,
            "Buzzer_Alert": "ON" if buzzer else "OFF"
        })
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('error.html', error="Page not found"), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('error.html', error="Internal server error"), 500

if __name__ == '__main__':
    init_db()  # Initialize database
    app.run(debug=True)
