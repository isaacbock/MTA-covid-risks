
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

    vis.daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    vis.hourBins = ["12am - 4am", "4am - 8am", "8am - 12pm", "12pm - 4pm", "4pm - 8pm", "8pm - 12am"];

    vis.time = moment().tz("America/New_York");
    vis.displayingCurrentTime = true;
    
    vis.currentDate = $("#current-date");
    vis.currentTime = $("#current-time");

    vis.stationsCheckbox = $("#show-stations");
    vis.linesCheckbox = $("#show-lines");
    vis.covidCheckbox = $("#show-COVID-rates");

    vis.slider = document.getElementById("time-slider");
    vis.sliderPosition = 0;
    vis.slider.oninput = function() {
        if (this.value != vis.sliderPosition) {
            vis.displayingCurrentTime = false;
            vis.sliderPosition = this.value;
        }
        vis.updateVis();
    }

    vis.nowButton = $("#now-button").click(function(){
        vis.displayingCurrentTime = true;
        vis.nowButton.removeClass("active");
        vis.updateVis();
    }); 

    function updateTimeEachMinute(){
        vis.updateVis();
        let currentSeconds = new Date().getSeconds();
        setTimeout(updateTimeEachMinute, (60 - currentSeconds) * 1000);
    }
    updateTimeEachMinute();

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

    if (vis.displayingCurrentTime) {
        vis.time = moment().tz("America/New_York");
        let currentDate = vis.time.format("dddd");
        let currentTime = vis.time.format("hh:mm A")
        vis.currentDate.text(currentDate);
        vis.currentTime.text(currentTime);

        let sliderPosition = vis.time.day()*6;
        if (vis.time.hour() < 4)        { sliderPosition += 0 }
        else if (vis.time.hour() < 8)   { sliderPosition += 1 }
        else if (vis.time.hour() < 12)   { sliderPosition += 2 }
        else if (vis.time.hour() < 16)   { sliderPosition += 3 }
        else if (vis.time.hour() < 20)   { sliderPosition += 4 }
        else if (vis.time.hour() < 24)   { sliderPosition += 5 }
        vis.slider.value = sliderPosition;
        vis.sliderPosition = sliderPosition;
        let day = (vis.sliderPosition - (vis.sliderPosition%6))/6;
        let hour = vis.sliderPosition%6;
        changeCurrentTime(day, hour);
    }
    else {
        let day = (vis.sliderPosition - (vis.sliderPosition%6))/6;
        let hour = vis.sliderPosition%6;
        vis.nowButton.addClass("active");
        vis.currentDate.text(vis.daysOfWeek[day]);
        vis.currentTime.text(vis.hourBins[hour]);
        changeCurrentTime(day, hour);
    }

}