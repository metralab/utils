const readImage = (input) => {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.readAsText(input.files[0]);
    reader.onload = (e) => {
      const csvFile = e.target.result;
      const csvData = parseCsvFile(csvFile, '\t');
      console.table(csvData);
      exportCsv(Object.keys(csvData[0]), csvData.map(d => Object.values(d)));
    }
  }
};

const parseCsvFile = (data, delimiter = ',') => {
  return data.split(/\r\n|\n/)
    .map(row => row.split(delimiter))
    .filter(rowFields => rowFields[0].length == 24)
    .map(rowFields => {return {'t': rowFields[1], ...parseData(rowFields[0])};})
    .reduce((accumulator, currentValue, index, array) => {
        if (index % 2 === 0 && array[index + 1]) {
          accumulator.push({
            '': isoFromEuropeanDate(array[index].t),
            'tens. batteria [mV]': array[index].voltage,
            'temperatura interna [°C]': array[index].temperatureInt,
            'temperatura esterna [°C]': array[index].temperatureExt,
            'P1 [mm]': array[index].potentiometer1,
            'P2 [mm]': array[index].potentiometer2or3,
            'P3 [mm]': array[index + 1].potentiometer2or3,
            'P1 [mm] (t + 15 min.)': array[index + 1].potentiometer1,
            'tens. batteria [mV] (t + 15 min.)': array[index + 1].voltage,
            'temperatura interna [°C] (t + 15 min.)': array[index + 1].temperatureInt,
            'temperatura esterna [°C] (t + 15 min.)': array[index + 1].temperatureExt,
          });
        }
        return accumulator;
      }, []);
};

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
