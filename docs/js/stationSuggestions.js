
/*
 *  StationSuggestions - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the broad visualization
 *  @param _metroData		-- Array with all metro stations of the MTA
 */

StationSuggestions = function(_parentElement, _metroData) {

    this.parentElement = _parentElement;
    this.metroData = _metroData;

	this.initVis();
}


/*
 *  Initialize station suggestion component
 */

StationSuggestions.prototype.initVis = function() {
    var vis = this;

    vis.hourBlocks = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];

    // By default, no stations are selected
    vis.selectedStations = [];

}


/*
 *  Data wrangling
 */

StationSuggestions.prototype.wrangleData = function(currentDay, currentHourBlock) {
    var vis = this;
    let maxDistanceMiles = .5;

    if (currentDay != undefined && currentHourBlock != undefined) {
        vis.currentDay = currentDay;
		vis.currentHourBlock = currentHourBlock;
    }

    // if no stations selected, no recommendations can be made
	if (vis.selectedStations == undefined || vis.selectedStations.length == 0) {
        $("#station-suggestions").empty();
    }
    // else, determine which zip codes the selected stations are in (via Turf.js) and use only this data
    else {
        vis.nearbyStations = []

         // filter to current day
        vis.filteredData = vis.metroData.filter(d => (new Date(d.date).getDay()==vis.currentDay));

        // find nearby stations
        vis.filteredData.forEach(station => {
            vis.selectedStations.forEach(selectedStation => {
                var from = turf.point([station.long, station.lat]);
                var to = turf.point([selectedStation.longitude, selectedStation.latitude]);
                var options = {units: 'miles'};

                var distance = turf.distance(from, to, options);
                if (distance < maxDistanceMiles && !vis.selectedStations.some(d => d.name==station.name)) {
                    // if new nearby station, add to nearby station array
                    if (!vis.nearbyStations.some(d => d.station==station.name)) {
                        vis.nearbyStations.push({
                            station: station.name, 
                            latitude: station.lat, 
                            longitude: station.long,
                            id: station.id, 
                            distance: distance,
                            originalStation: selectedStation.name,
                            originalLatitude: selectedStation.latitude,
                            originalLongitude: selectedStation.longitude,
                            originalID: selectedStation.id
                        });
                    }
                    // else, station already exists: do not create new nearby station, and instead only update its data if this instance is closer
                    else {
                        let existingNearbyStation = vis.nearbyStations.find(d => d.station==station.name);
                        if (distance < existingNearbyStation.distance) {
                            existingNearbyStation.distance = distance;
                            existingNearbyStation.latitude = station.lat;
                            existingNearbyStation.longitude = station.long;
                        }
                    }
                }
            });
        });
       
        // get metro rate of each selected station and nearby stations
        vis.filteredData.forEach(station => {
            vis.selectedStations.forEach(selectedStation => {
                if (station.name==selectedStation.name && station.lat==selectedStation.latitude && station.long==selectedStation.longitude) {
                    selectedStation.trafficCount = station["tot_"+vis.hourBlocks[vis.currentHourBlock]];
                }
            });
            vis.nearbyStations.forEach(nearbyStation => {
                if (station.name==nearbyStation.station && station.lat==nearbyStation.latitude && station.long==nearbyStation.longitude) {
                    nearbyStation.trafficCount = station["tot_"+vis.hourBlocks[vis.currentHourBlock]];
                }
            });
        });

        // sort stations by distance
        vis.nearbyStations.sort((a, b) => (a.distance > b.distance) ? 1 : -1);

        // recommend safer stations
        $("#station-suggestions").empty();
        vis.nearbyStations.forEach(nearbyStation => {
            let originalStation = vis.selectedStations.find(d => {
                return d.name==nearbyStation.originalStation && d.latitude==nearbyStation.originalLatitude && d.longitude==nearbyStation.originalLongitude;
            });
            if (nearbyStation.trafficCount < originalStation.trafficCount) {
                let content = "ℹ " + nearbyStation.station + " (" + nearbyStation.distance.toFixed(2) + " mi away) has " + (100-(nearbyStation.trafficCount/originalStation.trafficCount*100).toFixed(0)) + "% less traffic.";
                let data = {
                    id: nearbyStation.id,
                    latitude: nearbyStation.latitude,
                    longitude: nearbyStation.longitude,
                    name: nearbyStation.station,
                    trafficCount: nearbyStation.trafficCount
                };
                let recommendation = $("<p></p>").text(content).data("data", data).data("originalStationID", originalStation.id).hover(
                    function() {
                        let thisStation = $(this);
                        let clickToReplace = $("<span></span>").text("(Click to Replace)").attr("id", "clickToReplace");
                        recommendation.append(clickToReplace);
                        $("#station-suggestions > p").addClass("unselected");
                        thisStation.removeClass("unselected");
                        let alternativeStation = thisStation.data("data");
                        vis.alternativeSelection = vis.selectedStations.map(function(station) { 
                            return station.id == thisStation.data("originalStationID") ? alternativeStation : station; 
                        });
                        highlightStations(vis.alternativeSelection);

                    }, function() {
                        $("#station-suggestions > p").removeClass("unselected");
                        $("#clickToReplace").remove();
                        highlightStations(vis.selectedStations);
                    }
                ).click(function() {
                    selectStations(vis.alternativeSelection);
                });
                $("#station-suggestions").append(recommendation);
            }
        });
    }
}

StationSuggestions.prototype.changeSelectedStations = function(stations){
	this.selectedStations = stations;
	this.wrangleData();
}