(function() {
    "use strict";

    // namespace to hold global system related variables
    window.system = window.system || {};

    // global type definitions
    system.types = {
        DIR: 'd',
        TEXT: 't',
        ALL: '*'
    };

    system.typeTrans = {
        d: 'directory',
        t: 'text file'
    };

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

    // define syncing function
    system.sync = function(whatToSync, cloud) {
        var keys, data;
        if (!whatToSync) {
            keys = _.keys(system);
        } else {
            keys = (whatToSync instanceof Array) ? whatToSync : [whatToSync];
        }
        if(cloud) {
            openStorage.set(system, function(success) {
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
        console.log(localStorage.root);
    };

    // hidden text input element where commands are entered
    var cmd = document.getElementById('cmd');

    // register objects to be synced
    system.registerSyncObjects([
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
                name: 'root',
                parent: null,
                type: system.types.DIR,
                children: []
            }
        },
        {
            name: 'secret',
            base: {
                key: null
            }
        }
    ]);

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
