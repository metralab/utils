const readImage = (input) => {
  if (input.files && input.files[0]) {
    // show a spinning wheel to signal loading:
    const loadingSpinner = document.getElementById('csvLoadingSpinner');
    loadingSpinner.style.display = 'block';

    // parse and convert the CSV file:
    const reader = new FileReader();
    reader.readAsText(input.files[0]);
    reader.onload = (e) => {
      const csvFile = e.target.result;
      const dataColumnIndex = (document.getElementById('dataColumnIndex').value || 1) - 1;
      const timeColumnIndex = (document.getElementById('timeColumnIndex').value || 3) - 1;
      const csvData = parseCsvFile(csvFile, ';', '"', dataColumnIndex, timeColumnIndex);
      console.table(csvData);
      exportCsv(Object.keys(csvData[0]), csvData.map(d => Object.values(d)));
      loadingSpinner.style.display = 'none';
    }
  }
};

const parseCsvFile = (data, delimiter = ',', quotesType = '', dataColumnIndex = 0, timeColumnIndex = 2, dateFormat = 'iso') => {
  return data.split(/\r\n|\n/)
    .map(row => row.split(delimiter))
    .map(row => handleQuotes(row, quotesType))
    .filter(rowFields => rowFields[0].length == 24)
    .map(rowFields => {return {'t': rowFields[timeColumnIndex], ...parseData(rowFields[dataColumnIndex])};})
    .reduce((accumulator, currentValue, index, array) => {
        if (index % 2 === 0 && array[index + 1]) {
          accumulator.push({
            't': parseDate(array[index].t, dateFormat),
            'tens. batteria [mV]': array[index].voltage,
            'temp. interna [°C]': array[index].temperatureInt,
            'temp. esterna [°C]': array[index].temperatureExt,
            'P1 [mm]': array[index].potentiometer1,
            'P2 [mm]': array[index].potentiometer2or3,
            'P3 [mm]': array[index + 1].potentiometer2or3,
            'P1 [mm] (t + 15 min.)': array[index + 1].potentiometer1,
            'tens. batteria [mV] (t + 15 min.)': array[index + 1].voltage,
            'temp. interna [°C] (t + 15 min.)': array[index + 1].temperatureInt,
            'temp. esterna [°C] (t + 15 min.)': array[index + 1].temperatureExt,
          });
        }
        return accumulator;
      }, []);
};

const handleQuotes = (row, quotesType = '') => {
  if (quotesType === "'" || quotesType === '"') {
    return row.map(col => col.slice(1, -1));
  } else {
    return row;
  }
}

const parseData = (v, potentiometerLength = 50) => {
  const potentiometers = v.slice(0, 2) === '70' ? 'p1 & p2' : 'p1 & p3';
  const voltage = parseInt(v.slice(2, 4), 16) * 10 + 2000; // millivolts
  const temperatureInt = parseInt(v.slice(4, 8), 16) / 100; // celsius
  const temperatureExt = parseInt(v.slice(8, 12), 16) / 100; // celsius
  // const floatField = parseInt(parseInt(v.slice(8, 12), 16).toString(2).slice(1), 2) - (2 ** 15);
  const potentiometer1 = parseInt(v.slice(12, 18), 16) * potentiometerLength / ((2 ** 23) - 1); // millimeters
  const potentiometer2or3 = parseInt(v.slice(18, 24), 16) * potentiometerLength / ((2 ** 23) - 1); // millimeters
  return { potentiometers, voltage, temperatureInt, temperatureExt, potentiometer1, potentiometer2or3 };
}

const parseDate = (dateTime, dateFormat = 'iso') => {
  if (dateFormat === 'european') {
    return isoFromEuropeanDate(dateTime);
  } else {
    return dateTime;
  }
}

const isoFromEuropeanDate = (dateTime) => {
  [date, time] = dateTime.split(' ');
  [day, month, year] = date.split('/');
  [hour, minute] = time.split(':');
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
};

const exportCsv = (arrayHeader, arrayData, delimiter = ',', fileName = 'output') => {
    const header = arrayHeader.join(delimiter) + '\n';
    let csv = header;
    arrayData.forEach( array => {
        csv += array.join(delimiter) + '\n';
    });

    const csvData = new Blob([csv], { type: 'text/csv' });  
    const csvUrl = URL.createObjectURL(csvData);

    let hiddenElement = document.createElement('a');
    hiddenElement.href = csvUrl;
    hiddenElement.target = '_blank';
    hiddenElement.download = fileName + '.csv';
    hiddenElement.click();
};
