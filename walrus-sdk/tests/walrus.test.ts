import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { WalrusSDK } from "../app/services/walrus";

describe("Walrus SDK", () => {
    let sdk: WalrusSDK;
    let mock: MockAdapter;

    beforeAll(() => {
        // Initialize SDK with test URLs
        sdk = new WalrusSDK({
            aggregator: "https://aggregator.walrus-testnet.walrus.space",
            publisher: "https://publisher.walrus-testnet.walrus.space",
            apiUrl: "http://localhost:8000/api/walrus",
        });

        // Set up Axios mock adapter
        mock = new MockAdapter(axios);
    });

    afterEach(() => {
        mock.reset();
    });

    it("should store a blob and return response", async () => {
        const mockResponse = {
            newlyCreated: {
                blobObject: {
                    id: "0x123",
                    blobId: "y1GuyqLZ6IhZGHvHnoSKGQVexrTD6vqssfHxkTrs9cc",
                    size: 100,
                },
            },
        };

        // Mock the API request
        mock.onPut("https://publisher.walrus-testnet.walrus.space/v1/store?epochs=1").reply(200, mockResponse);

        // Test the function
        const response = await sdk.storeBlob("test data", 1);
        expect(response).toEqual(mockResponse);
    });

    // it("should retrieve a blob by ID", async () => {
    //     const mockBlobData = "test blob data";

    //     // Mock the API request
    //     mock.onGet("https://aggregator.walrus-testnet.walrus.space").reply(200, mockBlobData);

    //     // Test the function
    //     const response = await sdk.getBlob("y1GuyqLZ6IhZGHvHnoSKGQVexrTD6vqssfHxkTrs9cc");
    //     expect(response.toString()).toEqual(mockBlobData);
    // });

    // it("should fetch the API specification", async () => {
    //     const mockApiSpec = {
    //         version: "1.0",
    //         endpoints: ["store", "getBlob"],
    //     };

    //     // Mock the API request
    //     mock.onGet("https://aggregator.test/v1/api").reply(200, mockApiSpec);

    //     // Test the function
    //     const response = await sdk.getApiSpecification();
    //     expect(response).toEqual(mockApiSpec);
    // });
});
