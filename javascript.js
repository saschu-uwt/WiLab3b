var map = L.map('map').setView([47.25, -122.46], 12);
L.tileLayer('https://api.mapbox.com/styles/v1/saschu/ckl493xxy35s017qmc8gf09ei/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoic2FzY2h1IiwiYSI6ImNrZ3poNGVkYjA1b3Ayd3JzOHczb29iNjEifQ.MqXTIcUhZl4C-s0Jk5o49A', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    tileSize: 512,
    zoomOffset: -1,
}).addTo(map);

// mapbox://styles/saschu/ckl493xxy35s017qmc8gf09ei
// https://api.mapbox.com/styles/v1/saschu/ckl493xxy35s017qmc8gf09ei/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoic2FzY2h1IiwiYSI6ImNrZ3poNGVkYjA1b3Ayd3JzOHczb29iNjEifQ.MqXTIcUhZl4C-s0Jk5o49A


// Makes the layer (feature group) to draw to
var drawnItems = L.featureGroup().addTo(map);

// Creates a layer to display points and shapes from Carto database
var cartoData = L.layerGroup().addTo(map);
var url = "https://saschu.carto.com/api/v2/sql";
var urlGeoJSON = url + "?format=GeoJSON&q=";
var sqlQuery = "SELECT the_geom, description, name FROM lab_3b_steve";
function addPopup(feature, layer) {
    layer.bindPopup(
        "<b>" + feature.properties.name + "</b><br>" +
        feature.properties.description
    );
}
// Grabs the data from the Carto database, puts it into var cartData (defined above)
fetch(urlGeoJSON + sqlQuery)
    .then(function(response) {
    return response.json();
    })
    .then(function(data) {
        L.geoJSON(data, {onEachFeature: addPopup}).addTo(cartoData);
    });

// Makes the drawing tools
new L.Control.Draw({
    draw : {
        polygon : true,
        polyline : false,
        rectangle : false,     // Rectangles disabled
        circle : false,        // Circles disabled
        circlemarker : false,  // Circle markers disabled
        marker: true
    },
    edit : {
        featureGroup: drawnItems
    }
}).addTo(map);

// Add an HTML form that is also a popup
function createFormPopup() {
    var popupContent =
        '<form>' +
        'Title:<br><input type="text" id="input_title" value="Joe\'s Triangle"><br>' +
        'Description:<br><input type="text" id="input_desc" value="A stand of apple trees"><br><br>' +
        '<input type="button" value="Submit" id="submit">' +
        '</form>'
    drawnItems.bindPopup(popupContent).openPopup();
}

// Event listner that adds items drawn to the drawnItems layer so they don't immediately disappear. It also fires the HTML form popup from above.
map.addEventListener("draw:created", function(e) {
    e.layer.addTo(drawnItems);
    createFormPopup();
});

// Print data to the console
function setData(e) {

    if(e.target && e.target.id == "submit") {

        // Get user name and description
        var enteredUsername = document.getElementById("input_title").value;
        var enteredDescription = document.getElementById("input_desc").value;

// This first draft printed variables for drawings and data from popup to the console.
        // // Print user name and description
        // console.log(enteredUsername);
        // console.log(enteredDescription);
        //
        // // Get and print GeoJSON for each drawn layer
        // drawnItems.eachLayer(function(layer) {
        //     var drawing = JSON.stringify(layer.toGeoJSON().geometry);
        //     console.log(drawing);
        // });

// New version puts that information in the Carto database
        // For each drawn layer
        drawnItems.eachLayer(function(layer) {

        // First, create SQL expression to insert layer
        var drawing = JSON.stringify(layer.toGeoJSON().geometry);
        var sql =
            "INSERT INTO lab_3b_steve (the_geom, name, description) " +
            "VALUES (ST_SetSRID(ST_GeomFromGeoJSON('" +
            drawing + "'), 4326), '" +
            enteredUsername + "', '" +
            enteredDescription + "')";
        console.log(sql);

        // Second, send the data to the Carto SQL API
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "q=" + encodeURI(sql)
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log("Data saved:", data);
        })
        .catch(function(error) {
            console.log("Problem saving the data:", error);
        });

        // Finally, transfer submitted drawing to the CARTO layer so it persists on the map without you having to refresh the page
        var newData = layer.toGeoJSON();
        newData.properties.description = enteredDescription;
        newData.properties.name = enteredUsername;
        L.geoJSON(newData, {onEachFeature: addPopup}).addTo(cartoData);

        });

        // Clear drawn items layer
        drawnItems.closePopup();
        drawnItems.clearLayers();

    }
}

// Makes the setData function run
document.addEventListener("click", setData);

// Makes the popup HTML form go away when the user is editing the shape/line/point. Once the user is happy with their drawing, the popup will reappear.
map.addEventListener("draw:editstart", function(e) {
    drawnItems.closePopup();
});
map.addEventListener("draw:deletestart", function(e) {
    drawnItems.closePopup();
});
map.addEventListener("draw:editstop", function(e) {
    drawnItems.openPopup();
});
map.addEventListener("draw:deletestop", function(e) {
    if(drawnItems.getLayers().length > 0) {
        drawnItems.openPopup();
    }
});
