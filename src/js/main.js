
var metroData = [];
var covidData = [];

// Variable for the visualization instance
var stationMap;
var timeSelector;
var weeklyUsageChart;
// Default options
var showStations = true;
var showLines = false;
var showCOVID = true;

// Start application by loading the data
loadData();

function loadData() {

	// USE PRE-AGGREGATED DATA AS A STARTING POINT WHILE WE WORK ON OUR OWN DATA PROCESSING via https://qri.cloud/nyc-transit-data/turnstile_daily_counts_2020
	d3.csv("data/metro.csv").then( metroData => {
		d3.csv("data/percent-positive.csv").then( covidData => {
			self.metroData = metroData;
			self.covidData = covidData;
			
			//all metro dates data for weekly usage chart, append timezone for correct date encoding / decoding
			self.allMetroData = self.metroData.map( d => {
				d.date = d.date + " EST";
				return d;
			});

			console.log(self.allMetroData);
			// FOR NOW, ONLY USE THE MOST RECENT DATE (IN ORDER TO TEST AND SET UP THE MAIN MAP VISUALIZATION)
			self.metroData = self.metroData.filter( record => record.date=="2020-10-14 EST");
			self.covidData = self.covidData[covidData.length-1];
			
			createVis();
		});
	});

}

// 

function createVis() {
	// Instantiate visualization
	stationMap = new StationMap("station-map", metroData, covidData, [40.7350, -73.7800], [showStations, showLines, showCOVID]);
	weeklyUsageChart = new WeeklyUsageChart("weekly-usage", allMetroData, "2020-10-14 EST");
	timeSelector = new TimeSelector("time-overlay", [showStations, showLines, showCOVID]);
}

function toggleLayers(stations, lines, covid) {
	showStations = stations;
	showLines = lines;
	showCOVID = covid;
	stationMap.toggleLayers(showStations, showLines, showCOVID);
}

function selectStations(stations) {

	// update text label
	let stationsString = "All Stations";
	if (stations.length>0) {
		stationsString = "";
		stations.forEach(station => {
			stationsString += station;
			if (station!=stations[stations.length-1]) {
				stationsString += ", <br>";
			}
		});
	}
	$("#current-stations").html(stationsString);

	// TO-DO: update other visualizations
	if(stations.length >0){
		weeklyUsageChart.changeStation(stations);
	}
}
