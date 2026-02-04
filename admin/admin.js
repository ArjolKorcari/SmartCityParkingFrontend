const API_PARKING = 'http://localhost:8080/api/parking';
const API_SPOTS = 'http://localhost:8080/api/parking-spots';

const map = L.map('map').setView([41.3275, 19.8187], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Layers
const parkingAreasLayer = new L.FeatureGroup();
const parkingSpotsLayer = new L.FeatureGroup();

map.addLayer(parkingAreasLayer);
map.addLayer(parkingSpotsLayer);

// Draw controls
const drawControl = new L.Control.Draw({
    draw: {
        polygon: true,
        marker: true, // parking spots
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false
    },
    edit: {
        featureGroup: parkingAreasLayer
    }
});

map.addControl(drawControl);

let drawnAreaGeometry = null;
let selectedSpotGeometry = null;
let selectedParkingAreaId = null;

// Handle drawing
map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;

    if (event.layerType === 'polygon') {
        parkingAreasLayer.addLayer(layer);
        drawnAreaGeometry = layer.toGeoJSON().geometry;
    }

    if (event.layerType === 'marker') {
        parkingSpotsLayer.addLayer(layer);
        selectedSpotGeometry = layer.toGeoJSON().geometry;
    }
});

// Save parking area
function saveParking() {
    if (!drawnAreaGeometry) {
        alert("❌ Draw a parking area first");
        return;
    }

    const parkingArea = {
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        totalCapacity: Number(document.getElementById('capacity').value),
        availableSpaces: Number(document.getElementById('available').value),
        pricePerHour: Number(document.getElementById('price').value),
        geometry: drawnAreaGeometry
    };

    fetch(API_PARKING, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(parkingArea)
    })
        .then(res => res.json())
        .then(data => {
            alert("✅ Parking Area Saved");
            drawnAreaGeometry = null;
            loadParkingAreas();
        })
        .catch(err => alert(err));
}

// Load parking areas from backend
function loadParkingAreas() {
    fetch(API_PARKING)
        .then(res => res.json())
        .then(data => {
            parkingAreasLayer.clearLayers();

            L.geoJSON(data, {
                onEachFeature: (feature, layer) => {
                    layer.on('click', () => {
                        selectedParkingAreaId = feature.properties.parkingAreaId;
                        document.getElementById('selectedArea').innerText =
                            `Selected Area ID: ${selectedParkingAreaId}`;
                        loadParkingSpots(selectedParkingAreaId);
                    });
                }
            }).addTo(parkingAreasLayer);
        });
}

// Save parking spot
function saveParkingSpot() {
    if (!selectedSpotGeometry || !selectedParkingAreaId) {
        alert("❌ Select parking area and draw a spot");
        return;
    }

    fetch(API_SPOTS, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            status: "available",
            parkingArea: {parkingAreaId: selectedParkingAreaId},
            geometry: selectedSpotGeometry
        })
    })
        .then(() => {
            alert("✅ Parking Spot Saved");
            selectedSpotGeometry = null;
            loadParkingSpots(selectedParkingAreaId);
        });
}

// Load spots for selected area
function loadParkingSpots(areaId) {
    parkingSpotsLayer.clearLayers();

    fetch(`${API_SPOTS}/area/${areaId}`)
        .then(res => res.json())
        .then(data => {
            L.geoJSON(data).addTo(parkingSpotsLayer);
        });
}

// Initial load
loadParkingAreas();
