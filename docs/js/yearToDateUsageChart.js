/*
 *  YearToDateUsageChart - Object constructor function
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

    vis.margin = { top: 10, right: 20, bottom: 40, left: 70 };

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

	vis.xAxisGroup = vis.svg.append("g")
		.attr("class", "x-axis axis")
		.attr("transform", "translate(0, "+vis.height+")")
	vis.yAxisGroup = vis.svg.append("g")
		.attr("class", "y-axis axis");

	//zoom

	vis.zoom = d3.zoom()
    // Subsequently, you can listen to all zooming events
    .on("zoom", function(event, d){

		var transform = event.transform;

		//create new scale object based on event
		var new_xScale = transform.rescaleX(vis.xScale);
		vis.new_xScale = new_xScale;

		vis.svg.select('.x-axis')
		   .call(vis.xAxis.scale(new_xScale));
		   
		vis.area.x(d => new_xScale(d.date));
		
		//And apply it to the path, brush and all other elements you want to clip
		vis.updateVis(true);
	})
	.scaleExtent([1,10])

	
	//Tool tip
	vis.tip = d3.tip().attr('class', 'd3-tip')
	.direction('n')
	.style('z-index', 99999)

	vis.svg.call(vis.tip);
		
		function handleMouseMove(event, data) {
			const currentXPosition = d3.pointer(event)[0];
			// Get the x value of the current X position
			const xValue = vis.new_xScale? vis.new_xScale.invert(currentXPosition) : vis.xScale.invert(currentXPosition);
			
			const bisectDate = d3.bisector(dataPoint => dataPoint.date).left;
		
			// Get the index of the xValue relative to the dataSet
			const dataIndex = bisectDate(data, xValue, 1);
			const leftIndex = dataIndex-3 < 0? 0 : dataIndex-3;
			const rightIndex = dataIndex+3 >= vis.aggregatedDataArray.length? vis.aggregatedDataArray.length-1 : dataIndex + 3;
			const leftData = vis.aggregatedDataArray[leftIndex];
			const rightData = vis.aggregatedDataArray[rightIndex];
			
			// Update gradient
			const x1Percentage = vis.xScale(leftData.date) / vis.width * 100;
			const x2Percentage = vis.xScale(rightData.date) / vis.width * 100;

			d3.selectAll(".start").attr("offset", `${x1Percentage}%`);
			d3.selectAll(".end").attr("offset", `${x2Percentage}%`);

			let averageUsage = 0;
			for(i=leftIndex; i <= rightIndex; i++){
				averageUsage += vis.usageDataOfInterest(vis.aggregatedDataArray[i]);
			}
			averageUsage /= (rightIndex - leftIndex + 1);

			let displayData = {};
			displayData.startDateString = getDateString(leftData.date);
			displayData.endDateString = getDateString(rightData.date);
			displayData.average = Math.round(averageUsage);
			d3.select("#area-tooltip").text(displayData.startDateString + "-"+ displayData.endDateString+": " + displayData.average + "/day");
		}
	
		function handleMouseOut(event, data) {
			d3.selectAll(".start").attr("offset", gradientResetPercentage);
			d3.selectAll(".end").attr("offset", gradientResetPercentage);
			d3.select('.year1').text('');
			d3.select('.year2').text('');
			d3.select("#area-tooltip").text("");
			vis.tip.hide(event);
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

		// Define the clipping region
		vis.svg.append("defs").append("clipPath")
		.attr("id", "clip")
		.append("rect")
		.attr("width", vis.width)
		.attr("height", vis.height);
	
		vis.path
		.datum(vis.aggregatedDataArray)
		.attr("d", vis.area)
		.attr("clip-path", "url(#clip)");
	

	// Update the visualization
	vis.updateVis();

}

YearToDateUsageChart.prototype.updateVis = function(zoom) {
	vis = this;

	let transitionDuration = 750;
	if (zoom!=undefined && zoom) {
		transitionDuration = 0;
	}

	// Call zoom component here
	vis.svg.call(vis.zoom)
	.on("mousedown.zoom", null)
	.on("touchstart.zoom", null);
		  
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
	.duration(transitionDuration)
	.attr("d", vis.area)
	.style("fill", d=>{
		return "url(#svgGradient)";
	});

	//update axes and labels
	vis.svg.select(".y-axis")
		.transition()
		.duration(750)
		.call(vis.yAxis);
	vis.svg.select(".x-axis")
		.call(vis.xAxis);
	vis.svg.selectAll(".x-axis text")
		.attr("text-anchor", "end")
		.attr("transform", "rotate(-45)")
	
}

YearToDateUsageChart.prototype.changeSelectedStations = function(stations){
	this.selectedStations = stations;
	this.setScaleDomain();
	this.new_xScale = undefined;
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

YearToDateUsageChart.prototype.resetZoom = function(){
	vis = this;
	vis.svg.transition().duration(750).call(vis.zoom.transform, d3.zoomIdentity);
}
