var system = system || {};

system.openStorage = {
    server_url: 'http://api.openkeyval.org/',
    user_key: '',
    set: function(data, callback) {
        this.ajax({
            url: this.server_url + 'store/',
            data: this.objToQuery(data),
            success: function(data) {
                console.log('saved data');
                if(callback) {
                    callback(data);
                }
            },
            error: function() {
                if(callback) {
                    callback(false);
                }
            }
        });
    },
    get: function(key, callback) {
        var keys      = this.removeDuplicates((key instanceof Array) ? key : [key]),
            returnObj = {},
            leftToGet = keys.length;
        for(var i = 0; i < keys.length; i++) {
            (function() {
                var key = keys[i];
                this.ajax({
                    url: this.server_url + encodeURIComponent(this.user_key + key),
                    success: function(data) {
                        console.log('successfully retrieved ' + key);
                        leftToGet -= 1;
                        returnObj[key] = data;
                        if(leftToGet === 0) {
                            callback(returnObj);
                        }
                    },
                    error: function() {
                        console.log('failed to retrieve ' + key);
                        leftToGet -= 1;
                        if(leftToGet === 0) {
                            callback(returnObj);
                        }
                    }
                });
            }).call(this);
        }
    },
    ajax: function(options) {
        var self         = this,
            script       = document.createElement('script'),
            callbackName = this.user_key + Date.now() + Math.floor(Math.random() * 4000);
        window[callbackName] = function(data) {
            options.success(self.cleanData(data));
        };
        script.async = options.async || true;
        script.onerror = options.error;
        script.src = options.url + '?callback=' + callbackName + (options.data ? ('&' + options.data) : '');
        document.body.appendChild(script);
    },
    objToQuery: function(obj) {
        var query = [];
        for(var key in obj) {
            query.push(this.user_key + key + '=' + encodeURIComponent(JSON.stringify(obj[key])));
        }
        return query.join('&');
    },
    cleanData: function(data) {
        return (typeof data === 'string') ? JSON.parse(decodeURIComponent(data)) : data;
    },
    isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},
    removeDuplicates: function(arr) {
        var found = false, returnArr = [];
        for(var i = 0; i < arr.length; i++) {
            for(var j = 0; j < returnArr.length; j++) {
                if(arr[i] === returnArr[j]) {
                    found = true;
                    break;
                }
            }
            if(!found) returnArr.push(arr[i]);
            found = false;
        }
        return returnArr;
    }
};