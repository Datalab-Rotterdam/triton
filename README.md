# triton

TypeScript-first API client for the DAMEN Triton REST API.

- Dependency-free runtime (uses `fetch`)
- Typed request/response surface
- Built-in token renewal flow (optional)
- Automatic vessel resolution from metadata (optional)

## Installation

```bash
npm install triton
```

## Requirements

- Node.js 18+ (or provide a custom `fetchImpl`)
- Triton credentials:
  - `Api-Key`
  - `subscription-key`
  - Azure AD app credentials (if using token auto-renew)

## Quick Start

```ts
import client from "triton";

const api = client({
  apiKey: process.env.TRITON_API_KEY!,
  subscriptionKey: process.env.TRITON_SUBSCRIPTION_KEY!,
  yardNumber: process.env.TRITON_YARD_NUMBER!,
  clientConfig: {
    clientId: process.env.TRITON_CLIENT_ID!,
    clientSecret: process.env.TRITON_CLIENT_SECRET!,
    scope: process.env.TRITON_API_SCOPE!,
  },
});

const metadata = await api.metadata();
console.log(metadata.vesselInfo.id);

const latest = await api.sensors().sensor("1000").latest_reading({
  isManualInput: false,
});
console.log(latest);
```

## Client Configuration

```ts
type ClientConfig = {
  baseURL?: string | URL; // default: https://tritonservices.azure-api.net
  apiKey: string;
  subscriptionKey?: string;
  yardNumber?: string;
  clientConfig?: {
    grantType?: string; // default: "client_credentials"
    clientId: string;
    clientSecret: string;
    scope: string;
    renewSkewMs?: number; // default: 30000
  };
  fetchImpl?: typeof fetch;
};
```

## Authentication Modes

### 1) Api-Key + manual token handling

Use `api.token.create(...)` or pass your own `Authorization` header in low-level requests.

### 2) Api-Key + auto token renewal (recommended)

Provide `clientConfig`. The client renews token automatically before requests that use `withAuth`.

## Vessel Resolution

- `api.sensors(<vessel_id>)` uses explicit vessel id
- `api.sensors()` resolves vessel id lazily through `api.metadata()` using:
  - `subscriptionKey`
  - `yardNumber`

If these are missing, methods that require vessel context throw an error.

## API Surface

### Metadata

- `api.metadata(options?)`
  - Fetches `/api/v1/metadata/vessels`
  - Caches `vessel_id` in client context

### Sensors

- `api.sensors(vesselId?).list()`
- `api.sensors(vesselId?).sensor(sensorId).latest_reading(query?)`
- `api.sensors(vesselId?).sensor(sensorId).readings(query?)`
- `api.sensors(vesselId?).latest_readings(query?)`
- `api.sensors(vesselId?).virtualsensors.latest_reading(query?)`
- `api.sensors(vesselId?).data(query?)`

### Tokens

- `api.token.create(body, query?)`
- `api.token.renew(force?)`
- `api.token.valid()`

### Low-level request

- `api.request(path, method, args, requestInit?)`

Use this only when you need direct access to typed route-level calls.

## Examples

Project examples are in `examples/`:

- `examples/01_bootstrap_and_metadata.ts`
- `examples/02_sensor_latest_auto_vessel.ts`
- `examples/03_sensor_readings_explicit_vessel.ts`
- `examples/04_virtual_and_data.ts`
- `examples/05_token_manual_control.ts`
- `examples/06_get_all_sensors.ts`

Run one example (from this repository):

```bash
npx tsx --env-file=.env examples/06_get_all_sensors.ts
```

## Error Handling

Non-2xx responses throw an `Error` with a message from the JSON response (when available), otherwise:

`HTTP <status> <statusText>: <response text>`

## Development

```bash
npm run build
npm test
```

## License

Apache-2.0
