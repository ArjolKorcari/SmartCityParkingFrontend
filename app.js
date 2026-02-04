const API_URL = 'http://localhost:8080/api/parking';

const map = L.map('map').setView([41.3275, 19.8187], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let parkingLayer = L.geoJSON().addTo(map);

function colorByAvailability(feature) {
    return feature.properties.availableSpaces > 0 ? 'green' : 'red';
}

function renderGeoJson(data) {
    parkingLayer.clearLayers();

    parkingLayer = L.geoJSON(data, {
        style: feature => ({
            color: colorByAvailability(feature),
            fillOpacity: 0.5,
            weight: 2
        }),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;
            layer.bindPopup(`
                <b>${p.name}</b><br/>
                Type: ${p.type}<br/>
                Capacity: ${p.availableSpaces}/${p.totalCapacity}<br/>
                Price: €${p.pricePerHour}/hour
            `);
        }
    }).addTo(map);
}

function loadAll() {
    fetch(API_URL)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            return res.json();
        })
        .then(renderGeoJson)
        .catch(err => console.error('Fetch error:', err));
}

// Do the same for findNearby()

function findNearby() {
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        L.marker([lat, lng])
            .addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();

        fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=500`)
            .then(res => res.json())
            .then(renderGeoJson);
    });
}

// Load on startup
loadAll();
