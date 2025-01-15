import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';

const ScheduleTable = ({ schedule, type }) => {
  const isFinancialYearEnd = (date) => {
    return date.endsWith('-03-2024') || date.endsWith('-03-2025');
  };

  return (
    <div>
      <h4 className="text-md font-medium mb-2">{type} Payment Schedule</h4>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-right">Opening Balance</th>
            <th className="px-4 py-2 text-right">Interest</th>
            <th className="px-4 py-2 text-right">Closing Balance</th>
          </tr>
        </thead>
        <tbody>
          {schedule?.map((payment, index) => {
            const prevPayment = index > 0 ? schedule[index - 1] : null;
            return (
              <tr
                key={index}
                className={`border-t ${isFinancialYearEnd(payment.date) ? 'bg-gray-50 font-medium' : ''}`}
              >
                <td className="px-4 py-2">{payment.date}</td>
                <td className="px-4 py-2 text-right">
                  {(index === 0 ? payment.totalPayable : prevPayment?.totalPayable).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">{payment.interest.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{payment.totalPayable.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PreviewPensionCalculator = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleData = [
    {
      'Wage Month (all the months from date of joining to date of leaving)': '1/2023',
      'Wages on which PF contribution was paid': '25000'
    },
    {
      'Wage Month (all the months from date of joining to date of leaving)': '2/2023',
      'Wages on which PF contribution was paid': '25000'
    }
  ];

  const calculateHistoricalData = (data) => {
    const calculations = {
      '8.33': { yearlyData: {}, total: 0 },
      '1.16': { yearlyData: {}, total: 0 }
    };

    data.forEach(row => {
      const wageMonth = row['Wage Month (all the months from date of joining to date of leaving)'];
      if (!wageMonth) return;

      const [month, yearStr] = wageMonth.split('/');
      const monthNum = parseInt(month);
      const year = parseInt(yearStr);

      const fy = monthNum <= 2 
        ? `${year-1}-${year.toString().slice(2)}`
        : `${year}-${(year+1).toString().slice(2)}`;

      if (!calculations['8.33'].yearlyData[fy]) {
        calculations['8.33'].yearlyData[fy] = {
          wages: 0, contribution: 0, paid: 0, difference: 0, interest: 0, total: 0
        };
        calculations['1.16'].yearlyData[fy] = {
          wages: 0, contribution: 0, paid: 0, difference: 0, interest: 0, total: 0
        };
      }

      const wages = parseInt(row['Wages on which PF contribution was paid']) || 0;
      const contribution833 = Math.round(wages * 0.0833);
      calculations['8.33'].yearlyData[fy].wages += wages;
      calculations['8.33'].yearlyData[fy].contribution += contribution833;
    });

    const interestRate = 8.25;
    let cumulativeBalance = 0;

    const fiscalYears = Object.keys(calculations['8.33'].yearlyData);
    const lastFY = fiscalYears[fiscalYears.length - 1];

    for (let fy = parseInt(lastFY.split('-')[0]); fy <= 2023; fy++) {
      const currentFY = `${fy}-${fy + 1}`;
      if (!calculations['8.33'].yearlyData[currentFY]) {
        calculations['8.33'].yearlyData[currentFY] = { 
          wages: 0, contribution: 0, paid: 0, difference: 0, interest: 0, total: 0
        };
      }

      const yearData = calculations['8.33'].yearlyData[currentFY];
      yearData.interest = Math.round(cumulativeBalance * interestRate / 100);
      yearData.total = cumulativeBalance + yearData.interest;
      cumulativeBalance = yearData.total;
      calculations['8.33'].total = cumulativeBalance;
    }

    return calculations;
  };

  const processData = (data) => {
    try {
      const historicalData = calculateHistoricalData(data);
      setResults({ historicalData });
    } catch (err) {
      setError('Error processing data: ' + err.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data);
          setLoading(false);
        },
        error: (error) => {
          setError('Error parsing CSV: ' + error.message);
          setLoading(false);
        }
      });
    } catch (err) {
      setError('Error reading file: ' + err.message);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    processData(sampleData);
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Pension Contribution Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Upload CSV file</p>
              </div>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}
          {loading && <div className="text-center">Processing...</div>}

          {results && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Historical Data</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Year</th>
                      <th className="px-4 py-2 text-right">Wages</th>
                      <th className="px-4 py-2 text-right">Interest</th>
                      <th className="px-4 py-2 text-right">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.historicalData['8.33'].yearlyData).map(([fy, data]) => (
                      <tr key={fy} className="border-t">
                        <td className="px-4 py-2">{fy}</td>
                        <td className="px-4 py-2 text-right">{data.wages.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{data.interest.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{data.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreviewPensionCalculator;
