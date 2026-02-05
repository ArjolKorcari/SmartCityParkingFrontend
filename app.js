const API_URL = 'http://localhost:8080/api/parking';

// Map
const map = L.map('map').setView([41.3275, 19.8187], 13);

// Tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Layer (DO NOT recreate this)
const parkingLayer = L.featureGroup().addTo(map);

// ---------- COLOR LOGIC ----------
function getColorByCapacity(available, total) {
    if (!total || total === 0) return '#6b7280'; // gray

    const ratio = available / total;

    if (ratio > 0.5) return '#22c55e'; // green
    if (ratio > 0.2) return '#facc15'; // yellow
    if (ratio > 0)   return '#ef4444'; // red

    return '#6b7280'; // full
}

// ---------- RENDER ----------
function renderParking(data) {
    parkingLayer.clearLayers();

    L.geoJSON(data, {
        style: feature => {
            const p = feature.properties;
            return {
                color: '#111827',
                weight: 1,
                fillColor: getColorByCapacity(
                    p.availableSpaces,
                    p.totalCapacity
                ),
                fillOpacity: 0.75
            };
        },
        onEachFeature: (feature, layer) => {
            const p = feature.properties;

            layer.bindPopup(`
                <strong>${p.name}</strong><br/>
                Type: ${p.type}<br/>
                Available: <b>${p.availableSpaces}</b> / ${p.totalCapacity}<br/>
                Price: €${p.pricePerHour}/h
            `);
        }
    }).addTo(parkingLayer);
}

// ---------- LOAD ALL ----------
function loadAll() {
    fetch(API_URL)
        .then(res => res.json())
        .then(renderParking)
        .catch(err => console.error(err));
}

// ---------- NEARBY ----------
let userMarker = null;

function findNearby() {
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (userMarker) map.removeLayer(userMarker);

        userMarker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();

        map.setView([lat, lng], 15);

        fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=500`)
            .then(res => res.json())
            .then(renderParking);
    }, () => alert("Location access denied"));
}

// ---------- LEGEND ----------
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <h4>Availability</h4>
        <div><span style="background:#22c55e"></span> Plenty</div>
        <div><span style="background:#facc15"></span> Limited</div>
        <div><span style="background:#ef4444"></span> Almost full</div>
        <div><span style="background:#6b7280"></span> Full</div>
    `;
    return div;
};

legend.addTo(map);

// Initial load
loadAll();
