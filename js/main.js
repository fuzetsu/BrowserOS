(function() {
    "use strict";

    // global type definitions
    var Type = {
        DIR: 'd',
        TEXT: 't'
    };

    // hidden text input element where commands are entered
    var cmd = document.getElementById('cmd');

    // if aliases arent int local storage add them
    if(!localStorage.aliases) {
        localStorage.aliases = JSON.stringify({});
    }

    // if history isn't in local storage add it
    if(!localStorage.commandHistory) {
        localStorage.commandHistory = JSON.stringify([]);
    }

    // if settings isn't in local storage add it
    if(!localStorage.settings) {
        localStorage.settings = JSON.stringify({});
    }

    // namespace to hold system related variables
    var system = {};

    // array to hold a history of the commands entered
    system.commandHistory = JSON.parse(localStorage.commandHistory);
    var commandHistory = system.commandHistory;
    var historyIndex = commandHistory.length;

    // object to hold aliases
    system.aliases = JSON.parse(localStorage.aliases);
    var aliases = system.aliases;

    // object to hold settings
    system.settings = JSON.parse(localStorage.settings);
    var settings = system.settings;

    // if(!localStorage.files) {
    // initial setup of file-system in local-storage
    localStorage.root = JSON.stringify({
        name: 'root',
        parent: null,
        type: Type.DIR,
        children: []
    });
    // }

    // create angular module
    var app = angular.module('browserOS',[]);

    // register ConsoleController into our angular module
    app.controller('ConsoleController', function($scope) {

        // initialize our command
        $scope.command = '';
        // initialize array that holds the output on the screen
        $scope.output = [];

        // sets the colors of the terminal
        $scope.setColor = function() {
            $scope.bgc = settings.backgroundColor;
            $scope.fgc = settings.foregroundColor;
            $scope.psc = settings.promptColor;
            fileSystem.sync('settings');
        };

        $scope.setColor();

        // retrieves current working directory in string form
        $scope.workingDir = function() {
            return fileSystem.getFolderPath(fileSystem.currentFolder);
        };
        // builds the prompt line
        $scope.cmdPrompt = function() {
            return "admin@betaOS:[" + $scope.workingDir() + "]$ ";
        };
        // called when the user submits a command to process it
        $scope.execCommand = function() {
            processCommand(this.command);
            $scope.command = '';
        };

        // makes the calls necessary to process a command and display its output
        var processCommand = function(commandStr, alias) {
            if (commandStr) {
                commandHistory.push(commandStr);
                historyIndex = commandHistory.length;
                fileSystem.sync('commandHistory');
                var command = parseArgumentLine(commandStr),
                    curPrompt = $scope.cmdPrompt(),
                    result = doCommand(command[0], command.slice(1));
                // if we just got redirected to an alias then exit
                if(result === false) return;
                // always push the prompt line (if an alias was specified display that instead)
                $scope.output.push([curPrompt, alias || commandStr]);
                // if there was a result returned then push that as well
                if (result) {
                    if(result instanceof Array) {
                        $scope.output = $scope.output.concat(_.map(result, function(line) {
                            return ['', line];
                        }));
                    } else {
                        $scope.output.push(['', result]);
                    }
                }
                // scroll to bottom after render
                setTimeout(function() {
                    window.scroll(0, document.body.scrollHeight);
                }, 0);
            }
        };

        // ridiculous function to go through the command and create the array of command / parameters
        var parseArgumentLine = function(argumentLine) {
            var result = [],
                current,
                characters = argumentLine.split('').reverse(),
                reset = true,
                c = characters.pop();
            while(c) {
                while(c === ' ') {
                    c = characters.pop();
                }
                if(c === '"') {
                    if(reset) current = '';
                    c = characters.pop();
                    while(c && c !== '"') {
                        current += c;
                        c = characters.pop();
                    }
                    if(c === '"') {
                        c = characters.pop();
                    }
                    if(c && c !== ' ' && c !== '"') {
                        reset = false;
                    } else {
                        result.push(current);
                        reset = true;
                    }
                } else {
                    if(reset) current = '';
                    do {
                        current += c;
                        c = characters.pop();
                    } while(c && c !== ' ' && c !== '"');
                    if(c !== '"') {
                        result.push(current);
                        reset = true;
                    } else {
                        reset = false;
                    }
                }
            }
            return result;
        };

        // executes a command and hands off the passed parameters to it
        var doCommand = function(command, parameters) {
            if(aliases[command]) {
                processCommand(aliases[command], command);
                return false;
            } else if (commands[command]) {
                return commands[command].apply(commands, parameters);
            } else {
                return "error: command '" + command + "' not found";
            }
        };

        // object containing all base commands and their implementations
        var commands = {
            echo: function() {
                if (!arguments[0]) return "usage: echo <statement>";
                return Array.prototype.slice.call(arguments).join(' ');
            },
            date: function() {
                return new Date().toLocaleString();
            },
            clear: function() {
                $scope.output = [];
                return false;
            },
            pwd: function() {
                return fileSystem.getCurrentPath();
            },
            cd: function() {
                if (!arguments[0]) return "usage: cd <path>";
                return fileSystem.goToFolder(arguments[0]);
            },
            mkdir: function() {
                if (!arguments[0]) return "usage: mkdir <dir name>";
                return fileSystem.newFolder(Array.prototype.slice.call(arguments));
            },
            ls: function() {
                return fileSystem.listDirectory(arguments[0]);
            },
            exit: function() {
                fileSystem.sync();
                window.close();
            },
            rm: function() {
                if (!arguments[0]) return "usage: rm <file name>";
                return 'not implemented'; //fileSystem.removeDirectory(arguments); TODO
            },
            cat: function() { // TODO parse first parameter for path and read
                if (!arguments[0]) return "usage: cat <file name>";
                var file = fileSystem.getFromDir(arguments[0], Type.TEXT);
                if (file) {
                    return file.content;
                } else {
                    return "error: file '" + arguments[0] + "' does not exist";
                }
            },
            touch: function() { // TODO also detect path
                if (!arguments[0]) return "usage: touch <file name>";
                return fileSystem.createFile(Array.prototype.slice.call(arguments), Type.TEXT);
            },
            history: function() {
                var result = [];
                if(arguments[0] == "-c"){
                    commandHistory.length = 0;
                    result.push("history successfully cleared");
                }
                else{
                    _.each(commandHistory, function(command) {
                      result.push(command);
                    });
                }
                return result;
            },
            alias: function() {
                var usage = "usage: alias <set|del> <alias_name> [<command>]";
                if(!arguments[0] || _.indexOf(['set','del'], arguments[0]) === -1) {
                    return usage;
                } else {
                    var action = arguments[0],
                        aliasName = arguments[1],
                        command = arguments[2],
                        returnMsg;
                    if((action === "del" && arguments.length !== 2) || (action === "set" && arguments.length !== 3)) return usage;
                    if(action === "set") {
                        aliases[aliasName] = command;
                        returnMsg = "created alias '" + aliasName + "=" + command + "'";
                    } else {
                        if(!aliases[aliasName]) return "alias '" + aliasName + "' does not exist.";
                        delete aliases[aliasName];
                        returnMsg = "deleted alias '" + aliasName + "'";
                    }
                    fileSystem.sync('aliases');
                    return returnMsg;
                }
            },
            aliases: function() {
                var result = [];
                _.forOwn(aliases, function(command, alias) {
                    result.push(alias + '="' + command + '"');
                });
                return result;
            },
            help: function() {
                var result = ["You can use the following commands:"];
                result.push(_.keys(commands).join(', '));
                return result;
            },
            color: function() {
                if (!arguments[0]) return "usage: color <-b|-f|-p> <color>";
                var index = _.indexOf(arguments, '-b');
                if(index !== -1)
                    settings.backgroundColor = arguments[index + 1];
                index = _.indexOf(arguments, '-f');
                if(index !== -1)
                    settings.foregroundColor = arguments[index + 1];
                index = _.indexOf(arguments, '-p');
                if(index !== -1)
                    settings.promptColor = arguments[index + 1];
                $scope.setColor();
            }
        };
        Mousetrap.bindGlobal(['ctrl+l','command+l'], function(e) {
            $scope.command = '';
            commands.clear();
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['up'], function(e) {
            if(historyIndex > 0)
                $scope.command = commandHistory[--historyIndex];
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['down'], function(e) {
            if(historyIndex < commandHistory.length - 1)
                $scope.command = commandHistory[++historyIndex];
            else
                $scope.command = "";
            $scope.$apply();
            return false;
        });
    });

    // TODO - maybe this needs to be moved into it's own module / file
    // simple filesystem related functions
    var fileSystem = {
        root: JSON.parse(localStorage.root),
        init: function() {
            fileSystem.currentFolder = fileSystem.root;
        },
        createFile: function(files, type) {
            _.each(files, function(file) {
                this.currentFolder.children.push({
                    name: file,
                    type: type,
                    content: ''
                });
            }, this);
            this.sync('root');
            return "success: created file(s) '" + files.join(', ') + "'";
        },
        newFolder: function(folders) {
            var parentPath = this.getFolderPath(this.currentFolder);
            _.each(folders, function(folder) {
                this.currentFolder.children.push({
                    name: folder,
                    parent: parentPath,
                    type: 'd',
                    children: []
                });
            }, this);
            this.sync('root');
            return "success: created folder(s) '" + folders.join(', ') + "'";
        },
        goToFolder: function(path, getIt) {
            var folders = path.split('/'),
                curFolder = this.currentFolder,
                lastFolder = this.currentFolder,
                index = 0,
                nextFolderName = folders[index++];
            if (nextFolderName === 'root') {
                curFolder = this.root;
                lastFolder = curFolder;
            } else {
                if (nextFolderName === '..')
                    curFolder = this.getFolder(curFolder.parent);
                else
                    curFolder = this.getFromDir(nextFolderName, Type.DIR, curFolder);
            }
            while (curFolder) {
                lastFolder = curFolder;
                nextFolderName = folders[index++];
                if (nextFolderName === '..')
                    curFolder = this.getFolder(curFolder.parent);
                else
                    curFolder = this.getFromDir(nextFolderName, Type.DIR, curFolder);
            }
            if (getIt) return lastFolder;
            if (index - 1 < folders.length) {
                return "error: invalid path";
            } else {
                this.currentFolder = lastFolder;
            }
        },
        getFromDir: function(name, type, dir) {
            dir = dir || this.currentFolder;
            var children = dir.children;
            if (!children) return null;
            return _.find(children, function(child) {
                if (child.name === name && child.type == type)
                    return true;
            });
        },
        getFolder: function(path) {
            return (path) ? this.goToFolder(path, true) : null;
        },
        getCurrentPath: function() {
            return this.getFolderPath(this.currentFolder);
        },
        getFolderPath: function(dir) {
            if (!dir.parent) return dir.name;
            return [dir.name, '/', dir.parent].reverse().join('');
        },
        listDirectory: function(dir) {
            if (dir)
                dir = this.getFolder(dir);
            else
                dir = this.currentFolder;
            if (dir && dir.children) {
                return _.filter(
                    _.map(dir.children, function(child) {
                        return child.type + ':' + child.name;
                    }), function (el){
                        return el.charAt(2)!=".";
                }).sort().join(', ') || "empty directory";
            } else {
                return 'error: invalid path';
            }
        },
        sync: function(whatToSync) {
            var keys = (whatToSync instanceof Array) ? whatToSync : [whatToSync];
            if(!keys) {
                keys = _.keys(system).concat(['root']);
            }
            _.each(keys, function(key) {
                if(system[key] || fileSystem[key]) {
                    localStorage[key] = JSON.stringify(system[key] || fileSystem[key]);
                }
            });
            console.log(localStorage.root);
        }
    };

    // initialize the filesystem
    fileSystem.init();

    // focus on the input at start
    cmd.focus();

    // whenever the user clicks anywhere the command box is focused
    if (!window.addEventListener) {
        document.attachEvent('onclick', function(evt) {
            cmd.focus();
        });
    } else {
        window.addEventListener('click', function(evt) {
            cmd.focus();
        }, false);
    }

})();
