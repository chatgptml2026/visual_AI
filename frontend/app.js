const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:5000"
  : "https://accessible-navigation-backend.onrender.com";

let map, marker, routeLine, destinationText = "";
let model;

// Speech
function speak(text) {
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// Voice input
function startListening() {
    const r = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    r.start();
    r.onresult = e => {
        destinationText = e.results[0][0].transcript;
        speak("Destination set");
    };
}

// Map
function initMap(lat, lon) {
    map = L.map('map').setView([lat, lon], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    marker = L.marker([lat, lon]).addTo(map);
}

// Obstacle detection
async function startObstacleDetection() {
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    model = await cocoSsd.load();

    setInterval(async () => {
        const predictions = await model.detect(video);
        predictions.forEach(p => {
            if (p.score > 0.6 && ["person","car"].includes(p.class)) {
                speak(p.class + " ahead");
            }
        });
    }, 2000);
}

// Navigation
async function startNavigation() {
    if (!destinationText) return speak("Say destination first");

    startObstacleDetection();

    navigator.geolocation.watchPosition(async pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!map) initMap(lat, lon);
        marker.setLatLng([lat, lon]);

        const geo = await fetch(BASE_URL + "/geocode", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ destination: destinationText })
        }).then(r=>r.json());

        const route = await fetch(BASE_URL + "/route", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
                origin:{ latitude:lat, longitude:lon },
                destination:geo
            })
        }).then(r=>r.json());

        if (routeLine) map.removeLayer(routeLine);

        const coords = route.geometry.map(c => [c[1], c[0]]);
        routeLine = L.polyline(coords).addTo(map);

    });
}
