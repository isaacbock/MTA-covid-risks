/*
 *  StationMap - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _data            -- Array with all stations of the bike-sharing network
 *  @param endDate      	-- String represents date of interest
 */

YearToDateUsageChart = function(_parentElement, _metroData, _endDate) {

	this.parentElement = _parentElement;
	this.metroData = _metroData;
	this.endDate = new Date(_endDate);

	this.selectedStations = [];

	L.Icon.Default.imagePath = 'images/';

	this.initVis();
}

YearToDateUsageChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 40, left: 60 };

	vis.width = 400 - vis.margin.left - vis.margin.right,
    vis.height = 150 - vis.margin.top - vis.margin.bottom;

  	// SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
       	.append("g")
		.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")

	// Initialize Scales and Axex
	vis.heightScale = d3.scaleLinear().range([vis.height, 0]);
	vis.xScale = d3.scaleTime().range([0, vis.width]);

	vis.xAxis = d3.axisBottom().tickFormat(d3.timeFormat("%m-%d")).ticks(7);
	vis.yAxis = d3.axisLeft().ticks(4).tickFormat(d3.formatPrefix(".1", 1e3));
	
	// Area and Path
	vis.path = vis.svg.append("path")
		.attr("class", "area");

	vis.area = d3.area()
	.x(d => vis.xScale(d.date))
	.y0(vis.height)
	.y1(d => vis.heightScale(vis.usageDataOfInterest(d)))

	vis.area.curve(d3.curveCardinal);

	vis.wrangleData();
}

YearToDateUsageChart.prototype.wrangleData = function() {
	var vis = this;

	//filter data to dates of interest
	vis.filteredData = vis.metroData;

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
		const totalSofar = aggregatedData[element.date]?.total ? aggregatedData[element.date]?.total : 0;
		const stationVisitors = parseInt(element.entries) + parseInt(element.exits);
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
	console.log(vis.aggregatedDataArray);
	// Set scale domain based on filtered data and station
	vis.setScaleDomain();

	// Update the visualization
	vis.updateVis();

}

YearToDateUsageChart.prototype.updateVis = function() {
	vis = this;

	//var selection = vis.svg.selectAll("rect").data(vis.aggregatedDataArray);

	//constants for styling
	const color = "grey";

	vis.path
	.datum(vis.aggregatedDataArray)
	.transition()
	.attr("d", vis.area);

	//TODO draw axis and labels
	vis.svg.selectAll(".y-axis").remove();
	vis.svg.selectAll(".x-axis").remove();

	vis.svg.append("g")
	.attr("class", "axis y-axis")
	.attr("transform", "translate(0, 0)")
	.call(vis.yAxis)

	vis.svg.append("g")
	.attr("class", "axis x-axis")
	.attr("transform", "translate(0, 70)")
	.call(vis.xAxis)

	vis.svg.selectAll(".x-axis text")
	.attr("text-anchor", "end")
	.attr("transform", "rotate(-45)")
}

YearToDateUsageChart.prototype.changeSelectedStations = function(stations){
	this.selectedStations = stations;
	this.setScaleDomain();
	this.updateVis();
}

YearToDateUsageChart.prototype.setEndDate = function(_endDate){
	vis = this;
	vis.endDate = new Date(_endDate);
	vis.setScaleDomain();
	vis.updateVis();
}

YearToDateUsageChart.prototype.setScaleDomain = function(){
	vis = this;
	vis.heightScale.domain([
		0,
		d3.max(vis.aggregatedDataArray, d => vis.usageDataOfInterest(d))
	])

	vis.xScale.domain([vis.aggregatedDataArray[0].date, vis.endDate])

	vis.area = d3.area()
	.x(d => vis.xScale(d.date))
	.y0(vis.height)
	.y1(d => vis.heightScale(vis.usageDataOfInterest(d)))

	vis.yAxis.scale(this.heightScale);
	vis.xAxis.scale(this.xScale);
}

//get usage data of interest (all, or specific station's)
YearToDateUsageChart.prototype.usageDataOfInterest = function(d) {
	if(this.selectedStations.length === 0){
		return d.total;
	}
	let usage = 0;
	Object.keys(d).forEach(name => {
		if(this.selectedStations.find(station => station.name === name)){
				usage += d[name];
		}
	});
	return usage;
}
