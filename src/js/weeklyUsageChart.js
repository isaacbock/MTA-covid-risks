/*
 *  StationMap - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _data            -- Array with all stations of the bike-sharing network
 *  @param endDate      -- String represents date of interest
 */

WeeklyUsageChart = function(_parentElement, _metroData, _endDate) {

	this.parentElement = _parentElement;
	this.metroData = _metroData;
	this.endDate = new Date(_endDate);
	this.startDate = getDateDaysAgo(this.endDate, 6);

	this.selectedStations = [];

	L.Icon.Default.imagePath = 'images/';

	this.initVis();
}

WeeklyUsageChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 20, left: 60 };

	vis.width = 400 - vis.margin.left - vis.margin.right,
    vis.height = 150 - vis.margin.top - vis.margin.bottom;

  	// SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
       	.append("g")
		.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
	
	// Initialize Scale
	vis.heightScale = d3.scaleLinear().range([vis.height, 10]);
	
	vis.wrangleData();
}

WeeklyUsageChart.prototype.wrangleData = function() {
	var vis = this;

	//filter data to dates of interest
	vis.filteredData = vis.metroData.filter(d => {
		const dateObj = new Date(d.date);
		return vis.startDate <= dateObj && dateObj <= vis.endDate;
	})

	//aggregate station usage by date and stations
	// {
	// 	yyyy-mm-dd EST: 
	//	{	
	//		date: Date object
	// 		total: 1000,
	// 		station1: 10,
	// 		station2: 25,
	// 		...
	// 	}
	//	...
	// }

	const aggregatedData = {};
	vis.filteredData.forEach(element => {
		const totalSofar = aggregatedData[element.date]?.total ? +aggregatedData[element.date]?.total : 0;
		const stationVisitors = +element.entries + +element.exits;
		aggregatedData[element.date] = {
			...aggregatedData[element.date],
			date: new Date(element.date),
			total: totalSofar + stationVisitors,
			[element.stop_name]: stationVisitors,
		}
	});
	
	// concert json to array for d3
	vis.aggregatedDataArray = [];
	Object.keys(aggregatedData).forEach(k => {
		vis.aggregatedDataArray.push(aggregatedData[k]);
	})

	// Set scale domain based on filtered data and station
	vis.setScaleDomain();

	// Update the visualization
	vis.updateVis();

}

WeeklyUsageChart.prototype.updateVis = function() {
	vis = this;

	var selection = vis.svg.selectAll("rect").data(vis.aggregatedDataArray);

	//constants for styling
	const barWidth = 30;
	const xOffset = 40;
	const color = "grey";

	//update
	selection
	.attr("width", barWidth)
	.attr("x", (d,i)=>i*xOffset)
	.attr("y", d => {
		return vis.height - vis.heightScale(vis.usageDataOfInterest(d));
	})
	.attr("fill", color)
	.attr("height", d => vis.heightScale(vis.usageDataOfInterest(d)));

	//enter 
	selection.enter().append("rect")
	.attr("width", barWidth)
	.attr("x", (_,i)=>i*xOffset)
	.attr("y", d => {
		return vis.height - vis.heightScale(vis.usageDataOfInterest(d));
	})
	.attr("fill", color)
	.attr("height", d => vis.heightScale(vis.usageDataOfInterest(d)));

	//exit
	selection.exit().remove();

	//TODO draw axis and labels

}

WeeklyUsageChart.prototype.changeStation = function(stations){
	this.selectedStations = stations;
	this.setScaleDomain();
	this.updateVis();
}

WeeklyUsageChart.prototype.setScaleDomain = function(){
	vis = this;

	this.heightScale.domain([
		d3.min(vis.aggregatedDataArray, d => vis.usageDataOfInterest(d)),
		d3.max(vis.aggregatedDataArray, d => vis.usageDataOfInterest(d))
	])
}

//get usage data of interest (all, or specific station's)
WeeklyUsageChart.prototype.usageDataOfInterest = function(d) {
	if(this.selectedStations.length === 0){
		return d.total;
	}
	let usage = 0;
	Object.keys(d).forEach(name => {
		if(this.selectedStations.includes(name)){
			usage += d[name];
		}
	})
	return usage;
}

