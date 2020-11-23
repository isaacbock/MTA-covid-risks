function getDateDaysAgo(date, days){
    return new Date(date.getTime()- (days * 24 * 60 * 60 * 1000))
}

function getClientTimezoneAcrynom(){
    return new Date().toLocaleTimeString(undefined,{timeZoneName:'short'}).split(' ')[2]
}

