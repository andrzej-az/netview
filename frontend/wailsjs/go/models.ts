export namespace main {
	
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

