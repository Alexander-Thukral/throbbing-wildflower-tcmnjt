import React, { useState } from "react";
import Papa from "papaparse";
import _ from "lodash";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { UploadCloud } from "lucide-react";

const PensionCalculator = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get financial year interest rates
  const getInterestRate = (fy) => {
    const interestRates = {
      "1995-96": 12,
      "1996-97": 12,
      "1997-98": 12,
      "1998-99": 12,
      "1999-00": 12,
      "2000-01": 11,
      "2001-02": 9.5,
      "2002-03": 9.5,
      "2003-04": 9.5,
      "2004-05": 9.5,
      "2005-06": 8.5,
      "2006-07": 8.5,
      "2007-08": 8.5,
      "2008-09": 8.5,
      "2009-10": 8.5,
      "2010-11": 9.5,
      "2011-12": 8.25,
      "2012-13": 8.5,
      "2013-14": 8.75,
      "2014-15": 8.75,
      "2015-16": 8.8,
      "2016-17": 8.65,
      "2017-18": 8.55,
      "2018-19": 8.65,
      "2019-20": 8.5,
      "2020-21": 8.5,
      "2021-22": 8.1,
      "2022-23": 8.15,
      "2023-24": 8.25,
    };
    return interestRates[fy] || 8.25;
  };

  // Get fixed paid amount based on date
  const getFixedAmount = (date) => {
    const [month, year] = date.split("/").map((num) => parseInt(num));
    const compareDate = new Date(year, month - 1);

    if (compareDate.getFullYear() === 1995 && month === 11) return 209;
    if (compareDate < new Date(2001, 5)) return 417;
    if (compareDate < new Date(2014, 8)) return 541;
    return 1250;
  };

  // Calculate contribution and interest for each financial year
  const calculateYearlyData = (data) => {
    const fyData = {};
    let currentYear = 1995;
    const endYear = 2024;

    // Initialize all financial years
    for (let year = currentYear; year <= endYear; year++) {
      const fy = `${year}-${(year + 1).toString().substring(2)}`;
      fyData[fy] = {
        wages: 0,
        contribution: 0,
        paid: 0,
        difference: 0,
        interest: 0,
        total: 0,
      };
    }

    // Process actual data
    data.forEach((row) => {
      const wageMonth =
        row[
          "Wage Month (all the months from date of joining to date of leaving)"
        ];
      if (!wageMonth) return;

      const [month, yearStr] = wageMonth.split("/");
      const year = parseInt(yearStr);
      const month_num = parseInt(month);
      const fy =
        month_num <= 3
          ? `${year - 1}-${year.toString().substring(2)}`
          : `${year}-${(year + 1).toString().substring(2)}`;

      if (fyData[fy]) {
        const wages =
          parseInt(row["Wages on which PF contribution was paid"]) || 0;
        const contribution = Math.round(wages * 0.0833);
        const paid = getFixedAmount(wageMonth);

        fyData[fy].wages += wages;
        fyData[fy].contribution += contribution;
        fyData[fy].paid += paid;
      }
    });

    // Calculate differences and interest
    let cumulativeBalance = 0;
    Object.keys(fyData).forEach((fy, index) => {
      const yearData = fyData[fy];
      yearData.difference = Math.max(yearData.contribution - yearData.paid, 0);

      // Calculate interest
      const interestRate = getInterestRate(fy);
      if (index === 0) {
        yearData.interest = Math.round(
          (yearData.difference * interestRate) / 100
        );
      } else {
        yearData.interest = Math.round(
          (cumulativeBalance * interestRate) / 100
        );
      }

      yearData.total = yearData.difference + yearData.interest;
      cumulativeBalance += yearData.total;
    });

    return fyData;
  };

  // Calculate payment schedule
  const calculatePaymentSchedule = (totalAmount) => {
    const schedule = [];
    const currentDate = new Date();
    let baseAmount = totalAmount;

    // Calculate for current FY (2023-24)
    const months2024 = [
      "31-03-2024",
      "30-04-2024",
      "31-05-2024",
      "30-06-2024",
      "31-07-2024",
      "31-08-2024",
      "30-09-2024",
      "31-10-2024",
      "30-11-2024",
      "31-12-2024",
      "31-01-2025",
      "28-02-2025",
      "31-03-2025",
    ];

    months2024.forEach((date, index) => {
      const interest = Math.round((baseAmount * 8.25 * index) / 1200);
      schedule.push({
        date,
        openingBalance: baseAmount,
        interest,
        totalPayable: baseAmount + interest,
      });
    });

    // Set new base amount for 2024-25
    baseAmount = schedule[schedule.length - 1].totalPayable;

    // Calculate for next FY (2024-25)
    const months2025 = [
      "30-04-2025",
      "31-05-2025",
      "30-06-2025",
      "31-07-2025",
      "31-08-2025",
      "30-09-2025",
      "31-10-2025",
      "30-11-2025",
      "31-12-2025",
    ];

    months2025.forEach((date, index) => {
      const interest = Math.round((baseAmount * 8.25 * (index + 1)) / 1200);
      schedule.push({
        date,
        openingBalance: baseAmount,
        interest,
        totalPayable: baseAmount + interest,
      });
    });

    return schedule;
  };

  // Process the CSV data
  const processData = (data) => {
    try {
      const yearlyData = calculateYearlyData(data);

      // Calculate total amount
      const totalAmount = Object.values(yearlyData).reduce(
        (sum, year) => sum + year.total,
        0
      );

      const paymentSchedule = calculatePaymentSchedule(totalAmount);

      setResults({
        yearlyData,
        paymentSchedule,
        totalAmount,
      });
    } catch (err) {
      setError("Error processing data: " + err.message);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

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
          setError("Error parsing CSV: " + error.message);
          setLoading(false);
        },
      });
    } catch (err) {
      setError("Error reading file: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Pension Contribution Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Upload CSV file</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          {loading && <div className="text-center">Processing...</div>}

          {results && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Historical Data</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Year</th>
                        <th className="px-4 py-2 text-right">Wages</th>
                        <th className="px-4 py-2 text-right">Difference</th>
                        <th className="px-4 py-2 text-right">Interest</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.yearlyData).map(
                        ([year, data]) => (
                          <tr key={year} className="border-t">
                            <td className="px-4 py-2">{year}</td>
                            <td className="px-4 py-2 text-right">
                              {data.wages.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {data.difference.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {data.interest.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {data.total.toLocaleString()}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">If paid by</th>
                        <th className="px-4 py-2 text-right">
                          Opening Balance
                        </th>
                        <th className="px-4 py-2 text-right">Interest</th>
                        <th className="px-4 py-2 text-right">Total Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.paymentSchedule.map((payment, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{payment.date}</td>
                          <td className="px-4 py-2 text-right">
                            {payment.openingBalance.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {payment.interest.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {payment.totalPayable.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PensionCalculator;
