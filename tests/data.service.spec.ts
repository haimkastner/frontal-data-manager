import { expect } from 'chai';
import { describe } from 'mocha';
import { DataService, LocalCacheMode } from '../src/data-service-base';
import axios from 'axios';

const DEFAULT_VALUE = 'The default value';
const VALUE_TO_PORT_MANUALLY = 'The posted value';
const ERROR_VALUE_TO_THROW = 'The very sad error message';

// Declare a service
class MyService extends DataService<string> { // Set the service Type by the Generic type on declaration
    constructor() {
        super(DEFAULT_VALUE); // Set the service default value
    }

    // The abstract fetch-data function to implement
    async fetchData(): Promise<string> {
        // Do the fetch and return the wanted data
        const response = await axios.get('https://api.chucknorris.io/jokes/random');
        return response?.data?.value;
    }
}
export const myService = new MyService();

class MySecondService extends DataService<string> { // Set the service Type by the Generic type on declaration
    constructor() {
        super(DEFAULT_VALUE); // Set the service default value
    }

    // The abstract fetch-data function to implement
    async fetchData(): Promise<string> {
        return 'hard-coded value';
    }
}
export const mySecondService = new MySecondService();


class MyBootCacheService extends DataService<string> {
    constructor() {
        super(DEFAULT_VALUE, {
            localCacheMode: LocalCacheMode.BOOT_ONLY
        });
    }

    async fetchData(): Promise<string> {
        const response = await axios.get('https://api.chucknorris.io/jokes/random');
        return response?.data?.value;
    }
}
export const myBootCacheService = new MyBootCacheService();

class MyFullCacheService extends DataService<string> {
    constructor() {
        super(DEFAULT_VALUE, {
            localCacheMode: LocalCacheMode.FULL
        }); 
    }
    async fetchData(): Promise<string> {
        const response = await axios.get('https://api.chucknorris.io/jokes/random');
        return response?.data?.value;
    }
}
export const myFullCacheService = new MyFullCacheService();

describe('# Data Service Full Cache Tests', () => {

    it('Should be initiated with the provided default value without cache', () => {
        expect(myFullCacheService.data).equal(DEFAULT_VALUE);
    });

    let firstFetchedJoke = '';

    it('Should be get data and load local cache', async () => {
        firstFetchedJoke = await myFullCacheService.getData();
        expect(firstFetchedJoke).not.equal(DEFAULT_VALUE);
        expect(myFullCacheService.data).equal(firstFetchedJoke);
        expect(JSON.parse(localStorage.getItem(myFullCacheService.constructor.name) as string)).equal(firstFetchedJoke);
    });

    it('Should be initiated and mark as ready with the local cache', async () => {
        const anotherFullCacheService = new MyFullCacheService();
        const secondFetchedJoke = await anotherFullCacheService.getData();
        expect(secondFetchedJoke).not.equal(DEFAULT_VALUE);
        expect(anotherFullCacheService.data).equal(myFullCacheService.data).equal(firstFetchedJoke).equals(secondFetchedJoke);
    });

    it('Should be initiated regularly is case of broken local cache', async () => {
        localStorage.setItem(myFullCacheService.constructor.name as string, 'not a valid json at all');
        const anotherFullCacheService = new MyFullCacheService();
        const thirdFetchedJoke = await anotherFullCacheService.getData();
        expect(thirdFetchedJoke).not.equal(DEFAULT_VALUE).not.equal(firstFetchedJoke);
    });
});

describe('# Data Service Boot Cache Tests', () => {

    it('Should be initiated with the provided default value without cache', () => {
        expect(myBootCacheService.data).equal(DEFAULT_VALUE);
    });

    let firstFetchedJoke = '';

    it('Should be get data and load local cache', async () => {
        firstFetchedJoke = await myBootCacheService.getData();
        expect(firstFetchedJoke).not.equal(DEFAULT_VALUE);
        expect(myBootCacheService.data).equal(firstFetchedJoke);
        expect(JSON.parse(localStorage.getItem(myBootCacheService.constructor.name) as string)).equal(firstFetchedJoke);
    });

    it('Should be initiated with cache but mark as not ready yet', async () => {
        const anotherFullCacheService = new MyBootCacheService();
        expect(anotherFullCacheService.data).not.equal(DEFAULT_VALUE);
        expect(anotherFullCacheService.data).equal(firstFetchedJoke);
    
        const secondFetchedJoke = await anotherFullCacheService.getData();
        expect(secondFetchedJoke).not.equal(DEFAULT_VALUE).not.equal(firstFetchedJoke);
        expect(JSON.parse(localStorage.getItem(myBootCacheService.constructor.name) as string)).equal(secondFetchedJoke);
    });
});

