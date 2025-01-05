import { ContractAnalyzer } from './analyzer';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Please set the OPENAI_API_KEY environment variable');
  process.exit(1);
}

const analyzer = new ContractAnalyzer(OPENAI_API_KEY);

console.log('Starting contract analysis...');
analyzer.analyze()
  .then(() => console.log('Analysis complete! Check flagged_contracts.json for results'))
  .catch(error => console.error('Error during analysis:', error)); 