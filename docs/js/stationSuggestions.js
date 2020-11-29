
/*
 *  StationSuggestions - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the broad visualization
 *  @param _metroData		-- Array with all metro stations of the MTA
 */

StationSuggestions = function(_parentElement, _metroData) {

    this.parentElement = _parentElement;
    this.metroData = _metroData;
    // this.covidData = _covidData;

	this.initVis();
}


/*
 *  Initialize station suggestion component
 */

StationSuggestions.prototype.initVis = function() {
    var vis = this;

    // By default, no stations are selected
    vis.selectedStations = [];

    // $.getJSON("data/modzcta.geo.json", function(neighborhoodData) {
    //     vis.modZCTA = neighborhoodData;
    //     vis.wrangleData();
    // });

}


/*
 *  Data wrangling
 */

StationSuggestions.prototype.wrangleData = function(_selectedStations) {
    var vis = this;

    let maxDistanceMiles = .5;

    // if no stations selected, no recommendations can be made
	if (_selectedStations == undefined || _selectedStations.length == 0) {
        vis.stationSuggestions = "";
    }
    // else, determine which zip codes the selected stations are in (via Turf.js) and use only this data
    else {
        vis.selectedStations = _selectedStations;
        vis.nearbyStations = []

        // find nearby stations
        vis.metroData.forEach(station => {
            vis.selectedStations.forEach(selectedStation => {
                var from = turf.point([station.gtfs_longitude, station.gtfs_latitude]);
                var to = turf.point([selectedStation.longitude, selectedStation.latitude]);
                var options = {units: 'miles'};

                var distance = turf.distance(from, to, options);
                if (distance < maxDistanceMiles && !vis.selectedStations.some(d => d.name==station.stop_name)) {
                    // if new nearby station, add to nearby station array
                    if (!vis.nearbyStations.some(d => d.station==station.stop_name)) {
                        vis.nearbyStations.push({
                            station: station.stop_name, 
                            latitude: station.gtfs_latitude, 
                            longitude: station.gtfs_longitude, 
                            distance: distance,
                            originalStation: selectedStation.name,
                            originalLatitude: selectedStation.latitude,
                            originalLongitude: selectedStation.longitude
                        });
                    }
                    // else, station already exists: do not create new nearby station, and instead only update its data if this instance is closer
                    else {
                        let existingNearbyStation = vis.nearbyStations.find(d => d.station==station.stop_name);
                        if (distance < existingNearbyStation.distance) {
                            existingNearbyStation.distance = distance;
                            existingNearbyStation.latitude = station.gtfs_latitude;
                            existingNearbyStation.longitude = station.gtfs_longitude;
                        }
                    }
                }
            });
        });
        
        // get covid rate of each selected station and nearby station:

        // vis.modZCTA.features.forEach(region => {
        //     vis.selectedStations.forEach(station => {
        //         if (turf.booleanPointInPolygon([station.longitude, station.latitude], region)) {
        //             let zipCode = region.properties.MODZCTA;
        //             let lookupKey = "PCTPOS_" + zipCode;
        //             station.covidRate = parseFloat(vis.covidData[lookupKey]);
        //         }
        //     });
        //     vis.nearbyStations.forEach(station => {
        //         if (turf.booleanPointInPolygon([station.longitude, station.latitude], region)) {
        //             let zipCode = region.properties.MODZCTA;
        //             let lookupKey = "PCTPOS_" + zipCode;
        //             station.covidRate = parseFloat(vis.covidData[lookupKey]);
        //         }
        //     });
        // });
       
        // get metro rate of each selected station and nearby stations
        vis.metroData.forEach(station => {
            vis.selectedStations.forEach(selectedStation => {
                if (station.stop_name==selectedStation.name && station.gtfs_latitude==selectedStation.latitude && station.gtfs_longitude==selectedStation.longitude) {
                    selectedStation.trafficCount = parseInt(station.entries) + parseInt(station.exits);
                }
            });
            vis.nearbyStations.forEach(nearbyStation => {
                if (station.stop_name==nearbyStation.station && station.gtfs_latitude==nearbyStation.latitude && station.gtfs_longitude==nearbyStation.longitude) {
                    nearbyStation.trafficCount = parseInt(station.entries) + parseInt(station.exits);
                }
            });
        });

        // sort stations by distance
        vis.nearbyStations.sort((a, b) => (a.distance > b.distance) ? 1 : -1);

        // recommend safer stations
        vis.stationSuggestions = "";
        vis.nearbyStations.forEach(nearbyStation => {
            let originalStation = vis.selectedStations.find(d => {
                return d.name==nearbyStation.originalStation && d.latitude==nearbyStation.originalLatitude && d.longitude==nearbyStation.originalLongitude;
            });
            if (nearbyStation.trafficCount < originalStation.trafficCount) {
                vis.stationSuggestions += "ℹ " + nearbyStation.station + " (" + nearbyStation.distance.toFixed(2) + " mi away) has " + (100-(nearbyStation.trafficCount/originalStation.trafficCount*100).toFixed(0)) + "% less traffic. <br>";
            }
        });
    }

	// Update the visualization
	vis.updateVis();
}


/*
 *  The drawing function
 */

StationSuggestions.prototype.updateVis = function() {
    var vis = this;
    
    $("#station-suggestions").html(vis.stationSuggestions);

}