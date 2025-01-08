# Forex Lot Size Calculator

This is a React application designed to help forex and gold traders calculate the appropriate lot sizes for their trades. It takes into account the account balance, risk percentage, trading instrument, entry price, and stop loss to provide accurate lot size recommendations.

## Features

- Calculates lot sizes for forex pairs and gold (XAU).
- Supports various input formats commonly used in trading signals.
- Automatic pip value calculation.
- Supports different account currencies.
- Saves account balance and risk settings to localStorage.
- Displays results in standard, mini, and micro lots.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd forex-lot-size-calculator
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

## Usage

1. Start the development server:

   ```bash
   npm start
   ```

2. Open your browser and go to `http://localhost:3000`.

3. Enter your account balance and currency (e.g., "1000 USD").
4. Enter the risk percentage per trade (e.g., "1" for 1%).
5. Input the trading signal text (e.g., "Buy EURUSD 1.05000, SL 1.04800").
6. Click "Calculate Lot Size".
7. The calculated lot size, amount at risk, position size in units, standard lots, mini lots, and micro lots will be displayed.

### Example Input Formats

- Standard format: "Buy EURUSD 1.05000, SL 1.04800"
- Signal format: "EURUSD Buy Now Enter 1.05000"
- Limit orders: "Entry (sell limit): 1.05000"
- Gold trading: "XAUUSD Buy Enter 2000.50"

## Project Structure

- `src/App.js`: Main application component containing the lot size calculation logic.
- `public/index.html`: HTML template for the application.
- `package.json`: Project dependencies and scripts.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive commit messages.
4. Push your changes to your forked repository.
5. Submit a pull request to the main repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
