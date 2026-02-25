# Webhook Signature Verification

If `INGEST_RUN_WEBHOOK_SECRET` is set, webhook requests include:

```
X-Carindex-Signature: <hex sha256>
```

The signature is computed over the **raw JSON body**:

```
hex(hmac_sha256(secret, body))
```

## Example (Node.js / Express)

```js
import crypto from 'crypto';

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.INGEST_RUN_WEBHOOK_SECRET;
  const signature = req.header('X-Carindex-Signature');
  const body = req.body; // raw buffer

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(body.toString());
  // handle payload

  res.status(200).send('OK');
});
```

## Example (Express middleware)

```js
import crypto from 'crypto';

export function verifyCarindexSignature(req, res, next) {
  const secret = process.env.INGEST_RUN_WEBHOOK_SECRET;
  const signature = req.header('X-Carindex-Signature');

  if (!secret) {
    return res.status(500).send('Webhook secret not configured');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body) // raw buffer
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  return next();
}

// Usage:
// app.post('/webhook', express.raw({ type: 'application/json' }), verifyCarindexSignature, (req, res) => {
//   const payload = JSON.parse(req.body.toString());
//   res.status(200).send('OK');
// });
```

## Example (Python / Flask)

```python
import hmac, hashlib
from flask import request

@app.post("/webhook")
def webhook():
    secret = os.getenv("INGEST_RUN_WEBHOOK_SECRET", "")
    signature = request.headers.get("X-Carindex-Signature")
    body = request.data

    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if signature != expected:
        return "Invalid signature", 401

    payload = request.get_json()
    # handle payload
    return "OK", 200
```
