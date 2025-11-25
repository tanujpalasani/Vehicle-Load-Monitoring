// DOM Elements
const elements = {
    form: document.getElementById('vehicleForm'),
    results: document.getElementById('results'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    initialMessage: document.getElementById('initialMessage'),
    loadStatus: document.getElementById('loadStatus'),
    anomalyStatus: document.getElementById('anomalyStatus'),
    buzzerAlert: document.getElementById('buzzerAlert'),
    predictedLoad: document.getElementById('predictedLoad'),
    vehicleType: document.getElementById('vehicleType'),
    loadDistributionChart: document.getElementById('loadDistributionChart')
};

// Form submission handling
elements.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // Reset UI state
        hideElement(elements.results);
        hideElement(elements.initialMessage);
        showElement(elements.loadingSpinner);

        // Get and validate form data
        const formData = getFormData();
        validateFormData(formData);

        // Make API call
        const data = await submitPrediction(formData);
        
        // Update UI with results
        updateResults(data, formData.Max_Load_Capacity);

    } catch (error) {
        showError(error.message);
    } finally {
        hideElement(elements.loadingSpinner);
    }
});

// Get form data
function getFormData() {
    return {
        Vehicle_Type: elements.vehicleType.value,
        Speed: parseFloat(document.getElementById('speed').value),
        Axle_Count: parseFloat(document.getElementById('axleCount').value),
        Average_Axle_Load: parseFloat(document.getElementById('avgAxleLoad').value),
        Suspension_Pressure: parseFloat(document.getElementById('suspensionPressure').value),
        Max_Load_Capacity: parseFloat(document.getElementById('maxLoadCapacity').value)
    };
}

// Validate form data
function validateFormData(data) {
    for (const [key, value] of Object.entries(data)) {
        if (key !== 'Vehicle_Type' && (isNaN(value) || value <= 0)) {
            throw new Error(`Invalid value for ${key.replace(/_/g, ' ')}`);
        }
    }
}

// Submit prediction to API
async function submitPrediction(formData) {
    const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get prediction');
    }

    return data;
}

// Update results in UI
function updateResults(data, maxLoadCapacity) {
    // Clear previous chart
    const existingChart = Chart.getChart('loadDistributionChart');
    if (existingChart) {
        existingChart.destroy();
    }

    // Update status indicators
    updateStatusIndicator(elements.loadStatus, data.Overloaded_Status, 
        data.Overloaded_Status === 'Overloaded' ? 'danger' : 'success',
        data.Overloaded_Status === 'Overloaded' ? 'exclamation-triangle' : 'check-circle',
        'Load Status');

    updateStatusIndicator(elements.anomalyStatus, data.Anomaly_Status,
        data.Anomaly_Status === 'Anomaly' ? 'warning' : 'success',
        data.Anomaly_Status === 'Anomaly' ? 'exclamation-circle' : 'check-circle',
        'Anomaly Status');

    updateStatusIndicator(elements.buzzerAlert, data.Buzzer_Alert,
        data.Buzzer_Alert === 'ON' ? 'danger' : 'success',
        data.Buzzer_Alert === 'ON' ? 'bell' : 'bell-slash',
        'Buzzer Alert');

    // Update predicted load
    elements.predictedLoad.textContent = `${data.Predicted_Load.toFixed(2)} kg`;
    elements.predictedLoad.className = data.Overloaded_Status === 'Overloaded' ? 'text-danger' : 'text-success';

    // Initialize chart
    initializeChart(data.Predicted_Load, maxLoadCapacity);

    // Show results with animation
    showElement(elements.results);
    elements.results.classList.add('show');

    // Scroll to results on mobile
    if (window.innerWidth <= 768) {
        elements.results.scrollIntoView({ behavior: 'smooth' });
    }
}

