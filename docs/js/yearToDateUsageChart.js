/*
 *  StationMap - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _data            -- Array with all stations of the bike-sharing network
 *  @param endDate      	-- String represents date of interest
 */

const gradientResetPercentage = "50%";

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

    vis.margin = { top: 10, right: 0, bottom: 40, left: 60 };

	vis.width = 400 - vis.margin.left - vis.margin.right,
    vis.height = 125 - vis.margin.top - vis.margin.bottom;

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
	
	function handleMouseMove(event, data) {
		const currentXPosition = d3.pointer(event)[0];
		// Get the x value of the current X position
		const xValue = vis.xScale.invert(currentXPosition);
	
		const bisectDate = d3.bisector(dataPoint => dataPoint.date).left;
	
		// Get the index of the xValue relative to the dataSet
		const dataIndex = bisectDate(data, xValue, 1);
		const leftData = vis.aggregatedDataArray[dataIndex - 3];
		const rightData = vis.aggregatedDataArray[dataIndex + 3];
	
		// Update gradient
		const x1Percentage = vis.xScale(leftData?.date) / vis.width * 100;
		const x2Percentage = vis.xScale(rightData?.date) / vis.width * 100;

		d3.selectAll(".start").attr("offset", `${isNaN(x1Percentage)? 0:x1Percentage}%`);
		d3.selectAll(".end").attr("offset", `${isNaN(x2Percentage)? 100 : x2Percentage}%`);
	  }
	
	function handleMouseOut(event, data) {
		d3.selectAll(".start").attr("offset", gradientResetPercentage);
		d3.selectAll(".end").attr("offset", gradientResetPercentage);
		d3.select('.year1').text('');
		d3.select('.year2').text('')
	}

	// Area and Path
	vis.path = vis.svg.append("path")
		.attr("class", "area")
		.on("mousemove", handleMouseMove)
		.on("mouseout", handleMouseOut);

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
	// console.log(vis.aggregatedDataArray);
	// Set scale domain based on filtered data and station
	vis.setScaleDomain();

	// Update the visualization
	vis.updateVis();

}

YearToDateUsageChart.prototype.updateVis = function() {
	vis = this;
		  
	//"tooltip" gradient: https://medium.com/@louisemoxy/create-an-accurate-tooltip-for-a-d3-area-chart-bf59783f8a2d
	const defs = vis.svg.append("defs");
	const gradient = defs.append("linearGradient").attr("id", "svgGradient");

	gradient
	.append("stop")
	.attr("class", "start")
	.attr("offset", gradientResetPercentage)
	.attr("stop-color", "lightblue");

	gradient
  	.append("stop")
  	.attr("class", "end")
  	.attr("offset", gradientResetPercentage)
  	.attr("stop-color", "darkblue")
	.attr("stop-opacity", 1);
	  
	gradient
	.append("stop")
	.attr("class", "end")
	.attr("offset", gradientResetPercentage)
	.attr("stop-color", "lightblue");
	
	//constants for styling
	const color = "lightsteelblue";

	vis.path
	.datum(vis.aggregatedDataArray)
	.transition()
	.attr("d", vis.area)
	.style("fill", d=>{
		return "url(#svgGradient)";
	});

	//TODO draw axis and labels
	vis.svg.selectAll(".y-axis").remove();
	vis.svg.selectAll(".x-axis").remove();

	vis.svg.append("g")
	.attr("class", "axis y-axis")
	.attr("transform", "translate(0, 0)")
	.call(vis.yAxis)

	vis.svg.append("g")
	.attr("class", "axis x-axis")
	.attr("transform", "translate(0, "+vis.height+")")
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
