# 🔍 SnowDoge: Canadian Government Contract Analyzer

An AI-powered tool that analyzes Canadian government contracts to identify potential issues, inefficiencies, and matters of public interest. Named after the legendary transparency advocates who dig through government spending data.

## 🎯 Purpose

This tool automatically analyzes the [Canadian government's contract data](https://open.canada.ca/data/en/dataset/d8f85d91-7dec-4fd1-8055-483b77225d8b) to identify contracts that deserve public scrutiny. It looks for:

- 💰 Unusual spending patterns
- 🤝 Potential conflicts of interest
- 📊 Single-bid contracts
- ⚠️ Significant contract amendments
- 🏢 IT and consulting contracts with vague deliverables
- 👥 Minister's office spending
- 🔄 Contract splitting patterns

## 🚀 Features

- **Smart Analysis**: Uses GPT-4 to analyze contract details and flag concerning patterns
- **Continuous Processing**: Can process millions of contracts in batches
- **Deduplication**: Tracks processed contracts to avoid duplicates
- **Resume Capability**: Can resume analysis from any point if interrupted
- **Detailed Logging**: Provides comprehensive progress and analysis information
- **NDJSON Output**: Results stored in easily processable NDJSON format

## 📋 Requirements

- [Bun](https://bun.sh) runtime
- OpenAI API key

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/snowdoge.git
cd snowdoge
```

2. Install dependencies:
```bash
bun install
```

3. Set up your OpenAI API key:
```bash
export OPENAI_API_KEY='your-api-key'
```

## 💻 Usage

Start the analysis:
```bash
bun run src/index.ts
```

Resume from a specific offset:
```bash
bun run src/index.ts 5000
```

## 📊 Output Format

Results are saved in NDJSON format (one JSON object per line) with the following structure:

```json
{
  "contract_id": "contract-123",
  "vendor_name": "Tech Corp Inc",
  "value": "$500,000",
  "description": "IT Consulting Services",
  "original_value": "$300,000",
  "amendment_value": "$200,000",
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "number_of_bids": "1",
  "procurement_type": "IT Services",
  "reason_for_flag": "Single bid contract with significant amendment",
  "risk_level": "high",
  "risk_factors": {
    "procurement_issues": ["Single bid", "Limited tender"],
    "financial_issues": ["67% cost increase"],
    "conflict_of_interest": ["Former public servant involved"],
    "timeline_issues": ["Unusually short procurement period"],
    "public_interest_factors": ["High-value IT contract"]
  }
}
```

## 🔍 Risk Indicators

The analyzer looks for several categories of risk:

1. **Procurement Process**
   - Single-bid contracts
   - Limited tender justification
   - Trade agreement exceptions
   - Unusual solicitation procedures

2. **Financial Red Flags**
   - Significant amendments
   - Contract splitting patterns
   - Unusual cost patterns

3. **Conflict of Interest**
   - Former public servants
   - Minister's office contracts
   - Vendor concentration
   - Geographic anomalies

4. **Contract Specifics**
   - Vague deliverables
   - Unusual timeframes
   - Unjustified amendments
   - Standing offers vs direct contracts

5. **High Public Interest**
   - Consulting services
   - IT implementations
   - Large sole-source contracts
   - Significant amendments
   - Minister's office spending

## 📈 Performance

- Processes contracts in batches of 100
- Analyzes only contracts over $50,000
- Includes automatic retry logic for API failures
- Rate limiting to respect API constraints
- Exponential backoff for error recovery

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Data provided by the Government of Canada's Open Government initiative
- Inspired by civic tech advocates and transparency initiatives

## ⚠️ Disclaimer

This tool is for research and transparency purposes only. All contract data is publicly available through the Government of Canada's Open Government portal. 