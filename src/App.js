import React, { useState, useEffect } from "react";

const App = () => {
  const [accountBalanceInput, setAccountBalanceInput] = useState("");
  const [inputText, setInputText] = useState("");
  const [riskPercentage, setRiskPercentage] = useState("");
  const [result, setResult] = useState(null);

  // Load account balance and risk percentage from localStorage on component mount
  useEffect(() => {
    const storedBalance = localStorage.getItem("accountBalance");
    const storedRiskPercentage = localStorage.getItem("riskPercentage");
    if (storedBalance) setAccountBalanceInput(storedBalance);
    if (storedRiskPercentage) setRiskPercentage(storedRiskPercentage);
  }, []);

  const parseAccountBalance = (input) => {
    const regex = /(\d+\.?\d*)\s*([a-zA-Z]{3})/i;
    const match = input.match(regex);
    if (match) {
      return {
        balance: parseFloat(match[1]),
        currency: match[2].toUpperCase(),
      };
    }
    return null;
  };

  const parseInputText = (text) => {
    // Extract base and quote currency
    const currencyRegex = /([A-Za-z]{3})([A-Za-z]{3})|([A-Za-z]{6})/i;
    const currencyMatch = text.match(currencyRegex);
    if (!currencyMatch) {
      alert(
        "Invalid instrument format. Please provide a valid currency pair (e.g., NZDCAD, XAUUSD).",
      );
      return;
    }
    const baseCurrency = (
      currencyMatch[1] || currencyMatch[3].substring(0, 3)
    ).toUpperCase();
    const quoteCurrency = (
      currencyMatch[2] || currencyMatch[3].substring(3)
    ).toUpperCase();

    // Extract opening amount (handles "BUY NZDCAD 0.81250", "Entry (sell limit): 98600", "Entry: 95600", etc.)
    const openingAmountRegex =
      /(?:Enter|Entry|Entered at|Buy|Sell|Entry\s*\((?:sell|buy)\s*limit\))[\s:]*(\d+\.?\d*)|(?:Buy|Sell)\s+[A-Za-z]{6}\s+(\d+\.?\d*)/i;
    const openingAmountMatch = text.match(openingAmountRegex);
    if (!openingAmountMatch) {
      alert(
        "Invalid opening amount format. Please provide a valid opening amount.",
      );
      return;
    }
    const openingAmount = parseFloat(
      openingAmountMatch[1] || openingAmountMatch[2],
    );

    // Extract stop loss
    const slRegex = /(?:SL|Stop Loss)[\s:]*(\d+\.?\d*)/i;
    const slMatch = text.match(slRegex);
    if (!slMatch) {
      alert("Invalid stop loss format. Please provide a valid stop loss.");
      return;
    }
    const stopLoss = parseFloat(slMatch[1]);

    // Extract pips (if provided)
    const pipsRegex =
      /(?:SL|Stop Loss)[\s:]*\d+\.?\d*\s*\((\d+)\s*(?:pips?)?\)/i;
    const pipsMatch = text.match(pipsRegex);
    const pips = pipsMatch ? parseFloat(pipsMatch[1]) : null;

    // Calculate pips if not provided
    const calculatedPips =
      pips ||
      calculatePips(baseCurrency, quoteCurrency, openingAmount, stopLoss);

    // Proceed with lot size calculation
    calculateLotSize(baseCurrency, quoteCurrency, calculatedPips);
  };

  const calculatePips = (
    baseCurrency,
    quoteCurrency,
    openingAmount,
    stopLoss,
  ) => {
    // For gold (XAU), 1 pip is 0.01; for JPY pairs, 1 pip is 0.01; for others, it's 0.0001
    if (baseCurrency === "XAU" || quoteCurrency === "XAU") {
      return Math.abs(openingAmount - stopLoss) / 0.01;
    } else if (quoteCurrency === "JPY") {
      return Math.abs(openingAmount - stopLoss) / 0.01;
    } else {
      return Math.abs(openingAmount - stopLoss) / 0.0001;
    }
  };

  const calculateLotSize = async (baseCurrency, quoteCurrency, pips) => {
    try {
      const accountBalanceData = parseAccountBalance(accountBalanceInput);
      if (!accountBalanceData) {
        alert(
          "Invalid account balance format. Please use the format '1000 USD'.",
        );
        return;
      }
      const { balance: accountBalance, currency } = accountBalanceData;

      // Fetch conversion rates for the base currency (if not XAU)
      let baseToAccount = 1;
      if (baseCurrency !== "XAU") {
        const baseResponse = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseCurrency.toLowerCase()}.json`,
        );
        const baseData = await baseResponse.json();
        baseToAccount =
          baseData[baseCurrency.toLowerCase()][currency.toLowerCase()] || 1;
      }

      // Fetch conversion rates for the quote currency (if not XAU)
      let quoteToAccount = 1;
      if (quoteCurrency !== "XAU") {
        const quoteResponse = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${quoteCurrency.toLowerCase()}.json`,
        );
        const quoteData = await quoteResponse.json();
        quoteToAccount =
          quoteData[quoteCurrency.toLowerCase()][currency.toLowerCase()] || 1;
      }

      // Calculate the conversion rate between base and quote currencies
      const conversionRate = baseToAccount / quoteToAccount;

      // Calculate the lot size
      const riskAmount = (accountBalance * parseFloat(riskPercentage)) / 100;

      // Pip value calculation
      let pipValue;
      if (baseCurrency === "XAU" || quoteCurrency === "XAU") {
        // For gold, 1 standard lot = 100 ounces, and 1 pip = 0.01
        pipValue = 100 * 0.01; // 1 standard lot of gold
      } else if (quoteCurrency === "JPY") {
        pipValue = 1000; // Pip value for 1 standard lot of JPY pairs
      } else {
        pipValue = 10; // Pip value for 1 standard lot of other pairs
      }

      const lotSize = (riskAmount * conversionRate) / (pips * pipValue);

      // Calculate position size in units
      const positionSizeUnits =
        lotSize *
        (baseCurrency === "XAU" || quoteCurrency === "XAU" ? 100 : 100000);

      // Calculate standard, mini, and micro lots
      const standardLots = lotSize.toFixed(4);
      const miniLots = (lotSize * 10).toFixed(4); // 1 standard lot = 10 mini lots
      const microLots = (lotSize * 100).toFixed(4); // 1 standard lot = 100 micro lots

      // Set the result with thousand separators
      setResult({
        lotSize: parseFloat(lotSize).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        amountAtRisk: `$${riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        positionSizeUnits: positionSizeUnits.toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        standardLots: parseFloat(standardLots).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        miniLots: parseFloat(miniLots).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        microLots: parseFloat(microLots).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
      });
    } catch (error) {
      console.error("Error fetching currency data:", error);
    }
  };

  const handleReset = () => {
    setAccountBalanceInput("");
    setInputText("");
    setRiskPercentage("");
    setResult(null);
    localStorage.removeItem("accountBalance");
    localStorage.removeItem("riskPercentage");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Forex Lot Size Calculator</h1>

      <div className="lg:flex lg:gap-6">
        {/* Input Section */}
        <div className="lg:w-1/2">
          <div className="mb-6">
            <label className="block mb-2 text-sm text-gray-600">
              Account Balance (e.g., "1000 USD"):
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="Enter account balance"
              value={accountBalanceInput}
              onChange={(e) => setAccountBalanceInput(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm text-gray-600">
              Risk Percentage (e.g., "1" for 1%):
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              placeholder="Enter risk percentage"
              value={riskPercentage}
              onChange={(e) => {
                setRiskPercentage(e.target.value);
                localStorage.setItem("riskPercentage", e.target.value); // Save to localStorage
              }}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm text-gray-600">
              Input Text (e.g., "Buy NZDCAD 0.81250, SL 0.81050"):
            </label>
            <textarea
              className="w-full p-2 border rounded"
              rows="4"
              placeholder="Enter input text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => parseInputText(inputText)}
            >
              Calculate Lot Size
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Output Section */}
        {result && (
          <div className="lg:w-1/2 mt-6 lg:mt-0">
            <h2 className="text-xl font-bold mb-4">Result</h2>
            <div className="bg-white p-4 rounded shadow">
              <div className="mb-4">
                <label className="block text-sm text-gray-600">Lot Size</label>
                <p className="text-2xl font-bold">{result.lotSize}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Amount at Risk
                </label>
                <p className="text-2xl font-bold">{result.amountAtRisk}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Position Size in Units
                </label>
                <p className="text-2xl font-bold">{result.positionSizeUnits}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Standard Lots
                </label>
                <p className="text-2xl font-bold">{result.standardLots}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">Mini Lots</label>
                <p className="text-2xl font-bold">{result.miniLots}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Micro Lots
                </label>
                <p className="text-2xl font-bold">{result.microLots}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
