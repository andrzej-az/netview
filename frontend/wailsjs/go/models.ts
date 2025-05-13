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

	// Added Host model to match Go backend Host struct
	export class Host {
	    ipAddress: string;
	    hostname?: string;
	    macAddress?: string;
	    os?: string;
	    openPorts?: number[];
	    deviceType?: string;

	    static createFrom(source: any = {}) {
	        return new Host(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ipAddress = source["ipAddress"];
	        this.hostname = source["hostname"];
	        this.macAddress = source["macAddress"];
	        this.os = source["os"];
	        this.openPorts = source["openPorts"];
	        this.deviceType = source["deviceType"];
	    }
	}
}
