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

    vis.margin = { top: 40, right: 0, bottom: 40, left: 60 };

	vis.width = 400 - vis.margin.left - vis.margin.right,
	vis.height = 150 - vis.margin.top - vis.margin.bottom;
	
	vis.daysOfWeek = ["Sun", "Mon", "Tues", "Wed", "Thur", "Fri", "Sat"];
	vis.currentDay = 0;

	vis.barWidth = 30;
  	// SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
       	.append("g")
		.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
	
	// Initialize Scales and Axex
	vis.heightScale = d3.scaleLinear().range([vis.height, 0]);
	vis.xScale = d3.scaleLinear().range([0, vis.width]);

	vis.xAxis = d3.axisBottom().tickFormat(d => vis.daysOfWeek[d]).ticks(7).tickSize(0);
	vis.yAxis = d3.axisLeft().ticks(4).tickFormat(d3.formatPrefix(".1", 1e3));

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
		const totalSofar = aggregatedData[element.date]?.total ? aggregatedData[element.date]?.total : 0;
		const stationVisitors = element.tot;
		aggregatedData[element.date] = {
			...aggregatedData[element.date],
			date: new Date(element.date),
			total: totalSofar + stationVisitors,
			[element.name]: stationVisitors,
		}
	});
	
	// concert json to array for d3
	vis.aggregatedDataArray = [];
	Object.keys(aggregatedData).forEach(k => {
		vis.aggregatedDataArray.push(aggregatedData[k]);
	})
	vis.aggregatedDataArray.sort(function (a, b) {
		if (a.date.getDay() > b.date.getDay()) return 1;
		else return -1;
	});
	// console.log(vis.aggregatedDataArray);
	// Set scale domain based on filtered data and station
	vis.setScaleDomain();

	// Update the visualization
	vis.updateVis();

}

WeeklyUsageChart.prototype.updateVis = function(currentDayOfWeek) {
	vis = this;

	if (currentDayOfWeek != undefined) {
		vis.currentDay = currentDayOfWeek;
	}

	var selection = vis.svg.selectAll("rect").data(vis.aggregatedDataArray);

	//constants for styling
	const color = "darkgrey";
	const highlight = "#505050"

	//enter
	selection.enter().append("rect")
	.attr("width", vis.barWidth)
	.attr("x", (d)=> vis.xScale(d.date.getDay()) + 10)
	.attr("fill", d => {
		if (d.date.getDay()==vis.currentDay) {
			return highlight;
		}
		else {
			return color;
		}
	})
	.attr("height", d => vis.height - vis.heightScale(vis.usageDataOfInterest(d)))
	.attr("y", d => {
		return vis.heightScale(vis.usageDataOfInterest(d));
	});

	//update
	selection
	.transition()
	.duration(500)
	.attr("fill", d => {
		if (d.date.getDay()==vis.currentDay) {
			return highlight;
		}
		else {
			return color;
		}
	})
	.transition()
	.duration(750)
	.attr("y", d => {
		return vis.heightScale(vis.usageDataOfInterest(d));
	})
	.attr("height", d => vis.height - vis.heightScale(vis.usageDataOfInterest(d)));

	//exit
	selection.exit().remove();

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
	.attr("transform", "translate(25, 5)")
}

WeeklyUsageChart.prototype.changeSelectedStations = function(stations){
	this.selectedStations = stations;
	// console.log(stations);
	this.setScaleDomain();
	this.updateVis();
}

WeeklyUsageChart.prototype.setEndDate = function(_endDate){
	vis = this;
	vis.endDate = new Date(_endDate);
	vis.startDate = getDateDaysAgo(vis.endDate, 6);
	vis.wrangleData();
}

WeeklyUsageChart.prototype.setScaleDomain = function(){
	vis = this;
	vis.heightScale.domain([
		0,
		d3.max(vis.aggregatedDataArray, d => vis.usageDataOfInterest(d))
	])

	// console.log(vis.heightScale.domain());

	vis.xScale.domain([0, 7])

	vis.yAxis.scale(this.heightScale);
	vis.xAxis.scale(this.xScale);
}

//get usage data of interest (all, or specific station's)
WeeklyUsageChart.prototype.usageDataOfInterest = function(d) {
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
