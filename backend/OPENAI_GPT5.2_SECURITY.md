# OpenAI GPT-5.2 - Security Integration Guide

## 🔒 Security Features Implemented

### 1. **API Key Protection**
- ✅ API key stored in environment variables (`OPENAI_API_KEY`)
- ✅ Never hardcoded in source code
- ✅ Never exposed in logs or error messages
- ✅ Validation before API calls

### 2. **Input Validation & Sanitization**
- ✅ Prompt sanitization (removes dangerous patterns)
- ✅ Length limits (max 100,000 characters)
- ✅ Type validation
- ✅ Prevents prompt injection attacks

### 3. **Rate Limiting**
- ✅ Per-user rate limiting (50 calls/hour)
- ✅ Prevents API abuse
- ✅ Tracks usage per user ID

### 4. **Cost Control**
- ✅ Token usage tracking
- ✅ Cost estimation (GPT-5.2 pricing)
- ✅ Max tokens limit (128K for GPT-5.2)
- ✅ Usage logging

### 5. **Error Handling**
- ✅ Secure error messages (no internal details exposed)
- ✅ Retry logic with exponential backoff
- ✅ Timeout protection (30 seconds)
- ✅ Specific error handling (401, 429, 500)

### 6. **Model Security**
- ✅ Whitelist of allowed models
- ✅ Prevents model injection
- ✅ Default fallback to safe model

## 📊 GPT-5.2 Specifications

**Model Variants:**
- `gpt-5.2` - Standard model (400K context, 128K output)
- `gpt-5.2-chat` - Optimized for chat (128K context, 16K output)
- `gpt-5.2-pro` - Advanced features via Responses API

**Capabilities:**
- Context window: 400,000 tokens
- Max output: 128,000 tokens (16,384 for Chat variant)
- Knowledge cutoff: August 31, 2025
- Reasoning token support
- Tool integration (web search, file search, etc.)

**Pricing (as of 2025):**
- Input tokens: $1.75 per million
- Output tokens: $14.00 per million
- Cached input: $0.175 per million (if using cache)

## 🚀 Setup Instructions

### 1. Add API Key to Environment

Add to `backend/.env`:
```env
# OpenAI GPT-5.2 Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-5.2  # Optional: defaults to gpt-5.2
```

### 2. Usage Example

```javascript
import { generateText, detectFraud } from './services/openaiService.js';

// Always pass userId for rate limiting
const result = await generateText('Your prompt', {}, req.user.id);

// Fraud detection
const fraudCheck = await detectFraud(listing, req.user.id);
```

## 🛡️ Security Best Practices

### DO:
- ✅ Always pass `userId` for rate limiting
- ✅ Validate user inputs before calling the service
- ✅ Monitor API usage and costs
- ✅ Use appropriate models for your use case
- ✅ Set reasonable token limits

### DON'T:
- ❌ Never hardcode API keys
- ❌ Never expose API keys in logs
- ❌ Don't trust user inputs without validation
- ❌ Don't exceed rate limits
- ❌ Don't send sensitive data (passwords, credit cards, etc.)

## 💰 Cost Management

**Example Cost Calculation:**
- 1,000 input tokens + 500 output tokens
- Cost = (1,000 / 1,000,000 × $1.75) + (500 / 1,000,000 × $14.00)
- Cost = $0.00175 + $0.007 = **$0.00875**

**Cost Optimization Tips:**
1. Use `gpt-5.2-chat` for chat applications (cheaper)
2. Limit `max_tokens` to what you actually need
3. Cache responses when possible
4. Monitor usage in OpenAI dashboard
5. Set up billing alerts

## 📝 Use Cases for Carindex

1. **Fraud Detection**: Analyze listings for suspicious patterns
2. **Description Generation**: Create professional listing descriptions
3. **Sentiment Analysis**: Understand market sentiment
4. **Data Extraction**: Extract structured data from unstructured text
5. **Price Analysis**: Analyze pricing trends and anomalies
6. **Market Insights**: Generate market reports and summaries

## 🔐 Security Architecture

```
User Request
    ↓
[Authentication] → Verify user
    ↓
[Rate Limiter] → Check rate limits (50/hour)
    ↓
[Input Validator] → Sanitize & validate
    ↓
[OpenAI Service] → Secure API call with GPT-5.2
    ↓
[Response Handler] → Sanitize response
    ↓
User Response
```

## ⚠️ Important Notes

1. **Rate Limits**: 
   - Free tier: 3 requests/minute
   - Paid tier: Varies by plan
   - Our limit: 50 calls/hour per user

2. **Data Privacy**:
   - OpenAI may use API data for training (check current policy)
   - Use data privacy options if handling sensitive data
   - Consider on-premise alternatives for highly sensitive data

3. **Model Selection**:
   - Use `gpt-5.2-chat` for chat applications
   - Use `gpt-5.2` for general tasks
   - Use `gpt-5.2-pro` for advanced features

4. **Monitoring**:
   - Check logs for usage patterns
   - Monitor costs in OpenAI dashboard
   - Set up alerts for high usage

## 📚 Documentation

- OpenAI GPT-5.2 Docs: https://platform.openai.com/docs/models/gpt-5.2
- Latest Model Guide: https://platform.openai.com/docs/guides/latest-model
- API Reference: https://platform.openai.com/docs/api-reference
