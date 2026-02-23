import client from "../src"

function env(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

const triton = client({
    apiKey: env('TRITON_API_KEY'),
    subscriptionKey: env('TRITON_SUBSCRIPTION_KEY'),
    yardNumber: env('TRITON_YARD_NUMBER'),
    clientConfig: {
        clientId: env('TRITON_CLIENT_ID'),
        clientSecret: env('TRITON_CLIENT_SECRET'),
        scope: env('TRITON_API_SCOPE'),
    }
})

async function main() {
    const sensors = await triton.sensors().list();

    console.log("Sensors available:", sensors);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