describe('# Data Service Tests', () => {

    let firstFetchedJoke = '';

    it('Should be initiated with the provided default value', () => {
        expect(myService.data).equal(DEFAULT_VALUE);
    });

    it('Should load data from API on first get data', async () => {
        firstFetchedJoke = await myService.getData();
        expect(firstFetchedJoke).not.equal(DEFAULT_VALUE);
    });

    it('Should use the cached data in the second attempt to get data', async () => {
        const secondFetchedJoke = await myService.getData();
        expect(firstFetchedJoke).equal(secondFetchedJoke);
    });

    it('Should refetch data on force data fetch', async () => {
        const forcedFetchFetchedJoke = await myService.forceFetchData();
        expect(firstFetchedJoke).not.equal(forcedFetchFetchedJoke);
        expect(myService.data).equal(forcedFetchFetchedJoke);
    });

    it('Reset service should reset data to default', async () => {
        myService.reset();
        expect(myService.data).equal(DEFAULT_VALUE);
    });

    it('Post new data should set it for further use', async () => {
        myService.postNewData(VALUE_TO_PORT_MANUALLY);
        const postedValue = await myService.getData();
        expect(postedValue).equal(VALUE_TO_PORT_MANUALLY);
    });

    it('Reset all services should reset data to default', async () => {
        await mySecondService.getData();
        DataService.resetAppData();
        expect(myService.data).equal(DEFAULT_VALUE);
        expect(mySecondService.data).equal(DEFAULT_VALUE);
    });

    it('After reset fetched flag should be off', async () => {
        expect(myService.fetchFlag).equal(false);
    });

    it('After reset started fetch flag should be off', async () => {
        expect(myService.fetchStartedFlag).equal(false);
    });

    it('Trigger load & await to load & loading flags should wor properly', async () => {
        myService.triggerLoad();

        // Once fetch started, fetch started flag should be ON
        const fetchStartedFlagAfterRequestStarted = myService.fetchStartedFlag;
        expect(fetchStartedFlagAfterRequestStarted).equal(true);

        // Once fetch started, data fetch flag should be still OFF
        const fetchFlagAfterRequestStarted = myService.fetchFlag;
        expect(fetchFlagAfterRequestStarted).equal(false);

        const beforeLoadData = myService.data;
        await myService.awaitToLoad();
        // Once fetch finished, fetch started flag should be ON
        const fetchStartedFlagAfterRequestFinished = myService.fetchStartedFlag;
        expect(fetchStartedFlagAfterRequestFinished).equal(true);

        // Once started data fetch flag should be ON
        const fetchFlagAfterRequestFinished = myService.fetchFlag;
        expect(fetchFlagAfterRequestFinished).equal(true);

        const afterLoadData = myService.data;
        await myService.awaitToLoad();
        const afterSecondAwaitLoadData = myService.data;

        expect(beforeLoadData).not.equal(afterLoadData);
        expect(afterLoadData).equal(afterSecondAwaitLoadData);
    });

    it('Subscription to data feed should gives the new data after refetch', (done) => {
        let callsIndex = 0;
        const dataBeforeNewFetch = myService.data;

        myService.attachDataSubs((value) => {
            callsIndex++;

            // On first call, it should be the data as is before any new fetch
            if (callsIndex === 1) {
                expect(myService.data).equal(value);
                return;
            }

            // On the second call, it should be the update call
            expect(myService.data).equal(value);
            // And the value should be diff
            expect(myService.data).not.equal(dataBeforeNewFetch);
            done();
        });

        // After configuring the feed callback, trigger new data fetch
        myService.forceFetchData();
    });

    it('Failure in the data fetch should be throw and flag to reset', async () => {
        class MyFailedService extends DataService<string> { // Set the service Type by the Generic type on declaration
            constructor() {
                super(DEFAULT_VALUE); // Set the service default value
            }
            async fetchData(): Promise<string> {
                throw new Error(ERROR_VALUE_TO_THROW);
            }
        }
        const myFailedService = new MyFailedService();
        try {
            await myFailedService.getData();
        } catch (error) {
            expect(error.message).equal(ERROR_VALUE_TO_THROW);
        }
        expect(myFailedService.fetchFlag).equal(false);
        expect(myFailedService.fetchStartedFlag).equal(false);
    });

    it('Get & Modify default value should not affect service default value', async () => {
        const defaultValue = {
            modified: false
        };
        class MyService extends DataService<any> { // Set the service Type by the Generic type on declaration
            constructor() {
                super(defaultValue);
            }
            async fetchData(): Promise<string> {
                return '';
            }
        }
        const myService = new MyService();
        const guttedDefaultValue = myService.defaultData;
        expect(guttedDefaultValue).deep.equal(defaultValue);
        guttedDefaultValue.modified = true;
        expect(guttedDefaultValue).not.deep.equal(defaultValue);
    });
});
