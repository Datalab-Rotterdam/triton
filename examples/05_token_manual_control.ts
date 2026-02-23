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

    console.log("token valid (before):", api.token.valid());
    await api.token.renew(true);
    console.log("token valid (after):", api.token.valid());

    // token.create can also be called manually.
    await api.token.create({
        grant_type: "client_credentials",
        client_id: env("TRITON_CLIENT_ID"),
        client_secret: env("TRITON_CLIENT_SECRET"),
        scope: env("TRITON_API_SCOPE"),
        $encoding: "application/x-www-form-urlencoded",
    });

    console.log("manual token.create done");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
