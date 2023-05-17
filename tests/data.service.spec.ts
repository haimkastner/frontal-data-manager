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

class MyCustomKeyCacheService extends DataService<string> {
    constructor(cacheKey: string | undefined) {
        super(DEFAULT_VALUE, {
            cacheKey,
            localCacheMode: LocalCacheMode.FULL,
        });
    }
    async fetchData(): Promise<string> {
        return 'the data';
    }
}
class MyListService extends DataService<any[]> {
    constructor() {
        super([]);
    }
    async fetchData(): Promise<any[]> {
        return ['item1'];
    }
}
export const myListService = new MyListService();

describe('# Data Service Full Cache Tests', () => {

    it('Should be initiated with the provided default value without cache', () => {
        expect(myFullCacheService.data).equal(DEFAULT_VALUE);
    });

    let firstFetchedJoke = '';

    it('Should be get data and load local cache', async () => {
        firstFetchedJoke = await myFullCacheService.getData();
        expect(firstFetchedJoke).not.equal(DEFAULT_VALUE);
        expect(myFullCacheService.data).equal(firstFetchedJoke);
        expect(JSON.parse(localStorage.getItem((myFullCacheService as any).getServiceCacheKey()) as string)).equal(firstFetchedJoke);
    });

    it('Should be initiated and mark as ready with the local cache', async () => {
        const anotherFullCacheService = new MyFullCacheService();
        const secondFetchedJoke = await anotherFullCacheService.getData();
        expect(secondFetchedJoke).not.equal(DEFAULT_VALUE);
        expect(anotherFullCacheService.data).equal(myFullCacheService.data).equal(firstFetchedJoke).equals(secondFetchedJoke);
    });

    it('Should be initiated regularly is case of broken local cache', async () => {
        localStorage.setItem((myFullCacheService as any).getServiceCacheKey(), 'not a valid json at all');
        const anotherFullCacheService = new MyFullCacheService();
        const thirdFetchedJoke = await anotherFullCacheService.getData();
        expect(thirdFetchedJoke).not.equal(DEFAULT_VALUE).not.equal(firstFetchedJoke);
    });

    it('Should remove local cache after data reset', async () => {
        localStorage.setItem((myFullCacheService as any).getServiceCacheKey(), 'not a valid json at all');
        const anotherFullCacheService = new MyFullCacheService();
        anotherFullCacheService.reset();
        expect(localStorage.getItem((myFullCacheService as any).getServiceCacheKey())).equal(null);
        expect(localStorage.getItem((myFullCacheService as any).getServiceCacheKey()))
            .not.equal(anotherFullCacheService.defaultData)
            .not.equal(anotherFullCacheService.data);
    });

    it('Should use cache key for local cache', async () => {
        const defaultKeyCacheService = new MyCustomKeyCacheService(undefined);
        const key = 'Custom_Key'
        const explicitKeyCacheService = new MyCustomKeyCacheService(key);
        const otherKey = 'Custom_Key'
        const otherExplicitKeyCacheService = new MyCustomKeyCacheService(otherKey);
        expect((defaultKeyCacheService as any).getServiceCacheKey())
            .not.equal((explicitKeyCacheService as any).getServiceCacheKey())
            .not.equal((otherExplicitKeyCacheService as any).getServiceCacheKey());

        const anotherDefaultKeyCacheService = new MyCustomKeyCacheService(undefined);
        expect((defaultKeyCacheService as any).getServiceCacheKey()).equal((anotherDefaultKeyCacheService as any).getServiceCacheKey());
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
        expect(JSON.parse(localStorage.getItem((myBootCacheService as any).getServiceCacheKey()) as string)).equal(firstFetchedJoke);
    });

    it('Should be initiated with cache but mark as not ready yet', async () => {
        const anotherFullCacheService = new MyBootCacheService();
        expect(anotherFullCacheService.data).not.equal(DEFAULT_VALUE);
        expect(anotherFullCacheService.data).equal(firstFetchedJoke);

        const secondFetchedJoke = await anotherFullCacheService.getData();
        expect(secondFetchedJoke).not.equal(DEFAULT_VALUE).not.equal(firstFetchedJoke);
        expect(JSON.parse(localStorage.getItem((myBootCacheService as any).getServiceCacheKey()) as string)).equal(secondFetchedJoke);
    });

    it('Subscription to data feed should gives the cache and then the new data', (done) => {
        const anotherFullCacheService = new MyBootCacheService();
        let callsIndex = 0;
        const dataBeforeNewFetch = anotherFullCacheService.data;
        const cacheData = JSON.parse(localStorage.getItem((myBootCacheService as any).getServiceCacheKey()) as string);
        anotherFullCacheService.attachDataSubs((value) => {
            callsIndex++;

            // On first call, it should be the data as is before any new fetch
            if (callsIndex === 1) {
                expect(value).equal(cacheData).equal(dataBeforeNewFetch);
                return;
            }

            // On the second call, it should be the update call
            expect(anotherFullCacheService.data).equal(value);
            // And the value should be diff
            expect(value).not.equal(cacheData);
            done();
        });
    });

    it('Should be mark as not from cache if cache is empty', async () => {
        const anotherCacheService = new MyBootCacheService() as any;
        expect(anotherCacheService._loadFromCache).equal(true);
        localStorage.setItem((myBootCacheService as any).getServiceCacheKey(), undefined as any);
        const another2CacheService = new MyBootCacheService() as any;
        expect(another2CacheService._loadFromCache).equal(false);
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

    it('Modifying getter service data not reflect in the service', async () => {
        await myListService.forceFetchData();
        const dataCopy = myListService.data;
        dataCopy.push(['item2']);
        expect(myService.data).not.deep.equal(dataCopy);
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
