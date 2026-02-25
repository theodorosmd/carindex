# OpenAI Service (GPT-5.2)

This service provides AI capabilities using OpenAI's GPT-5.2 model.

## Setup

1. Add your OpenAI API key to `.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

2. The service is configured to use GPT-5.2 by default.

## Usage

### Basic Text Generation

```javascript
import { generateText } from './services/openaiService.js';

const response = await generateText('Write a description for a 2020 BMW 3 Series');
console.log(response);
```

### Sentiment Analysis

```javascript
import { analyzeSentiment } from './services/openaiService.js';

const sentiment = await analyzeSentiment('Beautiful car in excellent condition!');
// Returns: { sentiment: 'positive', confidence: 0.9, key_points: [...], concerns: [] }
```

### Generate Listing Description

```javascript
import { generateListingDescription } from './services/openaiService.js';

const description = await generateListingDescription({
  brand: 'BMW',
  model: '3 Series',
  year: 2020,
  mileage: 50000,
  price: 25000,
  fuel_type: 'Diesel',
  transmission: 'Automatic'
});
```

### Fraud Detection

```javascript
import { detectFraud } from './services/openaiService.js';

const fraudCheck = await detectFraud({
  brand: 'BMW',
  model: '3 Series',
  year: 2020,
  price: 1000, // Suspiciously low
  description: '...',
  url: '...'
});
// Returns: { is_fraud: true, confidence: 0.8, reasons: [...], risk_level: 'high' }
```

### Extract Structured Data

```javascript
import { extractListingData } from './services/openaiService.js';

const data = await extractListingData('2020 BMW 3 Series, 50k km, Diesel, Automatic, €25,000');
// Returns: { brand: 'BMW', model: '3 Series', year: 2020, mileage: 50000, ... }
```

## Model Configuration

The service uses **GPT-5.2** as the default model. You can override it:

```javascript
const response = await generateText('Your prompt', {
  model: 'gpt-5.2', // or another model
  temperature: 0.7,
  max_tokens: 2000
});
```

## Available Functions

- `generateText(prompt, options)` - General text generation
- `analyzeSentiment(description)` - Analyze listing sentiment
- `generateListingDescription(vehicleData)` - Generate professional descriptions
- `detectFraud(listing)` - Detect potential fraud/spam
- `extractListingData(text)` - Extract structured data from text


