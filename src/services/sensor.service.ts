export type SensorReading = {
    sensorId: number,
    samplingFrequency: number,
    sensorValue: number,
    timestamp: number
}

export type SensorService = {
    "/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings/latest": {
        /**
         * Get the latest reading of a sensor.
         *
         * Api to fetch the latest sensor reading
         * https://tritonservices.developer.azure-api.net/api-details#api=sensor-services&operation=get-latest-reading-of-a-sensor
         */
        "GET": {
            parameters: {
                $path: {
                    /**
                     * Vessel Identifier
                     */
                    vessel_id: string | number,
                    /**
                     * Sensor Identifier
                     */
                    sensor_id: string | number
                }
                $query: {
                    /**
                     * Subscription key
                     // * @default uses top level context.
                     // * for local override provide value here
                     */
                    "subscription-key": string
                    /**
                     * virtual sensor identifier
                     * //TODO Klopt niet met docs description
                     */
                    "isManualInput"?: boolean
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context Api-Key override here
                     */
                    "Api-Key"?: string,
                    /**
                     * Unique API Key for the User Subscription
                     * @default uses top level context Authorization override here
                     */
                    "Authorization"?: string
                },
            },
            return: SensorReading
        }
    },
    "/api/v1/vessels/{vessel_id}/virtualsensors/readings/latest": {
        /**
         * Get the Latest Reading of a Virtual Sensor
         * Api to fetch the latest virtual sensor reading
         * @see https://tritonservices.developer.azure-api.net/api-details#api=sensor-services&operation=get-latest-reading-of-a-virtual-sensor
         */
        "GET": {
            parameters: {
                $path: {
                    /**
                     * Vessel Identifier
                     */
                    vessel_id: string | number,
                },
                $query: {
                    /**
                     * Subscription key
                     // * @default uses top level context.
                     // * for local override provide value here
                     */
                    "subscription-key": string
                    /**
                     * virtual sensor identifier
                     */
                    "virtualsensor_id": string | number
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context Api-Key override here
                     */
                    "Api-Key"?: string,
                    /**
                     * Unique API Key for the User Subscription
                     * @default uses top level context Authorization override here
                     */
                    "Authorization"?: string
                },
            },
            return: object
        }
    }
    "/api/v1/vessels/{vessel_id}/sensors/readings/latest": {
        /**
         * Get the Latest Reading of Multiple Sensors
         *
         * API to fetch the latest multiple sensor readings.
         *
         * isManualInput needs to be true in case virtual sensor readings need to be retrieved irrespective of the sensor ID that has been requested
         * @see [Get Latest Reading of Multiple Sensors](https://tritonservices.developer.azure-api.net/api-details#api=sensor-services&operation=get-latest-reading-of-multiple-sensors)
         */
        "GET": {
            parameters: {
                $path: {
                    /**
                     * Vessel Identifier
                     */
                    vessel_id: string | number
                },
                $query: {
                    /**
                     * Subscription key
                     // * @default uses top level context.
                     // * for local override provide value here
                     */
                    "subscription-key": string,
                    /**
                     * Physical sensor identifiers (Maximum allowed 100 when no 'virtualsensor_ids' are present)
                     * @example 1000,10001,10002
                     */
                    id?: string[] | number[] | string | number
                    /**
                     * Virtual sensor indicator //TODO Geen idee of dit wel goed beschreven is??
                     *
                     * @values true | false | 0 | 1 //TODO 0 | 1 werkt hier ook
                     */
                    isManualInput: boolean,
                    /**
                     * Virtual sensor Identifiers
                     * @maximum 100 when no 'id' are present
                     * @example "49275887-7132-ED11-A27C-000D3AB244EA","E1843D7A-7132-ED11-A27C-000D3AB244EA"
                     */
                    virtualsensor_ids?: string[] | number[]
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "Api-Key"?: string,
                    /**
                     * Unique API Key for the User Subscription
                     * @default uses top level context.
                     * for override provide value here
                     */
                    "Authorization"?: string
                },
            },
            return: {
                sensors: SensorReading[],
                nocontentsensors: string[] //TODO Geef hier een array van sensor id's as number niet als string niet consistent met sensor_id type
            };
        }
    },
    "/api/v1/vessels/{vessel_id}/sensors/data": {
        /**
         * Get Sensor data file URI
         * @see https://tritonservices.developer.azure-api.net/api-details#api=sensor-services&operation=60a3c6bffb661600d774208a
         */
        "GET": {
            parameters: {
                $path: {
                    /**
                     * Vessel Identifier
                     */
                    vessel_id: string | number,
                },
                $query: {
                    /**
                     * Subscription key
                     // * @default uses top level context.
                     // * for local override provide value here
                     */
                    "subscription-key": string
                    /**
                     * Time Span in UTC, format is YYYYMMDDHH
                     */
                    "timespan": string,
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context.
                     * for override provide value here
                     */
                    "Api-Key"?: string,
                    /**
                     * Unique API Key for the User Subscription
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "Authorization"?: string
                },
            }
            return: object;
        }
    },
    "/api/v1/vessels/{vessel_id}/sensors/{sensor_id}/readings": {
        /**
         * Get Sensor Readings for a Duration.
         *
         * Api to fetch the sensor readings for a duration <=1 hour
         * https://tritonservices.developer.azure-api.net/api-details#api=sensor-services&operation=5f1fff136c7889f5ce4c28f5
         */
        "GET": {
            parameters: {
                $path: {
                    /**
                     * Vessel Identifier
                     */
                    vessel_id: string,
                    /**
                     * Sensor Identifier
                     */
                    sensor_id: string
                }
                $query: {
                    /**
                     * Subscription key
                     // * @default uses top level context.
                     // * for local override provide value here
                     */
                    "subscription-key": string
                    /**
                     * Start Time in Milliseconds
                     * @extype long
                     */
                    "starttime": number,
                    /**
                     * End Time in Milliseconds
                     */
                    "endtime": number,
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "Api-Key"?: string,
                    /**
                     * Unique API Key for the User Subscription
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "Authorization"?: string
                },
            }
            return: object;
        }
    }
}
