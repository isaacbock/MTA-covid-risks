
/*
 *  StationMap - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _metroData		-- Array with all metro stations of the MTA
 *  @param _covidData  		-- Array with all zip code COVID-19 rates
 *  @param _mapPosition   	-- Geographic center of NYC
 * 	@param _defaultOptions  -- Array of default display options
 */

StationMap = function(_parentElement, _metroData, _covidData, _mapPosition, _defaultOptions) {

	this.parentElement = _parentElement;
	this.metroData = _metroData;
	this.covidData = _covidData;
	this.mapPosition = _mapPosition;
	this.showStations = _defaultOptions[0];
	this.showLines = _defaultOptions[1];
	this.showCOVID = _defaultOptions[2];

	L.Icon.Default.imagePath = 'images/';

	this.initVis();
}


/*
 *  Initialize station map
 */

StationMap.prototype.initVis = function() {
	var vis = this;

	vis.allStations = [];
	vis.selectedStations = [];
	
	vis.map = L.map(vis.parentElement, {zoomControl: false}).setView(vis.mapPosition, 11);
	L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}{r}.{ext}', {
		attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		subdomains: 'abcd',
		minZoom: 11,
		maxZoom: 16,
		ext: 'png'
	}).addTo(vis.map);

	// Pane layers for filtering views
	vis.map.createPane('COVID');
	vis.map.createPane('lines');
	vis.map.createPane('stations');

	// Move zoom controller to bottom left corner
	L.control.zoom({
		position: 'bottomleft'
	}).addTo(vis.map);

	// MTA Subway Line Data via https://data.cityofnewyork.us/Transportation/Subway-Lines/3qz8-muuu
	$.getJSON("data/SubwayLines.geo.json", function(lineData) {
		// NYC Zip Codes via XXXXX
		$.getJSON("data/modzcta.geo.json", function(neighborhoodData) {
			vis.subwayLines = lineData;
			vis.modZCTA = neighborhoodData;
			vis.wrangleData();
		});
	});
}


/*
 *  Data wrangling
 */

StationMap.prototype.wrangleData = function() {
	var vis = this;

	// Currently no data wrangling/filtering needed
	// vis.displayData = vis.data;

	// Update the visualization
	vis.updateVis();

}


/*
 *  The drawing function
 */

