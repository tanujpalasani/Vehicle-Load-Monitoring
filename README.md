# Vehicle Load Monitoring System

A web-based application for monitoring and predicting vehicle loads using machine learning models.

## Project Structure
```
vehicle-load-monitoring/
├── src/
│   ├── models/              # ML model files
│   │   ├── regression_model.pkl
│   │   └── anomaly_detection_model.pkl
│   └── database/           # Database files
│       ├── schema.sql
│       └── vehicle_monitoring.db
├── static/
│   ├── css/               # CSS stylesheets
│   │   └── style.css
│   └── js/               # JavaScript files
│       └── main.js
├── templates/            # HTML templates
│   ├── index.html
│   └── predictions.html
├── app.py               # Main Flask application
├── requirements.txt     # Python dependencies
└── README.md           # Project documentation
```

## Setup and Installation

1. Create a virtual environment:
```bash
python -m venv .venv
```

2. Activate the virtual environment:
- Windows:
```bash
.venv\Scripts\activate
```
- Unix/MacOS:
```bash
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python app.py
```

The application will be available at `http://127.0.0.1:5000`

## Features

- Real-time vehicle load prediction
- Anomaly detection
- Load status monitoring
- Historical prediction tracking
- Modern UI with animations
- Responsive design

## Technologies Used

- Python/Flask
- SQLite
- Machine Learning (Scikit-learn)
- HTML/CSS/JavaScript
- Bootstrap
- Font Awesome 