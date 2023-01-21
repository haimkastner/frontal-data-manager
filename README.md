# Frontal Data Manager

A lightweight and powerful service for frontend oriented data retrieval & management.

[![Build & Test Status](https://github.com/haimkastner/frontal-data-manager/workflows/frontal-data-manager/badge.svg?branch=main)](https://github.com/haimkastner/frontal-data-manager/actions) [![Coverage Status](https://coveralls.io/repos/github/haimkastner/frontal-data-manager/badge.svg?branch=main)](https://coveralls.io/github/haimkastner/frontal-data-manager?branch=main)

This package simplified the process of fetching data once and using it all over the application components without requiring a complex injection library such as MobX, Redux, etc.

Although it's a very lightweight package with a very simple API, it's still powerful and gives the ability for data updating from one place to all application components, which is a very common requirement in every front application implementation.

All this includes the ability for clearing cache, force re-fetch, and much more.

See below in the example section how easy it is.

The package also has a built-in React (v17.0.2) hook for easy-to-use React components.

## Install via NPM / Yarn:

```bash 

npm install frontal-data-manager

yarn add frontal-data-manager

```

## Using Example
```typescript
import { DataService } from 'frontal-data-manager';

// Declare a service
class MyService extends DataService<string> { // Set the service Type by the Generic type on declaration
	constructor() {
		super(''); // Set the service default value
	}

    // The abstract fetch-data function to implement
	async fetchData(): Promise<string> {
		// Do the fetch and return the wanted data
		const response = await fetch('https://api.chucknorris.io/jokes/random');
		const body = await response.json();
		return body.value;
	}
}
export const myService = new MyService();

// Get the date, if it's not fetched yet it will be fetch
const data = await myService.getData();
// Force data hard-refresh and return the new value
const newData = await myService.forceFetchData();
// Publish and update a new data
await myService.postNewData('A new value to set');
// Add subscriber to the data feed
const dispatcher = myService.attachDataSubs((value: string) => {
	console.log(`The data is now ${value}`)
});
```

Once the service is defined, you can use it extremely easily by the data hook, the first component loading will trigger data fetch if not been fetched yet, and will re-render the component with each data update from anywhere, with the new value.
 
## React 17 Hook Example
```typescript
import { useData } from "frontal-data-manager"
import { myService } from "./my-service";

export function MyComponent() {

    // Pass the service to the useData hook, that's it
    const [ data, loading, error] = useData(myService);

    return (<div>
        <span>Is Loading? {loading}</span>
        <span>Is Loading failed? {error}</span>
        <span>The Data: {data}</span>
    </div>)
}
```