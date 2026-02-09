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
    let geometryToSave = drawnAreaGeometry;

    if (selectedParkingAreaId) {
        const selectedLayer = parkingAreasLayer.getLayers().find(layer => layer._parkingId === selectedParkingAreaId);
        if (selectedLayer) {
            geometryToSave = selectedLayer.toGeoJSON().geometry;
        }
    }

    if (!geometryToSave) {
        alert("❌ Draw or select a parking area first");
        return;
    }

    const parkingArea = {
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        totalCapacity: Number(document.getElementById('capacity').value),
        availableSpaces: Number(document.getElementById('available').value),
        pricePerHour: Number(document.getElementById('price').value),
        geometry: geometryToSave
    };

    let url = API_PARKING;
    let method = 'POST';
    let successMessage = "✅ Parking Area Saved";

    if (selectedParkingAreaId) {
        url = `${API_PARKING}/${selectedParkingAreaId}`;
        method = 'PUT';
        successMessage = "✅ Parking Area Updated";
    }

    fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(parkingArea)
    })
        .then(res => res.json())
        .then(data => {
            alert(successMessage);
            drawnAreaGeometry = null;
            loadParkingAreas();
        })
        .catch(err => alert(err));
}

// Delete parking area
function deleteParking() {
    if (!selectedParkingAreaId) {
        alert("❌ Select a parking area first");
        return;
    }

    if (!confirm("Are you sure you want to remove this parking area from view?")) {
        return;
    }

    // 🔥 Remove selected layer from map (frontend only)
    parkingAreasLayer.eachLayer(layer => {
        if (layer._parkingId === selectedParkingAreaId) {
            parkingAreasLayer.removeLayer(layer);
        }
    });

    // 🔥 Remove parking spots visually
    parkingSpotsLayer.clearLayers();

    // 🔥 Reset state
    selectedParkingAreaId = null;
    drawnAreaGeometry = null;
    selectedSpotGeometry = null;

    document.getElementById('selectedArea').innerText =
        "Selected Area ID: none";

    // Clear form
    document.getElementById('name').value = '';
    document.getElementById('type').value = 'public';
    document.getElementById('capacity').value = '';
    document.getElementById('available').value = '';
    document.getElementById('price').value = '';

    alert("🗑️ Parking area removed from map (frontend only)");
}



// Load parking areas from backend
function loadParkingAreas() {
    fetch(API_PARKING)
        .then(res => res.json())
        .then(data => {
            parkingAreasLayer.clearLayers();

            L.geoJSON(data, {
                onEachFeature: (feature, layer) => {
                    layer._parkingId = feature.properties.id;
                    layer.on('click', () => {
                        selectedParkingAreaId = feature.properties.id;
                        document.getElementById('selectedArea').innerText =
                            `Selected Area ID: ${selectedParkingAreaId}`;
                        // Populate form for editing
                        document.getElementById('name').value = feature.properties.name;
                        document.getElementById('type').value = feature.properties.type;
                        document.getElementById('capacity').value = feature.properties.totalCapacity;
                        document.getElementById('available').value = feature.properties.availableSpaces;
                        document.getElementById('price').value = feature.properties.pricePerHour;
                        // Set geometry for potential updates
                        drawnAreaGeometry = feature.geometry;
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
            parkingAreaId: selectedParkingAreaId,
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
// Load spots for selected parking area
function loadParkingSpots(areaId) {
    if (!areaId) return;

    // Clear existing spots
    parkingSpotsLayer.clearLayers();

    fetch(`${API_SPOTS}/area/${areaId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to load parking spots");
            }
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                return; // No spots for this area
            }

            // Convert backend response to GeoJSON FeatureCollection
            const geoJson = {
                type: "FeatureCollection",
                features: data
                    .filter(spot => spot.geometry) // safety check
                    .map(spot => ({
                        type: "Feature",
                        geometry: spot.geometry,
                        properties: {
                            spotId: spot.spotId,
                            status: spot.status
                        }
                    }))
            };

            L.geoJSON(geoJson, {
                pointToLayer: (feature, latlng) => {
                    return L.marker(latlng, {
                        title: `Spot ${feature.properties.spotId}`
                    });
                }
            }).addTo(parkingSpotsLayer);
        })
        .catch(err => {
            console.error("❌ Error loading parking spots:", err);
        });
}


// Initial load
loadParkingAreas();