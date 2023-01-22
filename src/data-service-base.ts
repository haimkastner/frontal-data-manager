import { SyncEvent } from 'ts-events';
import clonedeep from 'lodash.clonedeep';

/** Implementation of base class for common data fetch and publish as event logic */
export abstract class DataService<T> {

    /**
     * Collection of all services instances, used to allow forcing reset refetch and so on for all app data
     */
    private static dataServicesInstances: DataService<any>[] = [];

    /** The data */
    protected _data: T;

    /** The data event publisher event */
    private _dataFeed = new SyncEvent<T>();

    // The data that this service will be reset to
    private _defaultData: T;

    /** The flag to detect whenever the data already fetched from the API */
    private _fetchFlag = false;

    /** The flag to detect whenever the data started fetched process from the API */
    private _fetchStartedFlag = false;

    constructor(defaultData: T = undefined as unknown as T) {
        this._defaultData = defaultData;

        this._data = clonedeep(this._defaultData);
        // Once services created, add it to the services collection
        DataService.dataServicesInstances.push(this);
    }

    /** Get service data AS IS (without triggering anything :) */
    public get data(): T {
        return this._data;
    }

    /** Get the default data */
    public get defaultData(): T {
        // Return a full copy and not the ref, to make sure the default not modified by mistake  
        return clonedeep(this._defaultData);
    }

    /** The flag to detect whenever the data already fetched from the API */
    public get fetchFlag(): boolean {
        return this._fetchFlag;
    }

    /** The flag to detect whenever the data started fetched process from the API */
    public get fetchStartedFlag(): boolean {
        return this._fetchStartedFlag;
    }

    /** The child required to implement this function, to fetch the data from the API or any other resource */
    protected abstract fetchData(): Promise<T>;

    /** Get the date, if it's not fetched yet it will be fetch */
    public async getData(): Promise<T> {
        if (this._fetchFlag) {
            return this._data;
        }
        return await this.forceFetchData();
    }

    /**
     * Force data hard refresh
     * @returns THe new data
     */
    public async forceFetchData(): Promise<T> {
        try {
            this._fetchStartedFlag = true;
            // Fetch the data
            const dataResponse = await this.fetchData();
            // Mark the flag as fetched
            this._fetchFlag = true;
            // Keep the data
            this._data = dataResponse;
            // Publish the new data to the subscribers
            this._dataFeed.post(dataResponse);
            return dataResponse;
        } catch (error) {
            // TODO:LOG

            // Mark flag as false for next time
            this._fetchFlag = false;
            this._fetchStartedFlag = false;
            throw error;
        }

    }

    /**
     * Add subscriber to the data feed
     * @param callback The function to call when a new data will published
     * @returns The unsubscribe callback for detacher
     */
    public async attachDataSubs(callback: (data: T) => void): Promise<() => void> {
        // Add the callback to the feed event
        const detacher = this._dataFeed.attach(callback);
        // Data has been never fetched, do it now, else, just post again the data for the new subscriber
        if (!this._fetchStartedFlag) {
            await this.forceFetchData();
        } else if (this._fetchFlag) {
            this._dataFeed.post(this._data);
        }
        return detacher;
    }

    /**
     * Trigger load, and await for it if not yet fetched
     */
    public async triggerLoad(): Promise<void> {
        // Data has been never fetched, do it now, else, just post again the data for the new subscriber
        if (!this._fetchStartedFlag && !this._fetchFlag) {
            await this.forceFetchData();
        }
    }

    /**
     * Await till the data will be fetch
     */
    public async awaitToLoad(): Promise<void> {
        return new Promise<void>((res, rej) => {
            if (this._fetchFlag) {
                res();
                return;
            }
            const detacher = this._dataFeed.attach(() => {
                detacher();
                res();
            });
        });
    }

    /**
     * Publish and update a new data
     * @param data The new data
     */
    public postNewData(data: T) {
        // First clone the object, to avoid issues in the react state when the object is the same prototype instance
        // and to make sure the changes will do affect any component state
        const clonedData = clonedeep(data);
        // Update and publish the new data
        this._data = clonedData;
        this._fetchFlag = true;
        this._fetchStartedFlag = true;
        this._dataFeed.post(clonedData);
    }

    /**
     * Reset data and state
     */
    public reset() {
        this._data = clonedeep(this._defaultData);
        this._fetchFlag = false;
        this._fetchStartedFlag = false;
    }

    /**
     * Reset all data services
     */
    public static resetAppData() {
        for (const dataServiceInstance of DataService.dataServicesInstances) {
            dataServiceInstance.reset();
        }
    }
}
