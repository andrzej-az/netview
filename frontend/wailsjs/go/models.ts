export namespace main {
	
	export class ScanRange {
	    startIp: string;
	    endIp: string;
	    ports: number[];
	    searchHiddenHosts: boolean;
	    hiddenHostsPorts: number[];
	
	    static createFrom(source: any = {}) {
	        return new ScanRange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startIp = source["startIp"];
	        this.endIp = source["endIp"];
	        this.ports = source["ports"];
	        this.searchHiddenHosts = source["searchHiddenHosts"];
	        this.hiddenHostsPorts = source["hiddenHostsPorts"];
	    }
	}

	export class ScanHistoryItem {
	    startIp: string;
	    endIp: string;
	    timestamp: string; // Go time.Time is marshalled to ISO string

	    static createFrom(source: any = {}) {
	        return new ScanHistoryItem(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startIp = source["startIp"];
	        this.endIp = source["endIp"];
	        this.timestamp = source["timestamp"];
	    }
	}

}
