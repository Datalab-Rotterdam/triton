export type SensorInfo = {
    id: number,
    name: string,
    quantityName: string,
    unit: string,
    samplingInterval: number,
    source: string,
    sourceDetail: string
}

export type VesselInfo = {
    id: number,
    name: null | string,
    displayName: string,
    timeZone: string
};

export type MetadataService = {
    "/api/v1/metadata/vessels": {
        /**
         * Get Metadata for a vessel by yard number.
         *
         * Api to fetch vessel metadata by yard number
         * @see [Get Metadata for a vessel by yard number](https://tritonservices.developer.azure-api.net/api-details#api=607ee0277f74b66bbeac7da7&operation=607ee02aedee7708f7a865f3)
         */
        "GET": {
            parameters: {
                $query: {
                    /**
                     * Users Unique Subscription Key
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "subscription-key": string,
                    /**
                     * Yard number
                     */
                    "yardNumber": string
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "Api-Key"?: string
                }
            },
            return: {
                vesselInfo: VesselInfo,
                sensorInfo: SensorInfo[]
            }
        }
    }
}
