import client from "../src";

function env(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

async function main() {
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

    const virtualLatest = await api.sensors().virtualsensors.latest_reading({
        virtualsensor_id: env("TRITON_VIRTUAL_SENSOR_ID"),
    });

    const timespan = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
    const dataFile = await api.sensors().data({
        timespan,
    });

    console.log("virtual latest:", virtualLatest);
    console.log("data file response:", dataFile);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
