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

	this.initVis();
}

WeeklyUsageChart.prototype.initVis = function() {
    var vis = this;

    vis.margin = { top: 40, right: 0, bottom: 40, left: 60 };

	vis.width = 400 - vis.margin.left - vis.margin.right,
    vis.height = 150 - vis.margin.top - vis.margin.bottom;

	vis.barWidth = 30;
  	// SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
       	.append("g")
		.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
	
	// Initialize Scales and Axes
	vis.heightScale = d3.scaleLinear().range([vis.height, 0]);
	vis.xScale = d3.scaleTime().range([0, vis.width - vis.barWidth-20]);

	vis.xAxis = d3.axisBottom().tickFormat(d3.timeFormat("%m-%d")).ticks(7);
	vis.yAxis = d3.axisLeft().ticks(4).tickFormat(d3.formatPrefix(".1", 1e3));

	vis.wrangleData();
}

WeeklyUsageChart.prototype.wrangleData = function(_selectedStations) {
	var vis = this;

	//filter data to dates of interest
	vis.filteredData = vis.metroData.filter(d => {
		const dateObj = new Date(d.date);
		return vis.startDate <= dateObj && dateObj <= vis.endDate;
	})

	if (_selectedStations != undefined && _selectedStations.length != 0) {
		let data = vis.filteredData;
		vis.filteredData = [];
		_selectedStations.forEach(station => {
			data.forEach(d => {
				if (station.latitude===d.gtfs_latitude && station.longitude===d.gtfs_longitude) {
					vis.filteredData.push(d);
				}
			});
		});
	}

	vis.aggregateData = []

	for (let d = new Date(vis.startDate); d <= vis.endDate; d.setDate(d.getDate() + 1)) {
		let date = new Date(d)
		vis.aggregateData.push({date: date, entries: 0, exits: 0});
	}

	vis.aggregateData.forEach((date, index) => {
		let relevantStations = vis.filteredData.filter(station => new Date(station.date).getTime()===date.date.getTime());
		relevantStations.forEach(station => {
			vis.aggregateData[index].entries += parseInt(station.entries);
			vis.aggregateData[index].exits += parseInt(station.exits);
		});
	});

	// Set scale domain based on filtered data and station
	vis.setScaleDomain();

	// Update the visualization
	vis.updateVis();

}

WeeklyUsageChart.prototype.updateVis = function() {
	vis = this;

	var selection = vis.svg.selectAll("rect").data(vis.aggregateData);

	//constants for styling
	const color = "grey";

	//enter 
	selection.enter().append("rect")
	.attr("width", vis.barWidth)
	.attr("x", (d) => vis.xScale(d.date))
	.attr("y", d => {
		return vis.heightScale(d.entries + d.exits);
	})
	.attr("fill", color)
	.attr("height", d => vis.height - vis.heightScale(d.entries + d.exits));

	//update
	selection
	.transition()
	.duration(1000)
	.attr("y", d => {
		return vis.heightScale(d.entries + d.exits);
	})
	.attr("height", d => vis.height - vis.heightScale(d.entries + d.exits));

	//exit
	selection.exit().remove();

	//TODO draw axis and labels
	vis.svg.selectAll(".y-axis").remove();
	vis.svg.selectAll(".x-axis").remove();

	vis.svg.append("g")
	.attr("class", "axis y-axis")
	.attr("transform", "translate(0, 0)")
	.transition()
	.duration(1000)
	.call(vis.yAxis)
	vis.svg.append("g")
	.attr("class", "axis x-axis")
	.attr("transform", "translate(0, 70)")
	.call(vis.xAxis)

	vis.svg.selectAll(".x-axis text")
	.attr("text-anchor", "end")
	.attr("transform", "rotate(-45)")
}

WeeklyUsageChart.prototype.changeStation = function(stations){
	this.selectedStations = stations;
	this.setScaleDomain();
	this.updateVis();
}

WeeklyUsageChart.prototype.setScaleDomain = function(){
	vis = this;
	this.heightScale.domain([
		0,
		d3.max(vis.aggregateData, d => d.entries + d.exits)
	]);

	this.xScale.domain([vis.startDate, vis.endDate]);

	this.yAxis.scale(this.heightScale);
	this.xAxis.scale(this.xScale);
}
