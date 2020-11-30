# Clean up of data for NYCovid Final Project by Ege Cavusoglu.
# Nov 19th, 2020.

import csv

# Clean up of metro data to retrieve necessary fields and sort according to date.

newcsv = []  # Rearranging initial csv in an array.

# Read the unprocessed data.
with open('metro.csv', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if row["date"] >= "2020-08-01":
            row = {'id': f'{row["gtfs_longitude"]}{row["gtfs_latitude"]}'  ,'date': row['date'], 'stop_name': row['stop_name'], 'gtfs_longitude': row['gtfs_longitude'], 'gtfs_latitude': row['gtfs_latitude'], 'entries': row['entries'], 'exits': row['exits']}
            newcsv.append(row)

newcsv.sort(key=lambda x: x["date"]) # Sort the data by date for easier processing.

fieldnames = ['id', 'date', 'stop_name', 'gtfs_longitude', 'gtfs_latitude', 'entries', 'exits']  # declare the field names for the output csv.

# Output to a new file.
output_file = open('output/metro.csv','w')
csvwriter = csv.DictWriter(output_file, delimiter=',', fieldnames=fieldnames)
csvwriter.writerow(dict((fn,fn) for fn in fieldnames))
for row in newcsv:
     csvwriter.writerow(row)
output_file.close()

