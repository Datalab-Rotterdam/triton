import client from "../src";
import {afterEach, describe, expect, it, vi} from "vitest";

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {"content-type": "application/json"},
    });
}

function textResponse(body: string, status = 200, contentType = "text/plain"): Response {
    return new Response(body, {
        status,
        headers: {"content-type": contentType},
    });
}

function callUrl(fetchMock: ReturnType<typeof vi.fn>, index: number): URL {
    return new URL(fetchMock.mock.calls[index][0] as string);
}

function callHeaders(fetchMock: ReturnType<typeof vi.fn>, index: number): Headers {
    return new Headers(fetchMock.mock.calls[index][1]?.headers as HeadersInit);
}

describe("client", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("fetches metadata and reuses resolved vessel id for sensor latest_reading", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({
                vesselInfo: {id: 42, displayName: "Vessel", name: null, timeZone: "UTC"},
                sensorInfo: [],
            }))
            .mockResolvedValueOnce(jsonResponse({
                sensorId: 1000,
                samplingFrequency: 1000,
                sensorValue: 12.5,
                timestamp: 1730000000,
            }));

        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            yardNumber: "YARD-1",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await api.metadata();
        const latest = await api.sensors().sensor("1000").latest_reading({isManualInput: false});

        expect(latest.sensorId).toBe(1000);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        const latestUrl = callUrl(fetchMock, 1);
        expect(latestUrl.pathname).toBe("/api/v1/vessels/42/sensors/1000/readings/latest");
        expect(latestUrl.searchParams.get("subscription-key")).toBe("sub-key");
        expect(latestUrl.searchParams.get("isManualInput")).toBe("false");
    });

    it("auto-resolves vessel id from metadata when omitted", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({
                vesselInfo: {id: 77, displayName: "Auto Vessel", name: null, timeZone: "UTC"},
                sensorInfo: [],
            }))
            .mockResolvedValueOnce(jsonResponse({
                sensorId: 1000,
                samplingFrequency: 1000,
                sensorValue: 1,
                timestamp: 2,
            }));

        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            yardNumber: "YARD-2",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await api.sensors().sensor("1000").latest_reading();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(callUrl(fetchMock, 0).pathname).toBe("/api/v1/metadata/vessels");
        expect(callUrl(fetchMock, 1).pathname).toBe("/api/v1/vessels/77/sensors/1000/readings/latest");
    });

    it("uses explicit vessel id without metadata lookup", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({rows: []}));

        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await api.sensors("500").sensor("1000").readings({
            starttime: 1000,
            endtime: 2000,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const url = callUrl(fetchMock, 0);
        expect(url.pathname).toBe("/api/v1/vessels/500/sensors/1000/readings");
        expect(url.searchParams.get("starttime")).toBe("1000");
        expect(url.searchParams.get("endtime")).toBe("2000");
        expect(url.searchParams.get("subscription-key")).toBe("sub-key");
    });

    it("returns sensor list from metadata endpoint", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({
            vesselInfo: {id: 1, displayName: "A", name: null, timeZone: "UTC"},
            sensorInfo: [{id: 1000, name: "rpm"}],
        }));

        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            yardNumber: "YARD-3",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        const sensors = await api.sensors().list();
        expect(sensors).toEqual([{id: 1000, name: "rpm"}]);
    });

    it("throws when metadata is called without required defaults/options", async () => {
        const fetchMock = vi.fn();
        const api = client({
            apiKey: "api-key",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await expect(api.metadata()).rejects.toThrow(
            "metadata requires 'subscription-key' and 'yardNumber' (pass options or set defaults in client config)."
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("creates token with form-encoded body and marks token as valid", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({
            token_type: "Bearer",
            expires_in: 3600,
            ext_expires_in: 3600,
            access_token: "abc123",
        }));

        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await api.token.create({
            grant_type: "client_credentials",
            client_id: "client-id",
            client_secret: "client-secret",
            scope: "scope",
            $encoding: "application/x-www-form-urlencoded",
        });

        const url = callUrl(fetchMock, 0);
        const headers = callHeaders(fetchMock, 0);
        const body = fetchMock.mock.calls[0][1]?.body as string;

        expect(url.pathname).toBe("/api/v1/tokens");
        expect(url.searchParams.get("subscription-key")).toBe("sub-key");
        expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
        expect(headers.get("api-key")).toBe("api-key");
        expect(body).toContain("grant_type=client_credentials");
        expect(body).toContain("client_id=client-id");
        expect(api.token.valid()).toBe(true);
    });

    it("auto-renews token and sends Authorization header on authenticated calls", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({
                token_type: "Bearer",
                expires_in: 3600,
                ext_expires_in: 3600,
                access_token: "auto-token",
            }))
            .mockResolvedValueOnce(jsonResponse({
                vesselInfo: {id: 999, displayName: "Auth Vessel", name: null, timeZone: "UTC"},
                sensorInfo: [],
            }));

        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            yardNumber: "YARD-4",
            clientConfig: {
                clientId: "client-id",
                clientSecret: "client-secret",
                scope: "scope",
            },
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await api.metadata();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(callUrl(fetchMock, 0).pathname).toBe("/api/v1/tokens");
        const metadataHeaders = callHeaders(fetchMock, 1);
        expect(metadataHeaders.get("authorization")).toBe("Bearer auto-token");
    });

    it("throws when token renewal is requested without subscription key", async () => {
        const api = client({
            apiKey: "api-key",
            clientConfig: {
                clientId: "client-id",
                clientSecret: "client-secret",
                scope: "scope",
            },
            fetchImpl: vi.fn() as unknown as typeof fetch,
        });

        await expect(api.token.renew()).rejects.toThrow("Missing subscription key for token renewal");
    });

    it("surfaces json error message from API response", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({message: "bad request"}, 400));
        const api = client({
            apiKey: "api-key",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        await expect(api.request("/api/v1/metadata/vessels", "GET", {
            $query: {"subscription-key": "sub-key", yardNumber: "Y-1"},
        })).rejects.toThrow("bad request");
    });

    it("returns text response for non-json successful calls", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(textResponse("https://example.com/data.csv", 200, "text/plain"));
        const api = client({
            apiKey: "api-key",
            subscriptionKey: "sub-key",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });

        const result = await api.request("/api/v1/vessels/{vessel_id}/sensors/data", "GET", {
            $path: {vessel_id: "55"},
            $query: {"subscription-key": "sub-key", timespan: "2026010110"},
        });

        expect(result).toBe("https://example.com/data.csv");
    });
});
