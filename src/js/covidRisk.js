
/*
 *  CovidRisk - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _covidData  		-- Array with all zip code COVID-19 rates
 */

CovidRisk = function(_parentElement, _covidData) {

    this.parentElement = _parentElement;
    this.covidData = _covidData;

	this.initVis();
}


/*
 *  Initialize COVID risk component
 */

CovidRisk.prototype.initVis = function() {
    var vis = this;

    vis.buttons = $("#crowd-size-selector button");
    $(vis.buttons[0]).addClass("selected");
    vis.buttons.on("click", changeCrowdSize);
    function changeCrowdSize(e) {
        $(vis.buttons).removeClass("selected");
        $(e.target).addClass("selected");
        vis.changeCrowdSize();
    }

    vis.selectedCities = [];

    $.getJSON("data/modzcta.geo.json", function(neighborhoodData) {
        vis.modZCTA = neighborhoodData;
        vis.wrangleData();
    });
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
        vis.modZCTA.features.forEach(region => {
            stationLocations.forEach(location => {
                if (turf.booleanPointInPolygon(location, region)) {
                    let zipCode = region.properties.MODZCTA;
                    let lookupKey = "PCTPOS_" + zipCode;
                    let covidRate = vis.covidData[lookupKey];
                    vis.percentPositive += parseFloat(covidRate);
                    stationCount++;
                }
            });
        });
        vis.percentPositive = vis.percentPositive / stationCount;
    }

	// Update the visualization
	vis.updateVis();

}


/*
 *  The drawing function
 */

CovidRisk.prototype.updateVis = function() {
    var vis = this;
    
    if (vis.percentPositive >=4) {
        $("#covid-risk-level").text("HIGH").removeClass("low").removeClass("medium").addClass("high");
    }
    else if (vis.percentPositive >=2) {
        $("#covid-risk-level").text("MEDIUM").removeClass("low").addClass("medium").removeClass("high");
    }
    else {
        $("#covid-risk-level").text("LOWER").addClass("low").removeClass("medium").removeClass("high");
    }

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
    // Add in 5% ascertainment bias per Georgia Tech computations
    let percentPositiveWithAscertainment = vis.percentPositive * 5;
    // Calculate COVID-19 risk via Geogia Tech computations
    let probRandomlySelectedPerson = percentPositiveWithAscertainment/100*crowdSize/100;
    let probInfectionWithinCrowd = (1 - Math.pow(1-probRandomlySelectedPerson, crowdSize))*100;
    $("#crowd-risk-estimate").text((probInfectionWithinCrowd.toFixed(2)!="100.00" ? probInfectionWithinCrowd.toFixed(2) : "99.99") +"%");
}