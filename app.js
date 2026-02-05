const API_URL = 'http://localhost:8080/api/parking';

// Map
const map = L.map('map', {
    zoomControl: false
}).setView([41.3275, 19.8187], 13);

// Tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Layers
const parkingLayer = L.featureGroup().addTo(map);
let userMarker = null;

// ---------- COLOR BY CAPACITY ----------
function getColor(available, total) {
    if (!total || total === 0) return '#6b7280';

    const ratio = available / total;

    if (ratio > 0.5) return '#22c55e'; // green
    if (ratio > 0.2) return '#facc15'; // yellow
    if (ratio > 0)   return '#ef4444'; // red

    return '#6b7280';
}

// ---------- RENDER PARKING ----------
function renderParking(data) {
    parkingLayer.clearLayers();

    const geo = L.geoJSON(data, {
        style: f => ({
            color: '#111827',
            weight: 1,
            fillColor: getColor(
                f.properties.availableSpaces,
                f.properties.totalCapacity
            ),
            fillOpacity: 0.75
        }),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;
            layer.bindPopup(`
                <strong>${p.name}</strong><br/>
                Type: ${p.type}<br/>
                Available: <b>${p.availableSpaces}</b> / ${p.totalCapacity}<br/>
                Price: €${p.pricePerHour}/h
            `);
        }
    });

    geo.addTo(parkingLayer);
}

// ---------- LOAD ALL ----------
function loadAll() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            renderParking(data);
            map.flyTo([41.3275, 19.8187], 13, {
                duration: 1.5
            });
        });
}

// ---------- DRIVING EFFECT ----------
function driveToLocation(lat, lng) {
    map.flyTo([lat, lng], 16, {
        duration: 2.2,
        easeLinearity: 0.25
    });
}

// ---------- NEARBY ----------
function findNearby() {
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (userMarker) map.removeLayer(userMarker);

        userMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 1
        })
        .addTo(map)
        .bindPopup("📍 You are here");

        // 🚗 DRIVE EFFECT
        driveToLocation(lat, lng);

        fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=500`)
            .then(res => res.json())
            .then(renderParking);

    }, () => alert("Location permission denied"));
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
