import client from "../src";

function env(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

async function main() {
    const vesselId = env("TRITON_VESSEL_ID");
    const sensorId = process.env.TRITON_SENSOR_ID ?? "1000";

    const api = client({
        apiKey: env("TRITON_API_KEY"),
        subscriptionKey: env("TRITON_SUBSCRIPTION_KEY"),
        clientConfig: {
            clientId: env("TRITON_CLIENT_ID"),
            clientSecret: env("TRITON_CLIENT_SECRET"),
            scope: env("TRITON_API_SCOPE"),
        },
    });

    const now = Date.now();
    const readings = await api.sensors(vesselId).sensor(sensorId).readings({
        starttime: now - 15 * 60 * 1000,
        endtime: now,
    });

    console.log(readings);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