StationMap.prototype.updateVis = function() {
	var vis = this;

	vis.metroData.forEach(station => {
		// Popup content
		let popupContent = "<strong>"+ station.name + "</strong><br/>";
		popupContent += station.tot + " visitors today";

		// Create custom icon (via https://www.geoapify.com/create-custom-map-marker-icon) based on number of passengers at each station
		// Currently <5k is low activity, <10k is medium activity, and >=10k is high activity
		let totalVisitors = station.tot;
		let icon;
		if (totalVisitors < 5000) {
			icon = L.divIcon({
				className: "station-marker low",
				iconSize: [10, 10],
				iconAnchor: [5, 5]
			});
		}
		else if (totalVisitors < 10000) {
			icon = L.divIcon({
				className: "station-marker medium",
				iconSize: [10, 10],
				iconAnchor: [5, 5]
			});
		}
		else {
			icon = L.divIcon({
				className: "station-marker high",
				iconSize: [10, 10],
				iconAnchor: [5, 5]
			});
		}
		
		// Plot markers
		let marker = L.marker([station.lat, station.long], { icon: icon, pane: 'stations'})
			// .bindPopup(popupContent)
			.bindTooltip(popupContent)
			.addTo(vis.map);
		marker.name = station.name;
		marker.latitude = station.lat;
		marker.longitude = station.long;
		marker.selected = false;
		marker.on('click', onStationClick);
		vis.allStations.push(marker);

		function onStationClick(e) {
			let station = e.target;
			// select station
			if (!station.selected) {
				station.selected = true;
				vis.selectedStations.push({name: station.name, latitude: station.latitude, longitude: station.longitude});
			}
			// else deselect station
			else {
				station.selected = false;
				vis.selectedStations = vis.selectedStations.filter(d => d.latitude!==station.latitude && d.longitude!==station.longitude);
			}
			// if some stations are selected, the rest should be somewhat desaturated for contrast
			if (vis.selectedStations.length!=0) {
				vis.allStations.forEach(station => {
					if (vis.selectedStations.some(d => d.name===station.name && d.latitude===station.latitude && d.longitude===station.longitude)) {
						$(station._icon).removeClass("unselected");
					}
					else {
						$(station._icon).addClass("unselected");
					}
				});
			}
			// else if no stations are selected, all should be displayed in full color
			else {
				vis.allStations.forEach(station => {
					$(station._icon).removeClass("unselected");
				});
			}
			selectStations(vis.selectedStations);
		}
	});

	// Scale markers on zoom, adapted from https://stackoverflow.com/a/46016693
	vis.map.on("zoomend", () => {
		if (vis.map.getZoom() > 15) {
			$('#station-map .station-marker').css({"width":40,"height":40, "margin-left":-20, "margin-top":-20}); 
		}
		else if (vis.map.getZoom() > 14) {
			$('#station-map .station-marker').css({"width":30,"height":30, "margin-left":-15, "margin-top":-15}); 
		}
		else if (vis.map.getZoom() > 11) {
			$('#station-map .station-marker').css({"width":16,"height":16, "margin-left":-8, "margin-top":-8}); 
		}
		else {
			$('#station-map .station-marker').css({"width":10,"height":10, "margin-left":-5, "margin-top":-5}); 
		}
		
	});

	// Add zip code overlays
	L.geoJson(vis.modZCTA, {
		style: styleZipCode,
		weight: 0,
		pane: "COVID"
	}).addTo(vis.map);
	// Color zip codes by covid rates
	function styleZipCode(feature) {
		let zipCode = feature.properties.MODZCTA;
		let lookupKey = "PCTPOS_" + zipCode;
		let covidRate = vis.covidData[lookupKey];
		
		if (covidRate >= 5) {
			return { fillColor: "#00308F", fillOpacity: .9, interactive: false };
		}
		else if (covidRate >= 4) {
			return { fillColor: "#0643A5", fillOpacity: .75, interactive: false };
		}
		else if (covidRate >= 3) {
			return { fillColor: "#0C56BC", fillOpacity: .6, interactive: false };
		}
		else if (covidRate >= 2) {
			return { fillColor: "#126AD2", fillOpacity: .45, interactive: false };
		}
		else if (covidRate >= 1) {
			return { fillColor: "#187DE9", fillOpacity: .2, interactive: false };
		}
		else {
			return { fillColor: "#1E90FF", fillOpacity: .1, interactive: false };
		}
	}

	// Add MTA lines
	L.geoJson(vis.subwayLines, {
		style: styleMBTALine,
		weight: 7,
		opacity: 1,
		pane: "lines"
	}).addTo(vis.map);
	// MTA line colors via http://web.mta.info/developers/resources/line_colors.htm
	function styleMBTALine(feature) {
		let station = feature.properties.name;
		if (station.includes("A") || station.includes("C") || station.includes("E")) {
			return { color: "#0039A6", interactive: false };
		}
		else if (station.includes("B") || station.includes("D") || station.includes("F") || station.includes("M")) {
			return { color: "#FF6319", interactive: false };
		}
		else if (station.includes("G")) {
			return { color: "#6CBE45", interactive: false };
		}
		else if (station.includes("J") || station.includes("Z")) {
			return { color: "#996633", interactive: false };
		}
		else if (station.includes("L")) {
			return { color: "#A7A9AC", interactive: false };
		}
		else if (station.includes("N") || station.includes("Q") || station.includes("R")) {
			return { color: "#FCCC0A", interactive: false };
		}
		else if (station.includes("S")) {
			return { color: "#808183", interactive: false };
		}
		else if (station.includes("1") || station.includes("2") || station.includes("3")) {
			return { color: "#EE352E", interactive: false };
		}
		else if (station.includes("4") || station.includes("5") || station.includes("6")) {
			return { color: "#00933C", interactive: false };
		}
		else if (station.includes("7")) {
			return { color: "#B933AD", interactive: false };
		}
	}

	vis.toggleLayers(vis.showStations, vis.showLines, vis.showCOVID);

}

/*
 *  Toggle layers
 *  @param _showStations  	-- Boolean to show or hide MTA stations
 *  @param _showLines   	-- Boolean to show or hide MTA lines
 * 	@param _showCOVID  		-- Boolean to show or hide COVID data by zip code
 */

StationMap.prototype.toggleLayers = function(_showStations, _showLines, _showCOVID) {
	var vis = this;

	if (_showStations) {
		vis.map.getPane('stations').style.display = "block";
	}
	else {
		vis.map.getPane('stations').style.display = "none";
	}
	if (_showLines) {
		vis.map.getPane('lines').style.display = "block";
	}
	else {
		vis.map.getPane('lines').style.display = "none";
	}
	if (_showCOVID) {
		vis.map.getPane('COVID').style.display = "block";
	}
	else {
		vis.map.getPane('COVID').style.display = "none";
	}
}