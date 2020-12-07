var metroDataDaily = [];
var covidData = [];

// Variable for the visualization instance
var stationMap;
var timeSelector;
var covidRisk;
var dailyUsageChart;
var weeklyUsageChart;
var yearToDateUsageChart;
var stationSuggestions;

// Default options
var showStations = true;
var showLines = false;
var showCOVID = true;

// Hide visualizations until loaded
$("#time-overlay").hide();
$("#detail-overlay").hide();

// Begin displaying map even while data is still loading
stationMap = new StationMap(
  "station-map",
  [],
  [],
  [],
  [],
  [],
  [40.73, -73.8],
  [showStations, showLines, showCOVID]
);

// Only show daily usage map, hide hourly usage map unti user clicks toggle buttons
$("#weekly-usage").hide();

$("#weekly-button").click(function () {
  $("#daily-usage").hide();
  $("#weekly-usage").show();
  $("#weekly-button").addClass("selected");
  $("#daily-button").removeClass("selected");
});

$("#daily-button").click(function () {
  $("#weekly-usage").hide();
  $("#daily-usage").show();
  $("#daily-button").addClass("selected");
  $("#weekly-button").removeClass("selected");
});

//handles zooming out
$("#zoom-out-button").click(function () {
  yearToDateUsageChart.resetZoom();
});

// Load data asynchronously
var files = [
  "data/metroDaily.json",
  "data/metroHourly.json",
  "data/percent-positive.csv",
  "data/modzcta.geo.json",
  "data/SubwayLines.geo.json",
];
var promises = [];
files.forEach(function (url) {
  if (url.endsWith(".json")) {
    promises.push(d3.json(url));
  } else if (url.endsWith(".csv")) {
    promises.push(d3.csv(url));
  }
});
Promise.all(promises).then(function (values) {
  processData(values[0], values[1], values[2], values[3], values[4]);
});

function processData(
  metroDataDaily,
  metroDataHourly,
  covidData,
  neighborhoodData,
  lineData
) {
  self.metroDataDaily = metroDataDaily;
  self.metroDataHourly = metroDataHourly;
  self.covidData = covidData;
  self.neighborhoodData = neighborhoodData;
  self.lineData = lineData;

  // Remove stations outside of NYC
  self.metroDataDaily = self.metroDataDaily.filter(
    (record) =>
      record.station != "Newark Penn Station" &&
      record.stop_name != "Harrison" &&
      record.stop_name != "Journal Sq" &&
      record.stop_name != "Grove St" &&
      record.stop_name != "Pavonia/Newport" &&
      record.stop_name != "Hoboken" &&
      record.stop_name != "Exchange Pl"
  );
  self.metroDataHourly = self.metroDataHourly.filter(
    (record) =>
      record.station != "Newark Penn Station" &&
      record.stop_name != "Harrison" &&
      record.stop_name != "Journal Sq" &&
      record.stop_name != "Grove St" &&
      record.stop_name != "Pavonia/Newport" &&
      record.stop_name != "Hoboken" &&
      record.stop_name != "Exchange Pl"
  );

  //all metro dates data for weekly usage chart, append timezone for correct date encoding / decoding
  self.metroDataDaily = self.metroDataDaily.map((d) => {
    d.date = d.date + " EST";
    return d;
  });

  self.covidData = self.covidData[covidData.length - 1];

  self.daysOfWeek = [];
  self.metroDataHourly.forEach((entry) => {
    let dayOfWeek = new Date(entry.date).getDay();
    if (!self.daysOfWeek.some((d) => d.dayOfWeek == dayOfWeek)) {
      self.daysOfWeek.push({ dayOfWeek: dayOfWeek, date: entry.date });
    }
  });

  createVis();
}

function createVis() {
  // Instantiate visualization
  stationMap.refresh(
    "station-map",
    metroDataHourly,
    daysOfWeek,
    covidData,
    neighborhoodData,
    lineData,
    [40.735, -73.78],
    [showStations, showLines, showCOVID]
  );
  dailyUsageChart = new DailyUsageChart("daily-usage", metroDataHourly);
  weeklyUsageChart = new WeeklyUsageChart("weekly-usage", metroDataHourly);
  timeSelector = new TimeSelector("time-overlay", [
    showStations,
    showLines,
    showCOVID,
  ]);
  yearToDateUsageChart = new YearToDateUsageChart(
    "year-to-date-usage",
    metroDataDaily,
    "2020-12-05 EST"
  );
  covidRisk = new CovidRisk(
    "covid-risk",
    "positivity-rates",
    covidData,
    neighborhoodData
  );
  stationSuggestions = new StationSuggestions(
    "station-suggestions",
    metroDataDaily
  );

  // Show visualization
  $("#time-overlay").fadeIn(1000);
  $("#detail-overlay").fadeIn(1000);
  $("#start-button")
    .addClass("active")
    .text("BEGIN")
    .click(function () {
      $("#loading-screen").fadeOut(250);
    });

  // Update data "as-of" text
  $("#metro-as-of").text(
    moment(metroDataHourly[metroDataHourly.length - 1].date).format(
      "MM/DD/YYYY"
    )
  );
  $("#covid-as-of").text(covidData["week_ending"]);
}

function toggleLayers(stations, lines, covid) {
  showStations = stations;
  showLines = lines;
  showCOVID = covid;
  stationMap.toggleLayers(showStations, showLines, showCOVID);
}

function selectStations(stations) {
  if (stations == undefined || stations.length == 0) {
    $("#clear-button").removeClass("active");
  } else {
    $("#clear-button")
      .addClass("active")
      .click(function () {
        selectStations([]);
      });
  }

  // update text label
  let stationsString = "All Stations";
  if (stations.length > 0) {
    stationsString = "";
    stations.forEach((station) => {
      stationsString += station.name;
      if (station != stations[stations.length - 1]) {
        stationsString += ", ";
      }
    });
  }
  $("#current-stations").html(stationsString);

  // update other visualizations
  stationMap.selectStations(stations);
  covidRisk.wrangleData(stations);
  stationSuggestions.wrangleData(stations);
  dailyUsageChart.changeSelectedStations(stations);
  weeklyUsageChart.changeSelectedStations(stations);
  yearToDateUsageChart.changeSelectedStations(stations);
}

function changeCurrentTime(day, hour) {
  stationMap.wrangleData(day, hour);
  dailyUsageChart.wrangleData(day, hour);
  weeklyUsageChart.wrangleData(day);
}

const toggleStation = (s) => {
  //   const s = stationMap.allStations.filter((d) => d.id == 416)[0];
  stationMap.toggleStationSelect(s);
};

// const el = document.getElementById("searcha");
// console.log(el);
// el.addEventListener("click", searchStations);
