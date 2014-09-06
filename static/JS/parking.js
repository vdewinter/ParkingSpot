/*global Firebase, google, $, GeoFire    */
 
(function () {
    "use strict";
    var map, previousInfowindow, ref, center, radiusInKm,
        markers = {},
        lines = {};
    radiusInKm = 0.5;
    ref = new Firebase("https://publicdata-parking.firebaseio.com/san_francisco");
    center = [37.78565219391501, -122.4058404513338];
 
    function start() {
        var con, mag, continent, circleLoc, circle, circleOptions, geoFireGarages, geoFireStreets, geoQueryGarages, geoQueryStreets, myLatlng, previousInfowindow;
        map = new google.maps.Map(document.getElementById('map-canvas'), {zoom: 15});
 
        myLatlng = new google.maps.LatLng(center[0], center[1]);
        map.setCenter(myLatlng);
 
        geoFireGarages = new GeoFire(ref.child('garages/_geofire'));
        geoFireStreets = new GeoFire(ref.child('streets/_geofire'));
 
        geoQueryGarages = geoFireGarages.query({
            center: center,
            radius: radiusInKm
        });
 
        geoQueryStreets = geoFireStreets.query({
            center: center,
            radius: radiusInKm
        });
 
        circleOptions = {
            strokeColor: "#000000",
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: "#000000",
            fillOpacity: 0.1,
            map: map,
            center: myLatlng,
            radius: ((radiusInKm) * 1000),
            draggable: true
        };
 
        circle = new google.maps.Circle(circleOptions);
 
        geoQueryGarages.on("key_entered", function (id, location) {
            ref.child('garages/').child(id).once('value', function (snapshot) {
                var marker, infowindow, r, rate,
                    parking = snapshot.val(),
                    points = parking.points;
                if (points.length !== 4) {
                    if (!markers[points.toString()]) {
                        marker = new google.maps.Marker({
                            position: new google.maps.LatLng(points[0], points[1]),
                            map: map
                        });
 
                        google.maps.event.addListener(marker, 'click', function () {
                            var content = "<h2 style='width: 100%; margin: 0px; padding: 0px; float: left; clear: both;'>" + parking.friendlyName + "</h2>";
 
                            for (r = 0; r < parking.rates.length; r += 1) {
                                rate = parking.rates[r];
                                if (rate.BEG && rate.END) {
                                    content += rate.BEG + " - " + rate.END;
                                } else {
                                    content += rate.DESC;
                                }
 
                                if (rate.RATE !== "0") {
                                    content +=  "<b>: $" + rate.RATE + "</b><br />";
                                } else {
                                    content += "<b>: Free</b><br />";
                                }
                            }
 
                            infowindow = new google.maps.InfoWindow({
                                content: content
                            });
 
                            if (previousInfowindow) {
                                previousInfowindow.close();
                            }
                            infowindow.open(map, marker);
                            previousInfowindow = infowindow;
                        });
                        markers[points.toString()] = marker;
                    } else {
                        markers[points.toString()].setMap(map);
                    }
                    return;
                }
            });
        });
 
        geoQueryStreets.on("key_entered", function (id, location) {
            ref.child('streets/').child(id).once('value', function (snapshot) {
                var infowindow, coordinates, avgPrice, r, path,
                    parking = snapshot.val(),
                    points = parking.points;
 
                if (!lines[points.toString()]) {
                    coordinates = [
                        new google.maps.LatLng(points[0], points[1]),
                        new google.maps.LatLng(points[2], points[3])
                    ];
 
                    avgPrice = 0;
 
                    for (r = 0; r < parking.rates.length; r += 1) {
                        avgPrice += parseFloat(parking.rates[r].RATE);
                    }
 
                    avgPrice /= parking.rates.length;
                    avgPrice = Math.floor(avgPrice);
 
                    path = new google.maps.Polyline({
                        path: coordinates,
                        geodesic: true,
                        strokeColor: ['#1CC928', '#F79839', '#F76239'][avgPrice],
                        strokeOpacity: 1.0,
                        strokeWeight: 3
                    });
 
                    lines[points.toString()] = path;
 
                    google.maps.event.addListener(path, 'click', function () {
                        var rate, point,
                            content = "<h2 style='width: 100%; margin: 0px; padding: 0px; float: left; clear: both;'>" + parking.friendlyName + "</h2>";
 
                        for (r = 0; r < parking.rates.length; r += 1) {
                            rate = parking.rates[r];
                            if (rate.BEG && rate.END) {
                                content += rate.BEG + " - " + rate.END;
                            } else {
                                content += rate.DESC;
                            }
 
                            if (rate.RATE !== "0") {
                                content +=  "<b>: $" + rate.RATE + "</b><br />";
                            } else {
                                content += "<b>: Free</b><br />";
                            }
                        }
 
                        infowindow = new google.maps.InfoWindow({
                            content: content
                        });
 
                        if (previousInfowindow) {
                            previousInfowindow.close();
                        }
 
                        point = new google.maps.LatLng((points[0] + points[2]) / 2, (points[1] + points[3]) / 2);
 
                        infowindow.open(map);
                        infowindow.setPosition(point);
                        previousInfowindow = infowindow;
                    });
 
                    path.setMap(map);
                } else {
                    lines[points.toString()].setMap(map);
                }
            });
        });
 
        geoQueryGarages.on("key_exited", function (id, location) {
            ref.child('garages/').child(id).once('value', function (snapshot) {
                markers[snapshot.val().points.toString()].setMap(null);
            });
        });
 
        geoQueryStreets.on("key_exited", function (id, location) {
            ref.child('streets/').child(id).once('value', function (snapshot) {
                lines[snapshot.val().points.toString()].setMap(null);
            });
        });
 
        google.maps.event.addListener(circle, "drag", function (event) {
            var latLng = circle.getCenter();
 
            geoQueryStreets.updateCriteria({
                center: [latLng.lat(), latLng.lng()],
                radius: radiusInKm
            });
 
            geoQueryGarages.updateCriteria({
                center: [latLng.lat(), latLng.lng()],
                radius: radiusInKm
            });
        });
    }
 
    start();
}());