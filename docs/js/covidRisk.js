
/*
 *  CovidRisk - Object constructor function
 *  @param _parentElement       -- HTML element in which to draw the broad visualization
 *  @param _svgElement          -- HTML element in which to draw the SVG visualization
 *  @param _covidData  		    -- Array with all zip code COVID-19 rates
 *  @param _neightborhoodData  	-- Neighborhood geoJSON features
 */

CovidRisk = function(_parentElement, _svgElement, _covidData, _neighborhoodData) {

    this.parentElement = _parentElement;
    this.svgElement = _svgElement;
    this.covidData = _covidData;
    this.neighborhoodData = _neighborhoodData;

	this.initVis();
}


/*
 *  Initialize COVID risk component
 */

CovidRisk.prototype.initVis = function() {
    var vis = this;

    vis.highCutoff = 5;
    vis.mediumCutoff = 2.5;

	vis.margin = {top: 30, right: 30, bottom: 20, left: 30};
	vis.width = 200 - vis.margin.left - vis.margin.right;
    vis.height = 125 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
	vis.svg = d3.select("#" + vis.svgElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Scales
    vis.xScale = d3.scaleBand()
        .range([0, vis.width])
        .padding(0.1);
    vis.yScale = d3.scaleLinear()
        .range([vis.height, 0]);

    // Axes
    vis.xAxis = d3.axisBottom()
        .scale(vis.xScale);
    vis.yAxis = d3.axisLeft()
        .scale(vis.yScale)
        .ticks(3)
        .tickFormat(d3.format(".0%"));
    vis.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(d3.axisBottom(vis.xScale));
    vis.svg.append("g")
        .attr("class", "y-axis axis")
        .call(d3.axisLeft(vis.yScale));

    // Buttons
    vis.buttons = $("#crowd-size-selector button");
    $(vis.buttons[0]).addClass("selected");
    vis.buttons.on("click", changeCrowdSize);
    function changeCrowdSize(e) {
        $(vis.buttons).removeClass("selected");
        $(e.target).addClass("selected");
        vis.changeCrowdSize();
    }

    // By default, no cities are selected
    vis.selectedCities = [];

    vis.wrangleData();
    
}


/*
 *  Data wrangling
 */

CovidRisk.prototype.wrangleData = function(_selectedStations) {
    var vis = this;

    // vis.percentPositiveCity: city-wide positive rate
    // vis.percentPositive: selected station average positivity rate
    
    vis.percentPositiveCity = vis.covidData["PCTPOS_CITY"];
    // if no stations selected, use city-wide data
	if (_selectedStations == undefined || _selectedStations.length == 0) {
        vis.percentPositive = vis.percentPositiveCity;
        vis.xScale.domain(["NYC"]);
        vis.yScale.domain([0, vis.percentPositiveCity/100]);
        vis.barChartData = [vis.percentPositiveCity];
    }
    // else, determine which zip codes the selected stations are in (via Turf.js) and use only this data
    else {
        vis.percentPositive = 0;
        let stations = _selectedStations;
        let stationLocations = [];
        let stationCount = 0;
        stations.forEach(station => {
            stationLocations.push([station.longitude, station.latitude]);
        });
        vis.neighborhoodData.features.forEach(region => {
            stationLocations.forEach(location => {
                if (turf.booleanPointInPolygon(location, region)) {
                    let zipCode = region.properties.MODZCTA;
                    let lookupKey = "PCTPOS_" + zipCode;
                    let covidRate = vis.covidData[lookupKey];
                    if (zipCode==99999) {
                        covidRate = 0;
                    }
                    vis.percentPositive += parseFloat(covidRate);
                    stationCount++;
                }
            });
        });
        vis.percentPositive = vis.percentPositive / stationCount;

        vis.xScale.domain(["NYC", "Selection"]);
        vis.yScale.domain([0, Math.max(vis.percentPositiveCity/100, vis.percentPositive/100)]);
        vis.barChartData = [vis.percentPositiveCity, vis.percentPositive];
    }

	// Update the visualization
	vis.updateVis();

}


/*
 *  The drawing function
 */

CovidRisk.prototype.updateVis = function() {
    var vis = this;
    
    if (vis.percentPositive >= vis.highCutoff) {
        $("#covid-risk-level").text("HIGH").removeClass("low").removeClass("medium").addClass("high");
    }
    else if (vis.percentPositive >= vis.mediumCutoff) {
        $("#covid-risk-level").text("MEDIUM").removeClass("low").addClass("medium").removeClass("high");
    }
    else {
        $("#covid-risk-level").text("LOWER").addClass("low").removeClass("medium").removeClass("high");
    }

    // select
    vis.bars = vis.svg.selectAll(".bar")
        .data(vis.barChartData);
    vis.topLabels = vis.svg.selectAll(".topLabel")
        .data(vis.barChartData);
    // enter
    vis.bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d,i) => vis.xScale(vis.xScale.domain()[i]))
        .attr("width", vis.xScale.bandwidth())
        .attr("y", d => vis.yScale(d/100))
        .attr("height", d => vis.height - vis.yScale(d/100))
        .style("fill", d => {
            if (d >= vis.highCutoff) {
                return "rgb(255, 0, 0)";
            }
            else if (d >= vis.mediumCutoff) {
                return "rgb(255, 127, 0)";
            }
            else {
                return "hsl(120, 100%, 40%)";
            }
        });
    vis.topLabels.enter()
        .append("text")
        .attr("class", "topLabel")
        .text(d => parseFloat(d).toFixed(2) + "%")
        .attr("x", (d,i) => vis.xScale(vis.xScale.domain()[i]) + vis.xScale.bandwidth()/2)
        .attr("y", d => vis.yScale(d/100) - 5)
        .style("fill", d => {
            if (d >= vis.highCutoff) {
                return "rgb(255, 0, 0)";
            }
            else if (d >= vis.mediumCutoff) {
                return "rgb(255, 127, 0)";
            }
            else {
                return "hsl(120, 100%, 40%)";
            }
        });
    // update
    vis.bars
        .transition()
        .duration(750)
        .attr("x", (d,i) => vis.xScale(vis.xScale.domain()[i]))
        .attr("width", vis.xScale.bandwidth())
        .attr("y", d => vis.yScale(d/100))
        .attr("height", d => vis.height - vis.yScale(d/100))
        .style("fill", (d,i) => {
            if (i==0 && vis.barChartData.length>1) {
                return "grey";
            }
            else if (d >= vis.highCutoff) {
                return "rgb(255, 0, 0)";
            }
            else if (d >= vis.mediumCutoff) {
                return "rgb(255, 127, 0)";
            }
            else {
                return "hsl(120, 100%, 40%)";
            }
        });
    vis.topLabels
        .transition()
        .duration(750)
        .text(d => parseFloat(d).toFixed(2) + "%")
        .attr("x", (d,i) => vis.xScale(vis.xScale.domain()[i]) + vis.xScale.bandwidth()/2)
        .attr("y", d => vis.yScale(d/100) - 5)
        .style("fill", (d,i) => {
            if (i==0 && vis.barChartData.length>1) {
                return "grey";
            }
            else if (d >= vis.highCutoff) {
                return "rgb(255, 0, 0)";
            }
            else if (d >= vis.mediumCutoff) {
                return "rgb(255, 127, 0)";
            }
            else {
                return "hsl(120, 100%, 40%)";
            }
        });
    // exit
    vis.bars.exit().remove();
    vis.topLabels.exit().remove();

    // Call axis functions with the new domain 
	vis.svg.select(".x-axis").call(vis.xAxis);
    vis.svg.select(".y-axis").transition().duration(750).call(vis.yAxis);

    vis.changeCrowdSize();

}

/*
 *  Toggle crowd size and update visualization
 */

CovidRisk.prototype.changeCrowdSize = function() {
    var vis = this;

    let crowdSize = 0;
    if ($(vis.buttons[0]).hasClass("selected")) {
        crowdSize = 10;
    }
    else if ($(vis.buttons[1]).hasClass("selected")) {
        crowdSize = 25;
    }
    else if ($(vis.buttons[2]).hasClass("selected")) {
        crowdSize = 50;
    }
    // Add in 5:1 ascertainment bias per Georgia Tech computations
    let percentPositiveWithAscertainment = vis.percentPositive * 5;
    // Calculate COVID-19 risk via Geogia Tech computations
    let probRandomlySelectedPerson = percentPositiveWithAscertainment/100*crowdSize/100;
    let probInfectionWithinCrowd = (1 - Math.pow(1-probRandomlySelectedPerson, crowdSize))*100;
    $("#crowd-risk-estimate").text((probInfectionWithinCrowd.toFixed(2)!="100.00" ? probInfectionWithinCrowd.toFixed(2) : "99.99") +"%");
}