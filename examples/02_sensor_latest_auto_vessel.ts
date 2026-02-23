import client from "../src";

function env(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

async function main() {
    const sensorId = process.env.TRITON_SENSOR_ID ?? "1000";

    const api = client({
        apiKey: env("TRITON_API_KEY"),
        subscriptionKey: env("TRITON_SUBSCRIPTION_KEY"),
        yardNumber: env("TRITON_YARD_NUMBER"),
        clientConfig: {
            clientId: env("TRITON_CLIENT_ID"),
            clientSecret: env("TRITON_CLIENT_SECRET"),
            scope: env("TRITON_API_SCOPE"),
        },
    });

    // No vessel id passed: client resolves it lazily via metadata.
    const latest = await api.sensors().sensor(sensorId).latest_reading({
        isManualInput: false,
    });

    console.log("sensor:", latest.sensorId);
    console.log("value:", latest.sensorValue);
    console.log("timestamp:", latest.timestamp);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
