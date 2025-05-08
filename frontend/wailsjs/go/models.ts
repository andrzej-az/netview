export namespace main {
	
	export class Host {
	    ipAddress: string;
	    hostname?: string;
	    macAddress?: string;
	    os?: string;
	    openPorts?: number[];
	
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
	    }
	}
	export class ScanRange {
	    startIp: string;
	    endIp: string;
	
	    static createFrom(source: any = {}) {
	        return new ScanRange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startIp = source["startIp"];
	        this.endIp = source["endIp"];
	    }
	}

}

