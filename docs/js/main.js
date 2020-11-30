
var metroDataDaily = [];
var covidData = [];

// Variable for the visualization instance
var stationMap;
var timeSelector;
var covidRisk;
var weeklyUsageChart;
var yearToDateUsageChart;
var stationSuggestions;

// Default options
var showStations = true;
var showLines = false;
var showCOVID = true;

// Hide visualizations until loaded
$("#time-overlay").hide();
$("#detail-overlay").hide();
// Begin displaying map even while data is still loading
stationMap = new StationMap("station-map", [], [], [40.7350, -73.7800], [showStations, showLines, showCOVID]);
// Start application by loading the data
loadData();

function loadData() {

	d3.json("data/metroDaily.json").then( metroDataDaily => {
		d3.csv("data/percent-positive.csv").then( covidData => {
			self.metroDataDaily = metroDataDaily;
			self.covidData = covidData;
			
			//all metro dates data for weekly usage chart, append timezone for correct date encoding / decoding
			self.allmetroDataDaily = self.metroDataDaily.map( d => {
				d.date = d.date + " EST";
				return d;
			});

			// FOR NOW, ONLY USE THE MOST RECENT DATE (IN ORDER TO TEST AND SET UP THE MAIN MAP VISUALIZATION)
			self.metroDataDaily = self.metroDataDaily.filter( record => record.date=="2020-11-27 EST");
			// Remove stations outside of NYC
			self.metroDataDaily = self.metroDataDaily.filter( record => record.station!="Newark Penn Station" && record.stop_name!="Harrison" && record.stop_name!="Journal Sq" && record.stop_name!="Grove St" && record.stop_name!="Pavonia/Newport" && record.stop_name!="Hoboken" && record.stop_name!="Exchange Pl");
			self.covidData = self.covidData[covidData.length-1];

			createVis();
		});
	});

}

function createVis() {
	// Instantiate visualization
	stationMap.refresh("station-map", metroDataDaily, covidData, [40.7350, -73.7800], [showStations, showLines, showCOVID]);
	weeklyUsageChart = new WeeklyUsageChart("weekly-usage", allmetroDataDaily, "2020-10-14 EST");
	timeSelector = new TimeSelector("time-overlay", [showStations, showLines, showCOVID]);
	yearToDateUsageChart = new YearToDateUsageChart("year-to-date-usage", allmetroDataDaily, "2020-11-27 EST");
	covidRisk = new CovidRisk("covid-risk", "positivity-rates", covidData);
	stationSuggestions = new StationSuggestions("station-suggestions", metroDataDaily);

	// Show visualization
	$("#time-overlay").fadeIn(1000);
	$("#detail-overlay").fadeIn(1000);
	$("#start-button").addClass("active").text("BEGIN").click(function() {
		$("#loading-screen").fadeOut(250);
	});
}

function toggleLayers(stations, lines, covid) {
	showStations = stations;
	showLines = lines;
	showCOVID = covid;
	stationMap.toggleLayers(showStations, showLines, showCOVID);
}

function selectStations(stations) {

	if (stations==undefined || stations.length==0) {
		$("#clear-button").removeClass("active");
	}
	else {
		$("#clear-button").addClass("active").click(function() {
			selectStations([]);
		});
	}

	// update text label
	let stationsString = "All Stations";
	if (stations.length>0) {
		stationsString = "";
		stations.forEach(station => {
			stationsString += station.name;
			if (station!=stations[stations.length-1]) {
				stationsString += ", ";
			}
		});
	}
	$("#current-stations").html(stationsString);

	// update other visualizations
	stationMap.selectStations(stations);
	covidRisk.wrangleData(stations);
	stationSuggestions.wrangleData(stations);
	weeklyUsageChart.changeSelectedStations(stations);
	yearToDateUsageChart.changeSelectedStations(stations);
}
