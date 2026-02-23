export type TokenService = {
    "/api/v1/tokens": {
        /**
         * This service will generate a token from Azure active Directory Authentication App
         */
        "POST": {
            parameters: {
                $query: {
                    /**
                     * Users Unique Subscription Key
                     * @default uses top level context.
                     * for local override provide value here
                     */
                    "subscription-key": string
                },
                $headers?: {
                    /**
                     * Unique Key for the Subscribed user
                     * @default uses top level context Api-Key override here
                     */
                    "Api-Key"?: string
                },
                $body: {
                    grant_type: string,
                    client_id: string,
                    client_secret: string,
                    scope: string,
                    $encoding: "application/x-www-form-urlencoded"
                }
            },
            return: {
                "token_type": string,
                "expires_in": number,
                "ext_expires_in": number,
                "access_token": string
            }
        }
    }
}
