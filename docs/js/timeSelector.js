
/*
 *  TimeSelector - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _defaultOptions  -- Array of default display options
 */

TimeSelector = function(_parentElement, _defaultOptions) {

    this.parentElement = _parentElement;
    this.showStations = _defaultOptions[0];
	this.showLines = _defaultOptions[1];
	this.showCOVID = _defaultOptions[2];

	this.initVis();
}


/*
 *  Initialize time overlay
 */

TimeSelector.prototype.initVis = function() {
    var vis = this;
    
    vis.currentDate = $("#current-date");
    vis.currentTime = $("#current-time");

    vis.stationsCheckbox = $("#show-stations");
    vis.linesCheckbox = $("#show-lines");
    vis.covidCheckbox = $("#show-COVID-rates");

    function updateTimeEachSecond(){
        vis.updateVis();
        setTimeout(updateTimeEachSecond, 1000);
    }
    updateTimeEachSecond();
	
    vis.wrangleData();
}


/*
 *  Data wrangling
 */

TimeSelector.prototype.wrangleData = function() {
	var vis = this;

	// Currently no data wrangling/filtering needed
	// vis.displayData = vis.data;

	// Update the visualization
	vis.updateVis();

}


/*
 *  The drawing function
 */

TimeSelector.prototype.updateVis = function() {
    var vis = this;

    let now = new Date();
    let currentDate = now.toLocaleString('en', {month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
    let currentTime = now.toLocaleString('en', {hour: "numeric", minute: "numeric", timeZoneName: "short", hour12: true, timeZone: "America/New_York" });
    vis.currentDate.text(currentDate);
    vis.currentTime.text(currentTime);

    vis.stationsCheckbox.prop( "checked", vis.showStations );
    vis.linesCheckbox.prop( "checked", vis.showLines );
    vis.covidCheckbox.prop( "checked", vis.showCOVID );
    vis.stationsCheckbox.unbind().change(() => updateLayers());
    vis.linesCheckbox.unbind().change(() => updateLayers());
    vis.covidCheckbox.unbind().change(() => updateLayers());

    function updateLayers() {
        vis.showStations = vis.stationsCheckbox.prop("checked");
        vis.showLines = vis.linesCheckbox.prop("checked");
        vis.showCOVID = vis.covidCheckbox.prop("checked");
        toggleLayers(vis.showStations, vis.showLines, vis.showCOVID);
    }

}