function getDateDaysAgo(date, days){
    return new Date(date.getTime()- (days * 24 * 60 * 60 * 1000))
}

function getClientTimezoneAcrynom(){
    return new Date().toLocaleTimeString(undefined,{timeZoneName:'short'}).split(' ')[2]
}

function getDateString(d){
    var curr_date = d.getDate();
    var curr_month = d.getMonth() + 1; //Months are zero based
    var curr_year = d.getFullYear();
    return curr_month+"/"+curr_date+"/"+curr_year;
}

