// Add the last digits of every wanted file path to allFileDates
// Then, call updateData() from the console.


function updateData() {

    // ending digits of each MTA file
    // can't run them all at the same time or Chrome crashes :( but running it 3 months at a time works!
    let allFileDates = [
        // 200104, 200111, 200118, 200125, 
        // 200201, 200208, 200215, 200222, 200229, 
        // 200307, 200314, 200321, 200328, 
        // 200404, 200411, 200418, 200425, 
        // 200502, 200509, 200516, 200523, 200530, 
        // 200606, 200613, 200620, 200627, 
        // 200704, 200711, 200718, 200725, 
        // 200801, 200808, 200815, 200822, 200829, 
        // 200905, 200912, 200919, 200926, 
        // 201003, 201010, 201017, 201024, 201031, 
        // 201107, 201114, 201121, 201128,
        201205, 201212, 201219
    ];

    // defaults
    let baseURL = "https://cors-anywhere.herokuapp.com/http://web.mta.info/developers/data/nyct/turnstile/turnstile_";
    moment.tz.setDefault("America/New_York");

    // initiailize data structures
    let remoteComplexLookup = [];
    let stationLookup = [];
    let rawData = [];
    let finalHourlyData = [];
    let finalDailyData = [];

    d3.csv("data/remoteComplexLookup.csv").then(function(data) {
        remoteComplexLookup = data;
        d3.csv("data/stationLookup.csv").then(function(data) {
            stationLookup = data;
            // fetch data from all MTA source urls, from starting index to ending index
            let index = 0;
            fetchData(index);
        });
    });
    

    function fetchData(index) {
        let fetchURL = baseURL + allFileDates[index] + ".txt";
        d3.csv(fetchURL).then(function(processedData) {

            console.log((index+1) + " of " + allFileDates.length + " files loaded.");
            rawData = rawData.concat(processedData);

            if (index<allFileDates.length-1) {
                let newIndex = index + 1;
                setTimeout(function() {
                    fetchData(newIndex);
                }, 2000);
            }
            else if (index==allFileDates.length-1) {
                processDataHourly(processedData);
                processDataDaily(rawData);
            }

        });
    }

    function processDataHourly(data) {

        console.log("AGGREGATING HOURLY DATA");

        let count = 0;
        let consolidatedData = [];

        // clean original raw data and add in station latitude and longitudes
        data.forEach(reading => {
            let date = reading.DATE + " " + reading.TIME
            reading.observedAt = moment.tz(date,"MM/DD/YYYY HH:mm:ss", "America/New_York");
            reading.id = reading.UNIT + reading["C/A"] + reading.SCP + reading.observedAt;
            reading.unitID = reading.UNIT + reading["C/A"] + reading.SCP;
            
            let i=0;
            let station = remoteComplexLookup.find(d => d.remote==reading.UNIT && d.booth==reading["C/A"]);
            if (station != undefined) {
                reading.complex = station.complex_id;
                reading.station = station.station;
                station = stationLookup.find(d => d["complex id"]==reading.complex);
                if (station != undefined) {
                    reading.latitude = station["gtfs latitude"];
                    reading.longitude = station["gtfs longitude"];
                }
            }
            // if (reading.complex!=undefined && reading.latitude!=undefined && !consolidatedData.some(d => d.readingID==reading.id)) {
            if (reading.complex!=undefined && reading.latitude!=undefined) {
                consolidatedData.push({
                    station: reading.station,
                    complex: reading.complex,
                    unitID: reading.unitID,
                    readingID: reading.id,
                    date: reading.observedAt,
                    entries: parseInt(reading["ENTRIES"]),
                    exits: parseInt(reading["EXITS                                                               "]),
                    latitude: reading.latitude,
                    longitude: reading.longitude,
                    readingID: reading.id
                });
                count++;
            }
            if (count%100000==0) {
                console.log(count + " turnstiles processed.");
            }
        });

        // Sort by date and turnstile ID
        console.log("Sorting by date and turnstile.")
        consolidatedData.sort(function (a, b) {
            if (a.complex > b.complex) return 1;
            if (a.complex < b.complex) return -1;
            if (a.unitID > b.unitID) return 1;
            if (a.unitID < b.unitID) return -1;
            if (a.date > b.date) return 1;
            if (a.date <= b.date) return -1;
        
        });
        // console.log(consolidatedData);

        // Calculate changes between each turnstile's measurements
        console.log("Aggregating data by turnstile.");
        let aggregateTurnstileData = [];
        for (let i=1; i<consolidatedData.length; i++) {
            let previous = consolidatedData[i-1];
            let current = consolidatedData[i];
            let entries = (current.entries-previous.entries > 0) ? current.entries-previous.entries : 0;
            let exits = (current.exits-previous.exits > 0) ? current.exits-previous.exits : 0;
            if (current.readingID!=previous.readingID && current.complex==previous.complex && current.unitID==previous.unitID && current.date.year() >= 2020 && entries<10000 && exits<10000) {
                aggregateTurnstileData.push({
                    station: current.station,
                    complex: current.complex,
                    date: current.date,
                    entries: entries,
                    exits: exits,
                    latitude: current.latitude,
                    longitude: current.longitude
                })
            }
        }
        // console.log(aggregateTurnstileData);

        // Sort by station and date
        console.log("Sorting by station and date.")
        aggregateTurnstileData.sort(function (a, b) {
            if (a.complex > b.complex) return 1;
            if (a.complex < b.complex) return -1;
            if (a.date > b.date) return 1;
            if (a.date <= b.date) return -1;
        
        });
        // console.log(aggregateTurnstileData);

        // Calculate aggregate counts for each station
        console.log("Aggregating data by station.");
        let aggregateStationData=[];
        let currentStation = aggregateTurnstileData[0];
        let total = 0;
        let total_12amTo4am = 0;
        let total_4amTo8am = 0;
        let total_8amTo12pm = 0;
        let total_12pmTo4pm = 0;
        let total_4pmTo8pm = 0;
        let total_8pmTo12am = 0;
        for (let i=0; i<aggregateTurnstileData.length; i++)  {
            // if still same station and date as previous, add on to the total count value
            if (aggregateTurnstileData[i].complex==currentStation.complex && aggregateTurnstileData[i].date.isSame(currentStation.date, 'day')) {
                total+=aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits;
                let hour = parseInt(aggregateTurnstileData[i].date.hours());
                if (hour < 4)       { total_12amTo4am += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 8)  { total_4amTo8am += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 12) { total_8amTo12pm += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 16) { total_12pmTo4pm += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 20) { total_4pmTo8pm += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else                { total_8pmTo12am += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
            }
            // else, save aggregate totals and reset for the next station or date
            else {
                // save aggregate totals
                aggregateStationData.push({
                    name: currentStation.station,
                    id: currentStation.complex,
                    date: currentStation.date.format("YYYY-MM-DD"),
                    tot: total,
                    tot_12am: total_12amTo4am,
                    tot_4am: total_4amTo8am,
                    tot_8am: total_8amTo12pm,
                    tot_12pm: total_12pmTo4pm,
                    tot_4pm: total_4pmTo8pm,
                    tot_8pm: total_8pmTo12am,
                    lat: currentStation.latitude,
                    long: currentStation.longitude
                });

                // reset for next station
                total = aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits;
                total_12amTo4am = 0;
                total_4amTo8am = 0;
                total_8amTo12pm = 0;
                total_12pmTo4pm = 0;
                total_4pmTo8pm = 0;
                total_8pmTo12am = 0;
                let hour = parseInt(aggregateTurnstileData[i].date.hours());
                if (hour < 4)       { total_12amTo4am += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 8)  { total_4amTo8am += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 12) { total_8amTo12pm += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 16) { total_12pmTo4pm += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else if (hour < 20) { total_4pmTo8pm += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
                else                { total_8pmTo12am += aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits}
            }
            currentStation = aggregateTurnstileData[i];
        }

        finalHourlyData = aggregateStationData;
        returnData();

    }

    function processDataDaily(data) {

        console.log("AGGREGATING DAILY DATA");

        let count = 0;
        let consolidatedData = [];

        // clean original raw data and add in station latitude and longitudes
        data.forEach(reading => {
            let date = reading.DATE + " " + reading.TIME
            reading.observedAt = moment.tz(date,"MM/DD/YYYY HH:mm:ss", "America/New_York");
            reading.id = reading.UNIT + reading["C/A"] + reading.SCP + reading.observedAt;
            reading.unitID = reading.UNIT + reading["C/A"] + reading.SCP;
            
            let i=0;
            let station = remoteComplexLookup.find(d => d.remote==reading.UNIT && d.booth==reading["C/A"]);
            if (station != undefined) {
                reading.complex = station.complex_id;
                reading.station = station.station;
                station = stationLookup.find(d => d["complex id"]==reading.complex);
                if (station != undefined) {
                    reading.latitude = station["gtfs latitude"];
                    reading.longitude = station["gtfs longitude"];
                }
            }
            // if (reading.complex!=undefined && reading.latitude!=undefined && !consolidatedData.some(d => d.readingID==reading.id)) {
            if (reading.complex!=undefined && reading.latitude!=undefined) {
                consolidatedData.push({
                    station: reading.station,
                    complex: reading.complex,
                    unitID: reading.unitID,
                    readingID: reading.id,
                    date: reading.observedAt,
                    entries: parseInt(reading["ENTRIES"]),
                    exits: parseInt(reading["EXITS                                                               "]),
                    latitude: reading.latitude,
                    longitude: reading.longitude,
                    readingID: reading.id
                });
                count++;
            }
            if (count%100000==0) {
                console.log(count + " turnstiles processed.");
            }
        });

        // Sort by date and turnstile ID
        console.log("Sorting by date and turnstile.")
        consolidatedData.sort(function (a, b) {
            if (a.complex > b.complex) return 1;
            if (a.complex < b.complex) return -1;
            if (a.unitID > b.unitID) return 1;
            if (a.unitID < b.unitID) return -1;
            if (a.date > b.date) return 1;
            if (a.date <= b.date) return -1;
        
        });
        // console.log(consolidatedData);

        // Calculate changes between each turnstile's measurements
        console.log("Aggregating data by turnstile.");
        let aggregateTurnstileData = [];
        for (let i=1; i<consolidatedData.length; i++) {
            let previous = consolidatedData[i-1];
            let current = consolidatedData[i];
            let entries = (current.entries-previous.entries > 0) ? current.entries-previous.entries : 0;
            let exits = (current.exits-previous.exits > 0) ? current.exits-previous.exits : 0;
            if (current.readingID!=previous.readingID && current.complex==previous.complex && current.unitID==previous.unitID && current.date.year() >= 2020 && entries<10000 && exits<10000) {
                aggregateTurnstileData.push({
                    station: current.station,
                    complex: current.complex,
                    date: current.date,
                    entries: entries,
                    exits: exits,
                    latitude: current.latitude,
                    longitude: current.longitude
                })
            }
        }
        // console.log(aggregateTurnstileData);

        // Sort by station and date
        console.log("Sorting by station and date.")
        aggregateTurnstileData.sort(function (a, b) {
            if (a.complex > b.complex) return 1;
            if (a.complex < b.complex) return -1;
            if (a.date > b.date) return 1;
            if (a.date <= b.date) return -1;
        
        });
        // console.log(aggregateTurnstileData);

        // Calculate aggregate counts for each station
        console.log("Aggregating data by station.");
        let aggregateStationData=[];
        let currentStation = aggregateTurnstileData[0];
        let total = 0;
        for (let i=0; i<aggregateTurnstileData.length; i++)  {
            // if still same station and date as previous, add on to the total count value
            if (aggregateTurnstileData[i].complex==currentStation.complex && aggregateTurnstileData[i].date.isSame(currentStation.date, 'day')) {
                total+=aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits;
            }
            // else, save aggregate totals and reset for the next station or date
            else {
                // save aggregate totals
                aggregateStationData.push({
                    name: currentStation.station,
                    id: currentStation.complex,
                    date: currentStation.date.format("YYYY-MM-DD"),
                    tot: total,
                    lat: currentStation.latitude,
                    long: currentStation.longitude
                });

                // reset for next station
                total = aggregateTurnstileData[i].entries + aggregateTurnstileData[i].exits;
            }
            currentStation = aggregateTurnstileData[i];
        }

        finalDailyData = aggregateStationData;
        returnData();
        
    }

    function returnData() {
        // console.log(finalHourlyData);
        // console.log(finalDailyData);
        if (finalHourlyData.length!=0 && finalDailyData.length!=0) {
            console.log("");
            console.log("");
            console.log("FINAL HOURLY DATA:");
            console.log("(right click below, save as global variable, then run copy(temp1) to save data to clipboard)");
            console.log(finalHourlyData);
            console.log("");
            console.log("");
            console.log("FINAL DAILY DATA:");
            console.log("(right click below, save as global variable, then run copy(temp2) to save data to clipboard)");
            console.log(finalDailyData);
        }
    }
    
}