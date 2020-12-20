/*
 *  StationMap - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _metroData		-- Array with all metro stations of the MTA
 *  @param _daysOfWeek		-- Most recent seven days and their corresponding days of the week (as ints)
 *  @param _covidData  		-- Array with all zip code COVID-19 rates
 *  @param _neightborhoodData  	-- Neighborhood geoJSON features
 *  @param _lineData  		-- Line geoJSON features
 *  @param _mapPosition   	-- Geographic center of NYC
 * 	@param _defaultOptions  -- Array of default display options
 */

StationMap = function (
  _parentElement,
  _metroData,
  _daysOfWeek,
  _covidData,
  _neighborhoodData,
  _lineData,
  _mapPosition,
  _defaultOptions
) {
  this.parentElement = _parentElement;
  this.metroData = _metroData;
  this.daysOfWeek = _daysOfWeek;
  this.covidData = _covidData;
  this.neighborhoodData = _neighborhoodData;
  this.subwayLines = _lineData;
  this.mapPosition = _mapPosition;
  this.showStations = _defaultOptions[0];
  this.showLines = _defaultOptions[1];
  this.showCOVID = _defaultOptions[2];

  L.Icon.Default.imagePath = "images/";

  this.initVis();
};

/*
 *  Initialize station map
 */

StationMap.prototype.initVis = function () {
  var vis = this;

  vis.stationColorScale = d3
    .scaleLinear()
    .domain([0, 250, 500])
    .range(["rgb(0,255,0)", "rgb(255, 255, 0)", "rgb(255, 0, 0)"]);
  vis.covidColorScale = d3
    .scaleLinear()
    .domain([0, 7.5, 100])
    .range(["white", "rgb(0, 30, 130)", "rgb(0, 30, 130)"]);

  let stationStartingColor = vis.stationColorScale(
    vis.stationColorScale.domain()[0]
  );
  let stationMiddleColor = vis.stationColorScale(
    vis.stationColorScale.domain()[1]
  );
  let stationEndingColor = vis.stationColorScale(
    vis.stationColorScale.domain()[2]
  );
  $("#station-legend").css({
    background:
      "linear-gradient(to right, " +
      stationStartingColor +
      ", " +
      stationMiddleColor +
      ", " +
      stationEndingColor +
      ")",
  });

  let covidStartingColor = vis.covidColorScale(vis.covidColorScale.domain()[0]);
  let covidEndingColor = vis.covidColorScale(vis.covidColorScale.domain()[1]);
  $("#covid-legend").css({
    background:
      "linear-gradient(to right, " +
      covidStartingColor +
      ", " +
      covidEndingColor +
      ")",
  });

  vis.allStations = [];
  vis.selectedStations = [];
  vis.currentHourStrings = [
    "tot_12am",
    "tot_4am",
    "tot_8am",
    "tot_12pm",
    "tot_4pm",
    "tot_8pm",
  ];
  vis.currentHourStringsFull = [
    "12am - 4am",
    "4am - 8am",
    "8am - 12pm",
    "12pm - 4pm",
    "4pm - 8pm",
    "8pm - 12am",
  ];
  vis.weekdaysFull = [
    "Sundays",
    "Mondays",
    "Tuesdays",
    "Wednesdays",
    "Thursdays",
    "Fridays",
    "Saturdays",
  ];

  $("#station-map").html("");
  vis.map = L.map(vis.parentElement, { zoomControl: false }).setView(
    vis.mapPosition,
    11
  );
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      minZoom: 11,
      maxZoom: 16,
    }
  ).addTo(vis.map);

  // Pane layers for filtering views
  vis.map.createPane("COVID");
  vis.map.createPane("lines");
  vis.map.createPane("stations");

  // Move zoom controller to bottom left corner
  L.control
    .zoom({
      position: "bottomleft",
    })
    .addTo(vis.map);

  vis.wrangleData();
};

/*
 *  Data wrangling
 */

StationMap.prototype.wrangleData = function (currentDay, currentHour, options) {
  var vis = this;

  vis.currentDay = currentDay != undefined ? currentDay : 0;
  vis.currentHour = currentHour != undefined ? currentHour : 0;

  let currentDate = vis.daysOfWeek.find((d) => d.dayOfWeek == vis.currentDay);

  // Currently no data wrangling/filtering needed
  vis.displayData = vis.metroData.filter((d) => d.date == currentDate.date);

  vis.updateVis();
  if (options == "create") {
    vis.createVis();
  }
};

/*
 *  The drawing function
 */