// Update status indicator
function updateStatusIndicator(element, status, alertType, icon, label) {
    element.className = `alert alert-${alertType} fade-in`;
    element.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        <strong>${label}:</strong> ${status}
    `;
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger fade-in';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
    
    elements.results.innerHTML = '';
    elements.results.appendChild(errorDiv);
    showElement(elements.results);
}

// Utility functions
function hideElement(element) {
    if (element) element.style.display = 'none';
}

function showElement(element) {
    if (element) element.style.display = 'block';
}

// Form input validation
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value <= 0) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
    });
});

// Vehicle type selection validation
elements.vehicleType?.addEventListener('change', (e) => {
    if (e.target.value) {
        e.target.classList.remove('is-invalid');
        e.target.classList.add('is-valid');
    } else {
        e.target.classList.add('is-invalid');
        e.target.classList.remove('is-valid');
    }
});

// Add input animations
document.querySelectorAll('.form-control, .form-select').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('input-focused');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('input-focused');
    });
});

// Add smooth scroll to top after form submission
document.getElementById('vehicleForm').addEventListener('submit', function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const vehicleForm = document.getElementById('vehicleForm');
    const resultsDiv = document.getElementById('results');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const initialMessage = document.getElementById('initialMessage');
    const loadStatus = document.getElementById('loadStatus');
    const anomalyStatus = document.getElementById('anomalyStatus');
    const buzzerAlert = document.getElementById('buzzerAlert');
    const predictedLoad = document.getElementById('predictedLoad');
    let loadDistributionChart = null;

    if (vehicleForm) {
        vehicleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading spinner
            loadingSpinner.style.display = 'block';
            resultsDiv.style.display = 'none';
            initialMessage.style.display = 'none';

            // Get form data
            const formData = {
                Vehicle_Type: document.getElementById('vehicleType').value,
                Speed: parseFloat(document.getElementById('speed').value),
                Axle_Count: parseFloat(document.getElementById('axleCount').value),
                Average_Axle_Load: parseFloat(document.getElementById('avgAxleLoad').value),
                Suspension_Pressure: parseFloat(document.getElementById('suspensionPressure').value),
                Max_Load_Capacity: parseFloat(document.getElementById('maxLoadCapacity').value)
            };

            try {
                const response = await fetch('/predict', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    // Update results
                    loadStatus.className = `alert ${data.Overloaded_Status === 'Overloaded' ? 'alert-danger' : 'alert-success'}`;
                    loadStatus.innerHTML = `<i class="fas fa-${data.Overloaded_Status === 'Overloaded' ? 'exclamation-triangle' : 'check-circle'} me-2"></i>${data.Overloaded_Status}`;

                    anomalyStatus.className = `alert ${data.Anomaly_Status === 'Anomaly' ? 'alert-warning' : 'alert-success'}`;
                    anomalyStatus.innerHTML = `<i class="fas fa-${data.Anomaly_Status === 'Anomaly' ? 'exclamation-triangle' : 'check-circle'} me-2"></i>${data.Anomaly_Status}`;

                    buzzerAlert.className = `alert ${data.Buzzer_Alert === 'ON' ? 'alert-danger' : 'alert-success'}`;
                    buzzerAlert.innerHTML = `<i class="fas fa-bell${data.Buzzer_Alert === 'OFF' ? '-slash' : ''} me-2"></i>Buzzer Alert: ${data.Buzzer_Alert}`;

                    predictedLoad.textContent = `${data.Predicted_Load.toFixed(2)} kg`;

                    // Update or create chart
                    updateLoadDistributionChart(data.Predicted_Load, formData.Max_Load_Capacity);

                    // Show results
                    resultsDiv.style.display = 'block';
                } else {
                    throw new Error(data.error || 'Prediction failed');
                }
            } catch (error) {
                // Show error message
                loadStatus.className = 'alert alert-danger';
                loadStatus.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}`;
                resultsDiv.style.display = 'block';
            } finally {
                loadingSpinner.style.display = 'none';
            }
        });
    }

    function updateLoadDistributionChart(predictedLoad, maxCapacity) {
        const ctx = document.getElementById('loadDistributionChart');
        
        if (loadDistributionChart) {
            loadDistributionChart.destroy();
        }

        loadDistributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Current Load', 'Max Capacity'],
                datasets: [{
                    label: 'Load Distribution (kg)',
                    data: [predictedLoad, maxCapacity],
                    backgroundColor: [
                        predictedLoad > maxCapacity ? 'rgba(255, 99, 132, 0.5)' : 'rgba(75, 192, 192, 0.5)',
                        'rgba(54, 162, 235, 0.5)'
                    ],
                    borderColor: [
                        predictedLoad > maxCapacity ? 'rgb(255, 99, 132)' : 'rgb(75, 192, 192)',
                        'rgb(54, 162, 235)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Load (kg)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Load Distribution Analysis'
                    }
                }
            }
        });
    }

    // Sidebar Toggle Functionality
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
    }
}); 