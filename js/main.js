(function() {
    "use strict";

    // TESTING, log system to confirm that the other scripts have loaded
    console.log(system);

    // global type definitions
    system.types = {
        DIR:  'd',
        TEXT: 't',
        ALL:  '*'
    };

    // translation of type definitions
    system.typeTrans = {
        d: 'directory',
        t: 'text file'
    };

    // definition of syncable objects
    system.syncDef = [
        // user's aliases
        'aliases',
        // a history of inputted commands
        {
            name: 'commandHistory',
            base: []
        },
        // general system settings
        'settings',
        // root of the filesystem
        {
            name: 'root',
            base: {
                name:     'root',
                parent:   null,
                type:     system.types.DIR,
                children: []
            }
        },
        {
            name: 'secret',
            base: {
                key: null,
                timestamp: Date.now()
            }
        }
    ];

    // register syncable objects
    system.registerSyncObjects = function(defs) {
        defs = (defs instanceof Array) ? defs : [defs];
        _.each(defs, function(def) {
            if(!localStorage[def.name || def]) {
                localStorage[def.name || def] = JSON.stringify(def.base || {});
            }
            system[def.name || def] = JSON.parse(localStorage[def.name || def]);
        });
    };

    system.syncPropNames = (function() {
        var syncPropNames = [];
        _.each(system.syncDef, function(prop) {
            if(typeof prop === 'string') {
                syncPropNames.push(prop);
            } else if(typeof prop === 'object') {
                syncPropNames.push(prop.name);
            }
        });
        return syncPropNames;
    })();

    // gets the syncable properties of the current system object
    system.getSyncProps = function() {
        var syncProps = {};
        _.each(system.syncPropNames, function(prop) {
            syncProps[prop] = system[prop];
        });
        return syncProps;
    };

    // define syncing function
    system.sync = function(whatToSync, cloud) {
        var keys, data;
        if (!whatToSync) {
            keys = _.keys(system);
        } else {
            keys = (whatToSync instanceof Array) ? whatToSync : [whatToSync];
        }
        if(cloud && system.secret.key) {
            system.openStorage.set(system.getSyncProps(), function(success) {
                if(success) {
                    console.log('synced system to cloud');
                } else {
                    console.log('failed to sync system to cloud');
                }
            });
        }
        _.each(keys, function(key) {
            if (system[key]) {
                localStorage[key] = JSON.stringify(system[key]);
            }
        });
        // update the sync timestamp
        system.secret.timestamp = Date.now();
        console.log(localStorage.root);
    };

    // hidden text input element where commands are entered
    var cmd = document.getElementById('cmd');

    // register objects to be synced
    system.registerSyncObjects(system.syncDef);

    // set the user key for open storage
    system.openStorage.user_key = system.secret.key;

    // hold current position in command history
    system.historyIndex = system.commandHistory.length;

    // simple filesystem related functions loaded from filesystem.js
    system.fileSystem = system.createFileSystem(system.root);

    // initialize the filesystem
    system.fileSystem.init();

    // create angular module
    system.app = angular.module('browserOS',[]);

    // load ConsoleController into app
    system.app.controller('ConsoleController', system.createConsoleController(system.fileSystem));

    // focus on the input at start
    cmd.focus();

    // whenever the user clicks anywhere the command box is focused
    if (!window.addEventListener) {
        // handle old versions of IE...
        document.attachEvent('onclick', function(evt) {
            cmd.focus();
        });
    } else {
        window.addEventListener('click', function(evt) {
            cmd.focus();
        }, false);
    }

})();
