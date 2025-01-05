import OpenAI from 'openai';
import { appendFile, readFile } from 'node:fs/promises';
import { Contract, FlaggedContract, ApiResponse } from './types';

export class ContractAnalyzer {
  private openai: OpenAI;
  private readonly API_URL = "https://open.canada.ca/data/en/api/3/action/datastore_search";
  private readonly RESOURCE_ID = "fac950c0-00d5-4ec1-a4d3-9cbebf98a305";
  private readonly BATCH_SIZE = 100;
  private readonly OUTPUT_FILE = "flagged_contracts.ndjson";
  private readonly MODEL = "gpt-4o-mini";
  private readonly MIN_CONTRACT_VALUE = 50000;
  private readonly MAX_RETRIES = 3;
  private readonly RATE_LIMIT_DELAY = 1000;
  private processedIds = new Set<string>();

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  private parseContractValue(value: string): number {
    return parseFloat(value.replace(/[^0-9.-]+/g, ""));
  }

  private async loadProcessedIds(): Promise<void> {
    try {
      const content = await readFile(this.OUTPUT_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      for (const line of lines) {
        const contract = JSON.parse(line);
        this.processedIds.add(contract.contract_id);
      }
      console.log(`Loaded ${this.processedIds.size} previously processed contracts`);
    } catch (error) {
      // File doesn't exist or is empty, which is fine
      console.log('Starting fresh analysis (no previous results found)');
    }
  }

  private filterHighValueContracts(contracts: Contract[]): Contract[] {
    return contracts.filter(contract => {
      const value = this.parseContractValue(contract.contract_value);
      const isHighValue = value >= this.MIN_CONTRACT_VALUE;
      const isNew = !this.processedIds.has(contract.procurement_id);
      return isHighValue && isNew;
    });
  }

  private async getContractsWithRetry(offset: number, retries = 0): Promise<ApiResponse> {
    try {
      const url = new URL(this.API_URL);
      url.searchParams.append('resource_id', this.RESOURCE_ID);
      url.searchParams.append('limit', this.BATCH_SIZE.toString());
      url.searchParams.append('offset', offset.toString());

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        console.log(`Retry ${retries + 1}/${this.MAX_RETRIES} after error:`, error);
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY * (retries + 1)));
        return this.getContractsWithRetry(offset, retries + 1);
      }
      throw error;
    }
  }

  private async appendFlaggedContracts(contracts: FlaggedContract[]): Promise<void> {
    const ndjsonLines = contracts.map(contract => JSON.stringify(contract)).join('\n');
    if (ndjsonLines) {
      await appendFile(this.OUTPUT_FILE, ndjsonLines + '\n');
      // Update processed IDs
      contracts.forEach(contract => this.processedIds.add(contract.contract_id));
    }
  }

  private async analyzeContractsWithGPT(contracts: Contract[], retries = 0): Promise<FlaggedContract[]> {
    try {
      const firstId = contracts[0]?.procurement_id ?? 'unknown';
      console.log(`Analyzing ${contracts.length} contracts (batch starting at ${firstId})...`);

      const prompt = `Analyze these Canadian government contracts (value > $50,000) for high-risk issues requiring public scrutiny.

Key Risk Indicators to Evaluate:

1. Procurement Process:
   - Single-bid contracts (check number_of_bids)
   - Limited tender justification (check limited_tendering_reason)
   - Trade agreement exceptions (check trade_agreement_exceptions)
   - Unusual solicitation procedures (check solicitation_procedure)

2. Financial Red Flags:
   - Significant amendments (compare contract_value vs original_value)
   - Contract splitting patterns (look for similar contracts near threshold limits)
   - Unusual cost patterns for similar services

3. Conflict of Interest:
   - Former public servants involvement (check former_public_servant)
   - Minister's office contracts (check ministers_office)
   - Vendor concentration risks
   - Geographic anomalies (check vendor_postal_code)

4. Contract Specifics:
   - IT/Professional Services with vague deliverables
   - Unusual timeframes (check contract_period_start and delivery_date)
   - Amendments without clear justification (check comments_en)
   - Standing offers vs direct contracts

5. High Public Interest Areas:
   - Consulting/Professional services contracts
   - IT system implementations
   - Sole-source contracts > $100,000
   - Contracts with significant amendments
   - Minister's office spending

Return a JSON object of contracts that are of interest:
{
  "contracts": [
    {
      "contract_id": "<procurement_id>",
      "vendor_name": "<vendor_name>",
      "value": "<contract_value>",
      "description": "<description_en - cleaned and summarized>",
      "original_value": "<original_value>",
      "amendment_value": "<amendment_value>",
      "start_date": "<contract_period_start>",
      "end_date": "<delivery_date>",
      "number_of_bids": "<number_of_bids>",
      "procurement_type": "<derived from commodity_type and description>",
      "reason_for_flag": "<concise explanation of main concerns>",
      "risk_level": "<high|medium|low>",
      "risk_factors": {
        "procurement_issues": ["<list specific procurement red flags>"],
        "financial_issues": ["<list specific financial concerns>"],
        "conflict_of_interest": ["<list potential conflicts>"],
        "timeline_issues": ["<list timeline concerns>"],
        "public_interest_factors": ["<list public interest aspects>"]
      }
    }
  ]
}

Contracts to analyze:
${JSON.stringify(contracts, null, 2)}`;

      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: "system",
            content: "You are an external government procurement critic with expertise in identifying high-risk contracts that deserve public scrutiny. Focus on systemic issues, potential conflicts of interest, and significant public spending concerns. Provide clear explanations of what each contract was for."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      return parsed.contracts || [];
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        console.log(`Retry ${retries + 1}/${this.MAX_RETRIES} after OpenAI error:`, error);
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY * (retries + 1)));
        return this.analyzeContractsWithGPT(contracts, retries + 1);
      }
      console.error('Error analyzing contracts:', error);
      return [];
    }
  }

  public async analyze(startOffset = 0): Promise<void> {
    let offset = startOffset;
    let totalContracts = 0;
    let totalHighValue = 0;
    let totalFlagged = 0;
    let batchNumber = 1;

    // Load previously processed contracts to avoid duplicates
    await this.loadProcessedIds();

    console.log(`Starting analysis from offset ${startOffset}`);
    console.log(`Minimum contract value: $${this.MIN_CONTRACT_VALUE.toLocaleString()}`);

    while (true) {
      try {
        console.log(`\nProcessing batch ${batchNumber} (offset: ${offset})...`);
        const data = await this.getContractsWithRetry(offset);

        if (!data.success || !data.result.records.length) {
          console.log('No more contracts to analyze');
          break;
        }

        const allContracts = data.result.records;
        const highValueContracts = this.filterHighValueContracts(allContracts);
        
        if (highValueContracts.length > 0) {
          const flagged = await this.analyzeContractsWithGPT(highValueContracts);
          if (flagged.length > 0) {
            await this.appendFlaggedContracts(flagged);
          }

          totalContracts += allContracts.length;
          totalHighValue += highValueContracts.length;
          totalFlagged += flagged.length;

          console.log(`Batch ${batchNumber} results:`);
          console.log(`- Contracts in batch: ${allContracts.length}`);
          console.log(`- High-value contracts: ${highValueContracts.length}`);
          console.log(`- Flagged contracts: ${flagged.length}`);
          console.log(`\nRunning totals:`);
          console.log(`- Total contracts: ${totalContracts}`);
          console.log(`- Total high-value: ${totalHighValue}`);
          console.log(`- Total flagged: ${totalFlagged}`);
        } else {
          console.log(`No new high-value contracts in batch ${batchNumber}`);
        }

        offset += this.BATCH_SIZE;
        batchNumber++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`\nError processing batch ${batchNumber}:`, error);
        console.log('Last successful offset:', offset);
        console.log('Use this offset to resume the analysis');
        throw error;
      }
    }

    console.log(`\nAnalysis Complete!`);
    console.log(`------------------------`);
    console.log(`Total contracts analyzed: ${totalContracts}`);
    console.log(`High-value contracts (>$${this.MIN_CONTRACT_VALUE.toLocaleString()}): ${totalHighValue}`);
    console.log(`Flagged contracts: ${totalFlagged}`);
    console.log(`Results appended to ${this.OUTPUT_FILE}`);
  }
} 