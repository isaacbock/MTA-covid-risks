/*
 *  DailyUsageChart - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _metroData       -- Hourly metro data for most recent week
 */


DailyUsageChart = function(_parentElement, _metroData) {

	this.parentElement = _parentElement;
	this.metroData = _metroData;

	this.selectedStations = [];

	this.initVis();
}

DailyUsageChart.prototype.initVis = function() {
    var vis = this;

    vis.highCutoff = 375;
    vis.mediumCutoff = 125;

    vis.margin = { top: 40, right: 0, bottom: 40, left: 60 };

	vis.width = 400 - vis.margin.left - vis.margin.right,
    vis.height = 150 - vis.margin.top - vis.margin.bottom;
    
    vis.currentDay = 0;
    vis.currentHourBlock = 0;
	
    vis.hourBlocks = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];
    vis.conciseHourBlocks = ["2am", "6am", "10am", "2pm", "6pm", "10pm"];

    vis.barWidth = 40;
    

  	// SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
	    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
       	.append("g")
		.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")")
	
	// Initialize Scales and Axes
	vis.heightScale = d3.scaleLinear().range([vis.height, 0]);
	vis.xScale = d3.scaleLinear().range([0, vis.width]);

	vis.xAxis = d3.axisBottom().tickFormat(d => vis.conciseHourBlocks[d]).ticks(6).tickSize(0);
    vis.yAxis = d3.axisLeft().ticks(4).tickFormat(d3.formatPrefix(".1", 1e3));
    
    vis.xAxisGroup = vis.svg.append("g")
		.attr("class", "x-axis axis")
		.attr("transform", "translate(0, 70)");
	vis.yAxisGroup = vis.svg.append("g")
		.attr("class", "y-axis axis");

	//Tool tip
	vis.tip = d3.tip().attr('class', 'd3-tip')
	.direction('n')
	.offset(function() {
		return [-10, 0];
	})
	.style('z-index', 99999)
	.html(function(event, data){
		return data + " passengers";
	})

	vis.svg.call(vis.tip);

	vis.wrangleData();
}

DailyUsageChart.prototype.wrangleData = function(currentDay, currentHourBlock) {
    var vis = this;
    
    if (currentDay != undefined && currentHourBlock != undefined) {
        vis.currentDay = currentDay;
		vis.currentHourBlock = currentHourBlock;
	}

    //filter data to selected stations
    vis.filteredData = vis.metroData;
    if (vis.selectedStations.length != 0) {
        vis.filteredData = vis.metroData.filter(d => {
            if (vis.selectedStations.some(station => station.id == d.id)) {
                return d;
            }
        });
    }
    // filter to current day
    vis.filteredData = vis.filteredData.filter(d => (new Date(d.date).getDay()==vis.currentDay));

    // aggregate hourly counts into one array
    vis.aggregateCounts = [0,0,0,0,0,0];
    vis.filteredData.forEach(d => {
        vis.aggregateCounts[0] += d["tot_12am"];
        vis.aggregateCounts[1] += d["tot_4am"];
        vis.aggregateCounts[2] += d["tot_8am"];
        vis.aggregateCounts[3] += d["tot_12pm"];
        vis.aggregateCounts[4] += d["tot_4pm"];
        vis.aggregateCounts[5] += d["tot_8pm"];
    });

    vis.heightScale.domain([
		0,
		d3.max(vis.aggregateCounts, d=>d)
	])

	vis.xScale.domain([0, 6])
	vis.yAxis.scale(vis.heightScale);
	vis.xAxis.scale(vis.xScale);

	// Update the visualization
	vis.updateVis();

}

DailyUsageChart.prototype.updateVis = function() {
    vis = this;

    let totalCount = vis.aggregateCounts[vis.currentHourBlock] / (vis.selectedStations.length==0 ? 425:vis.selectedStations.length);
    let hourlyCount = totalCount/4;
    if (hourlyCount >= vis.highCutoff) {
        $("#station-usage-level").text("HIGH").removeClass("low").removeClass("medium").addClass("high");
    }
    else if (hourlyCount >= vis.mediumCutoff) {
        $("#station-usage-level").text("MEDIUM").removeClass("low").addClass("medium").removeClass("high");
    }
    else {
        $("#station-usage-level").text("LOW").addClass("low").removeClass("medium").removeClass("high");
	}
	

	var selection = vis.svg.selectAll("rect").data(vis.aggregateCounts);

	//constants for styling
	const color = "darkgrey";
	const highlight = "#505050"

	// enter
	selection.enter().append("rect")
	.attr("width", vis.barWidth)
	.attr("x", (d,i) => vis.xScale(i) + 10)
	.attr("fill", (d,i) => {
		if (i==vis.currentHourBlock) {
			return highlight;
		}
		else {
			return color;
		}
	})
	.attr("height", d => vis.height - vis.heightScale(d))
	.attr("y", d => {
		return vis.heightScale(d);
	})
	.on('mouseover', vis.tip.show)
	.on('mouseout', vis.tip.hide);

	//update
	selection
	.attr("fill", (d,i) => {
		if (i==vis.currentHourBlock) {
			return highlight;
		}
		else {
			return color;
		}
    })
    .transition()
	.duration(750)
	.attr("height", d => vis.height - vis.heightScale(d))
	.attr("y", d => {
		return vis.heightScale(d);
	});

	//exit
	selection.exit().remove();

	vis.svg.selectAll(".x-axis text")
        .attr("transform", "translate(30, 5)")
    
	vis.svg.select(".y-axis")
		.transition()
		.duration(750)
		.call(vis.yAxis);
	vis.svg.select(".x-axis")
		.transition()
		.duration(750)
        .call(vis.xAxis);
}

DailyUsageChart.prototype.changeSelectedStations = function(stations){
	this.selectedStations = stations;
	this.wrangleData();
}