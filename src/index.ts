// region client
import {MetadataService, TritonAPI} from "./services";

export const baseURL = new URL("https://tritonservices.azure-api.net");

export type ClientConfig = {
    baseURL?: string | URL;
    apiKey: string;
    subscriptionKey?: string;
    yardNumber?: string;
    clientConfig?: {
        grantType?: string;
        clientId: string;
        clientSecret: string;
        scope: string;
        renewSkewMs?: number;
    };
    fetchImpl?: typeof fetch; // optional for node<18 / testing
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type MethodKey<P extends keyof TritonAPI> = Extract<keyof TritonAPI[P], HttpMethod>;

type Params<P extends keyof TritonAPI, M extends MethodKey<P>> =
    TritonAPI[P][M] extends { parameters: infer X } ? X : never;

type Ret<P extends keyof TritonAPI, M extends MethodKey<P>> =
    TritonAPI[P][M] extends { return: infer R } ? R : never;

type QueryOf<P extends keyof TritonAPI, M extends MethodKey<P>> =
    Params<P, M> extends { $query: infer Q } ? Q : never;

type BodyOf<P extends keyof TritonAPI, M extends MethodKey<P>> =
    Params<P, M> extends { $body: infer B } ? B : never;

type MetadataQuery = MetadataService["/api/v1/metadata/vessels"]["GET"]["parameters"]["$query"];
type TokenBody = BodyOf<"/api/v1/tokens", "POST">;
type TokenQuery = QueryOf<"/api/v1/tokens", "POST">;

type AnyArgs = {
    $path?: Record<string, string | number>;
    $query?: Record<string, any>;
    $headers?: Record<string, string | undefined>;
    $body?: unknown;
};

export const client = (config: ClientConfig) => {
    const resolvedBase =
        config.baseURL === undefined
            ? baseURL
            : typeof config.baseURL === "string"
                ? new URL(config.baseURL)
                : config.baseURL;

    const fetchImpl = config.fetchImpl ?? fetch;

    const context: {
        vessel_id?: string;
        token: {
            access_token: string;
            expires_at: number;
            valid: () => boolean;
        };
    } = {
        vessel_id: undefined,
        token: {
            access_token: "",
            expires_at: 0,
            valid() {
                const skew = config.clientConfig?.renewSkewMs ?? 30_000;
                return this.access_token.length > 0 && Date.now() < this.expires_at - skew;
            },
        },
    };

    const mergeSubscriptionKey = <T extends Record<string, any>>(query?: Partial<T>): T => {
        const merged = {
            ...(config.subscriptionKey ? {"subscription-key": config.subscriptionKey} : {}),
            ...(query ?? {}),
        };
        return merged as T;
    };

    const request = async <P extends keyof TritonAPI, M extends MethodKey<P>>(
        path: P,
        method: M,
        args: Params<P, M>,
        requestInit?: RequestInit,
    ): Promise<Ret<P, M>> => {
        const a = args as unknown as AnyArgs;

        const pathParams = a.$path ?? {};
        const query = a.$query;
        const headersFromArgs = a.$headers ?? {};

        const resolvedPath = (path as string).replace(/\{(\w+)}/g, (_, key: string) => {
            const v = pathParams[key];
            if (v === undefined || v === null) throw new Error(`Missing $path.${key} for ${String(path)}`);
            return encodeURIComponent(String(v));
        });

        const url = new URL(resolvedPath.replace(/^\/+/, ""), resolvedBase);

        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v === undefined || v === null) continue;
                if (Array.isArray(v)) {
                    for (const item of v) url.searchParams.append(k, String(item));
                } else {
                    url.searchParams.set(k, String(v));
                }
            }
        }

        const bearer = context.token.access_token;
        const authorization = headersFromArgs["Authorization"] ?? (bearer ? `Bearer ${bearer}` : undefined);


        const headers: Record<string, string> = {
            Accept: "application/json",
            ...Object.fromEntries(
                Object.entries(headersFromArgs).filter(([, v]) => v !== undefined && v !== null)
            ) as Record<string, string>,
        };

        if (authorization) headers["Authorization"] = authorization;
        if (config.apiKey) headers["Api-Key"] = config.apiKey;

        const init: RequestInit = {
            ...requestInit,
            method: method as string,
            headers: {
                ...requestInit?.headers,
                ...headers,
            },
        };

        if (a.$body !== undefined && (method as string) !== "GET") {
            const body = a.$body as Record<string, any>;
            const encoding = body?.$encoding;

            if (encoding === "application/x-www-form-urlencoded") {
                (init.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
                const params = new URLSearchParams();
                for (const [k, v] of Object.entries(body)) {
                    if (k === "$encoding") continue;
                    if (v === undefined || v === null) continue;
                    params.set(k, String(v));
                }
                init.body = params.toString();
            } else {
                (init.headers as Record<string, string>)["Content-Type"] = "application/json";
                init.body = JSON.stringify(a.$body);
            }
        }

        const res = await fetchImpl(url.toString(), init);

        if (!res.ok) {
            let message: string;
            if (res.headers.get("content-type")?.startsWith("application/json")) {
                await res.json().then((error) => message = error?.message ?? JSON.stringify(error));
            } else {
                const detail = await res.text().catch(() => "");
                message = `HTTP ${res.status} ${res.statusText}: ${detail}`;
            }
            // @ts-ignore
            throw new Error(message, {cause: res});
        }

        if ((method as string) === "DELETE") return undefined as Ret<P, M>;

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            const txt = await res.text().catch(() => "");
            return (txt ? (txt as any) : undefined) as Ret<P, M>;
        }

        return (await res.json()) as Ret<P, M>;
    };

    const renewToken = async (force: boolean = false, requestInit?: RequestInit) => {
        if (!config.clientConfig) return context.token.access_token;
        if (context.token.valid() && !force) return context.token.access_token;
        if (!config.subscriptionKey) throw new Error("Missing subscription key for token renewal");

        const body: TokenBody = {
            grant_type: config.clientConfig.grantType ?? "client_credentials",
            client_id: config.clientConfig.clientId,
            client_secret: config.clientConfig.clientSecret,
            scope: config.clientConfig.scope,
            $encoding: "application/x-www-form-urlencoded",
        };

        const query: TokenQuery = {"subscription-key": config.subscriptionKey};

        const token = await request("/api/v1/tokens", "POST", {
            $query: query,
            $headers: config.apiKey ? {"Api-Key": config.apiKey} : undefined,
            $body: body,
        } as Params<"/api/v1/tokens", "POST">, requestInit);

        context.token.access_token = token.access_token;
        context.token.expires_at = Date.now() + token.expires_in * 1000;
        return context.token.access_token;
    };

    const withAuth = async <T>(fn: () => Promise<T>, requestInit?: RequestInit): Promise<T> => {
        if (config.clientConfig) {
            await renewToken(false, requestInit);
        }
        return fn();
    };

    const resolveVesselId = async (vessel_id?: string, requestInit?: RequestInit): Promise<string> => {
        if (vessel_id) return vessel_id;
        if (context.vessel_id) return context.vessel_id;

        const metadataQuery: MetadataQuery = {
            "subscription-key": config.subscriptionKey ?? "",
            yardNumber: config.yardNumber ?? "",
        };

        if (!metadataQuery["subscription-key"] || !metadataQuery.yardNumber) {
            throw new Error("Missing vessel_id context and insufficient metadata defaults. Provide sensors(vessel_id) or set subscriptionKey + yardNumber in client config.");
        }

        const metadata = await withAuth(() => request("/api/v1/metadata/vessels", "GET", {$query: metadataQuery}, requestInit), requestInit);
        context.vessel_id = String(metadata.vesselInfo.id);
        return context.vessel_id;
    };

    return {
        metadata: async (options?: Partial<MetadataQuery>, requestInit?: RequestInit) => {
            const query: MetadataQuery = {
                "subscription-key": options?.["subscription-key"] ?? config.subscriptionKey ?? "",
                yardNumber: options?.yardNumber ?? config.yardNumber ?? "",
            };

            if (!query["subscription-key"] || !query.yardNumber) {
                throw new Error("metadata requires 'subscription-key' and 'yardNumber' (pass options or set defaults in client config).");
            }

            const metadata = await withAuth(() => request("/api/v1/metadata/vessels", "GET", {$query: query}, requestInit), requestInit);
            context.vessel_id = String(metadata.vesselInfo.id);
            return metadata;
        },
        sensors: (vessel_id?: string) => ({
            list: async (requestInit?: RequestInit) => {
                if (!config.subscriptionKey || !config.yardNumber) throw new Error("metadata requires 'subscription-key' and 'yardNumber' (pass options or set defaults in client config).");
                const metadata = await withAuth(() =>
                        request("/api/v1/metadata/vessels", "GET", {
                            $query: {
                                "subscription-key": config.subscriptionKey!,
                                yardNumber: config.yardNumber!
                            }
                        }, requestInit),
                    requestInit
                );
                context.vessel_id = String(metadata.vesselInfo.id);
                return metadata.sensorInfo;
            },
            sensor: (sensor_id: string) => ({
                latest_reading: async (
                    query?: Partial<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings/latest", "GET">>,
                    requestInit?: RequestInit,
                ) => {
                    const resolvedVesselId = await resolveVesselId(vessel_id, requestInit);
                    return withAuth(() => request("/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings/latest", "GET", {
                        $path: {vessel_id: resolvedVesselId, sensor_id},
                        $query: mergeSubscriptionKey<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings/latest", "GET">>(query),
                    }, requestInit), requestInit);
                },
                readings: async (
                    query?: Partial<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings", "GET">>,
                    requestInit?: RequestInit,
                ) => {
                    const resolvedVesselId = await resolveVesselId(vessel_id, requestInit);
                    return withAuth(() => request("/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings", "GET", {
                        $path: {vessel_id: resolvedVesselId, sensor_id},
                        $query: mergeSubscriptionKey<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings", "GET">>(query),
                    }, requestInit), requestInit);
                },
            }),
            data: async (
                query?: Partial<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/data", "GET">>,
                requestInit?: RequestInit,
            ) => {
                const resolvedVesselId = await resolveVesselId(vessel_id, requestInit);
                return withAuth(() => request("/api/v1/vessels/{vessel_id}/sensors/data", "GET", {
                    $path: {vessel_id: resolvedVesselId},
                    $query: mergeSubscriptionKey<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/data", "GET">>(query),
                }, requestInit), requestInit);
            },
            virtualsensors: {
                latest_reading: async (
                    query?: Partial<QueryOf<"/api/v1/vessels/{vessel_id}/virtualsensors/readings/latest", "GET">>,
                    requestInit?: RequestInit,
                ) => {
                    const resolvedVesselId = await resolveVesselId(vessel_id, requestInit);
                    return withAuth(() => request("/api/v1/vessels/{vessel_id}/virtualsensors/readings/latest", "GET", {
                        $path: {vessel_id: resolvedVesselId},
                        $query: mergeSubscriptionKey<QueryOf<"/api/v1/vessels/{vessel_id}/virtualsensors/readings/latest", "GET">>(query),
                    }, requestInit), requestInit);
                },
            },
            latest_readings: async (
                query?: Partial<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/readings/latest", "GET">>,
                requestInit?: RequestInit,
            ) => {
                const resolvedVesselId = await resolveVesselId(vessel_id, requestInit);
                return withAuth(() => request("/api/v1/vessels/{vessel_id}/sensors/readings/latest", "GET", {
                    $path: {vessel_id: resolvedVesselId},
                    $query: mergeSubscriptionKey<QueryOf<"/api/v1/vessels/{vessel_id}/sensors/readings/latest", "GET">>(query),
                }, requestInit), requestInit);
            },
        }),
        token: {
            create: async (
                body: BodyOf<"/api/v1/tokens", "POST">,
                query?: Partial<QueryOf<"/api/v1/tokens", "POST">>,
                requestInit?: RequestInit,
            ) => {
                const token = await request("/api/v1/tokens", "POST", {
                    $query: mergeSubscriptionKey<QueryOf<"/api/v1/tokens", "POST">>(query),
                    $headers: config.apiKey ? {"Api-Key": config.apiKey} : undefined,
                    $body: body,
                }, requestInit);

                context.token.access_token = token.access_token;
                context.token.expires_at = Date.now() + token.expires_in * 1000;
                return token;
            },
            renew: (force: boolean = false, requestInit?: RequestInit) => renewToken(force, requestInit),
            valid: () => context.token.valid(),
        },
        request, // optional: expose the generic request
    };
};

export default client;
// endregion
