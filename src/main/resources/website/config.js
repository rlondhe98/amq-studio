const CONFIG = {
    // Base URL of the Mule application
    // Use '' (empty) when served from the Mule app itself, or 'http://localhost:8081' for external dev server
    BASE_URL: '',

    // Whether test/manual mode toggle is enabled (injected from property file via parse-template)
    TEST_MODE_ENABLED: #[Mule::p('app.testModeEnabled') == 'true'],

    // Default connection parameters (leave empty to require user input)
    DEFAULTS: {
        region: '',
        orgId: '',
        envId: '',
        clientId: '',
        clientSecret: '',
        queueName: ''
    }
};
