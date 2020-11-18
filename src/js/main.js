
var allData = [];

// Variable for the visualization instance
var stationMap;

// Start application by loading the data
loadData();

function loadData() {

	// USE PRE-AGGREGATED DATA AS A STARTING POINT WHILE WE WORK ON OUR OWN DATA PROCESSING via https://qri.cloud/nyc-transit-data/turnstile_daily_counts_2020
	d3.csv("data/TEMORARY_AGGREGATE_STARTING_DATA.csv").then( data => {
		allData = data;
		// FOR NOW, ONLY USE THE MOST RECENT DATE (IN ORDER TO TEST AND SET UP THE MAIN MAP VISUALIZATION)
		allData = allData.filter( record => record.date=="2020-10-14");
		console.log(allData);
		createVis()
	});

}

// 

function createVis() {
	// Instantiate visualization
	stationMap = new StationMap("station-map", allData, [40.7500, -73.7800])
}