StationMap.prototype.createVis = function () {
  var vis = this;

  vis.displayData.forEach((station) => {
    // Create custom icon (via https://www.geoapify.com/create-custom-map-marker-icon) based on number of passengers at each station
    let totalVisitors = station[vis.currentHourStrings[vis.currentHour]];
    let color = vis.stationColorScale(totalVisitors / 4);
    let style =
      "<div style= 'background-color:" +
      color +
      "; width:100%; height:100%; border-radius: 50%' />";
    let icon = L.divIcon({
      className: "station-marker",
      html: style,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    // Popup content
    let popupContent = "<strong>" + station.name + "</strong><br/>";
    popupContent +=
      totalVisitors +
      " visitors between <br>" +
      vis.currentHourStringsFull[vis.currentHour] +
      " on " +
      vis.weekdaysFull[vis.currentDay];

    // Plot markers
    let marker = L.marker([station.lat, station.long], {
      icon: icon,
      pane: "stations",
    })
      // .bindPopup(popupContent)
      .bindTooltip(popupContent)
      .addTo(vis.map);

    marker.name = station.name;
    marker.latitude = station.lat;
    marker.longitude = station.long;
    marker.id = station.id;
    marker.selected = false;
    marker.on("click", onStationClick);
    marker.on("mouseover", mouseover);
    marker.on("mouseout", mouseout);
    vis.allStations.push(marker);

    function onStationClick(e) {
      let station = e.target;
      // select station
      if (!station.selected) {
        station.selected = true;
        vis.selectedStations.push({
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          id: station.id,
        });
      }
      // else deselect station
      else {
        station.selected = false;
        vis.selectedStations = vis.selectedStations.filter(
          (d) =>
            d.latitude !== station.latitude && d.longitude !== station.longitude
        );
      }
      selectStations(vis.selectedStations);
    }

    function mouseover(e) {
      let station = e.target;
      $(station._icon).addClass("mouseover");
    }
    function mouseout(e) {
      let station = e.target;
      $(station._icon).removeClass("mouseover");
    }
  });

  // Scale markers on zoom, adapted from https://stackoverflow.com/a/46016693
  vis.map.on("zoomend", () => {
    vis.scaleMarkers(vis.map);
  });

  // Add zip code overlays
  L.geoJson(vis.neighborhoodData, {
    style: styleZipCode,
    weight: .5,
    pane: "COVID",
  }).addTo(vis.map);
  // Color zip codes by covid rates
  function styleZipCode(feature) {
    let zipCode = feature.properties.MODZCTA;
    let lookupKey = "PCTPOS_" + zipCode;
    let covidRate = vis.covidData[lookupKey];
    let color = vis.covidColorScale(covidRate);
    return {
      color: color,
      fillColor: color,
      colorOpacity: 1,
      fillOpacity: 0.9,
      interactive: false,
    };
  }

  // Add MTA lines
  L.geoJson(vis.subwayLines, {
    style: styleMBTALine,
    weight: 7,
    opacity: 1,
    pane: "lines",
  }).addTo(vis.map);
  // MTA line colors via http://web.mta.info/developers/resources/line_colors.htm
  function styleMBTALine(feature) {
    let station = feature.properties.name;
    if (
      station.includes("A") ||
      station.includes("C") ||
      station.includes("E")
    ) {
      return { color: "#0039A6", interactive: false };
    } else if (
      station.includes("B") ||
      station.includes("D") ||
      station.includes("F") ||
      station.includes("M")
    ) {
      return { color: "#FF6319", interactive: false };
    } else if (station.includes("G")) {
      return { color: "#6CBE45", interactive: false };
    } else if (station.includes("J") || station.includes("Z")) {
      return { color: "#996633", interactive: false };
    } else if (station.includes("L")) {
      return { color: "#A7A9AC", interactive: false };
    } else if (
      station.includes("N") ||
      station.includes("Q") ||
      station.includes("R")
    ) {
      return { color: "#FCCC0A", interactive: false };
    } else if (station.includes("S")) {
      return { color: "#808183", interactive: false };
    } else if (
      station.includes("1") ||
      station.includes("2") ||
      station.includes("3")
    ) {
      return { color: "#EE352E", interactive: false };
    } else if (
      station.includes("4") ||
      station.includes("5") ||
      station.includes("6")
    ) {
      return { color: "#00933C", interactive: false };
    } else if (station.includes("7")) {
      return { color: "#B933AD", interactive: false };
    }
  }

  vis.toggleLayers(vis.showStations, vis.showLines, vis.showCOVID);
};

/**
 * This function toggles a station state from being selected to opposite. Used in the search bar to toggle stations from external script.
 * @param {Object} station object as an element from vis.allStations
 */

StationMap.prototype.toggleStationSelect = function (station) {
  var vis = this;
  if (!station.selected) {
    station.selected = true;
    vis.selectedStations.push({
      name: station.name,
      latitude: station.latitude,
      longitude: station.longitude,
      id: station.id,
    });
  }
  // else deselect station
  else {
    station.selected = false;
    vis.selectedStations = vis.selectedStations.filter(
      (d) =>
        d.latitude !== station.latitude && d.longitude !== station.longitude
    );
  }
  selectStations(vis.selectedStations);
};

/*
 *  The drawing function
 */

StationMap.prototype.updateVis = function () {
  var vis = this;

  if (vis.allStations.length != 0) {
    vis.displayData.forEach((station) => {
      let marker = vis.allStations.find((d) => d.id == station.id);
      // console.log(marker)

      // Create custom icon (via https://www.geoapify.com/create-custom-map-marker-icon) based on number of passengers at each station
      let totalVisitors = station[vis.currentHourStrings[vis.currentHour]];
      let color = vis.stationColorScale(totalVisitors / 4);
      let style =
        "<div style= 'background-color:" +
        color +
        "; width:100%; height:100%; border-radius: 50%' />";
      let icon = L.divIcon({
        className: "station-marker",
        html: style,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      marker.setIcon(icon);

      // Popup content
      let popupContent = "<strong>" + station.name + "</strong><br/>";
      popupContent +=
        totalVisitors +
        " visitors between <br>" +
        vis.currentHourStringsFull[vis.currentHour] +
        " on " +
        vis.weekdaysFull[vis.currentDay];
      marker.setTooltipContent(popupContent);
    });
    vis.scaleMarkers(vis.map);
    vis.selectStations(vis.selectedStations);
  }
};

/*
 *  Toggle layers
 *  @param _showStations  	-- Boolean to show or hide MTA stations
 *  @param _showLines   	-- Boolean to show or hide MTA lines
 * 	@param _showCOVID  		-- Boolean to show or hide COVID data by zip code
 */

StationMap.prototype.toggleLayers = function (
  _showStations,
  _showLines,
  _showCOVID
) {
  var vis = this;

  if (_showStations) {
    vis.map.getPane("stations").style.display = "block";
  } else {
    vis.map.getPane("stations").style.display = "none";
  }
  if (_showLines) {
    vis.map.getPane("lines").style.display = "block";
  } else {
    vis.map.getPane("lines").style.display = "none";
  }
  if (_showCOVID) {
    vis.map.getPane("COVID").style.display = "block";
  } else {
    vis.map.getPane("COVID").style.display = "none";
  }
};

/*
 *  Select stations
 *  @param _stations  -- Stations to select
 */

StationMap.prototype.selectStations = function (_stations) {
  var vis = this;
  vis.selectedStations = _stations;
  // if some stations are selected, the rest should be somewhat desaturated for contrast
  if (vis.selectedStations.length != 0) {
    vis.allStations.forEach((station) => {
      if (vis.selectedStations.some(d => d.id === station.id)) {
		$(station._icon).removeClass("unselected");
		station.selected = true;
      } else {
		$(station._icon).addClass("unselected");
		station.selected = false;
      }
    });
  }
  // else if no stations are selected, all should be displayed in full color
  else {
    vis.allStations.forEach((station) => {
	  $(station._icon).removeClass("unselected");
	  station.selected = false;
    });
  }
};

/*
 *  Update data w/ refresh
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _metroData		-- Array with all metro stations of the MTA
 *  @param _daysOfWeek		-- Most recent seven days and their corresponding days of the week
 *  @param _covidData  		-- Array with all zip code COVID-19 rates
 *  @param _neightborhoodData  	-- Neighborhood geoJSON features
 *  @param _lineData  		-- Line geoJSON features
 *  @param _mapPosition   	-- Geographic center of NYC
 * 	@param _defaultOptions  -- Array of default display options
 */

StationMap.prototype.refresh = function (
  _parentElement,
  _metroData,
  _daysOfWeek,
  _covidData,
  _neighborhoodData,
  _lineData,
  _mapPosition,
  _defaultOptions
) {
  this.parentElement = _parentElement;
  this.metroData = _metroData;
  this.daysOfWeek = _daysOfWeek;
  this.covidData = _covidData;
  this.neighborhoodData = _neighborhoodData;
  this.subwayLines = _lineData;
  this.mapPosition = _mapPosition;
  this.showStations = _defaultOptions[0];
  this.showLines = _defaultOptions[1];
  this.showCOVID = _defaultOptions[2];

  this.wrangleData(0, 0, "create");
};

StationMap.prototype.scaleMarkers = function(map) {
  if (map!=undefined) {
    if (map.getZoom() > 15) {
      $("#station-map .station-marker").css({
        width: 40,
        height: 40,
        "margin-left": -20,
        "margin-top": -20,
      });
    } else if (map.getZoom() > 14) {
      $("#station-map .station-marker").css({
        width: 30,
        height: 30,
        "margin-left": -15,
        "margin-top": -15,
      });
    } else if (map.getZoom() > 11) {
      $("#station-map .station-marker").css({
        width: 16,
        height: 16,
        "margin-left": -8,
        "margin-top": -8,
      });
    } else {
      $("#station-map .station-marker").css({
        width: 10,
        height: 10,
        "margin-left": -5,
        "margin-top": -5,
      });
    }
  }
}