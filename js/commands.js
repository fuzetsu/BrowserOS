var system = system || {};

system.createCommands = function($scope, fileSystem) { // TODO - look into removing dependency on system namespace in modules
    var _commands = {
        echo: {
            usage: 'echo <statement>',
            cmd: function() {
                if (!arguments[0]) return this.usage;
                return Array.prototype.slice.call(arguments).join(' ');
            }
        },
        date: {
            usage: 'date',
            cmd: function() {
                return new Date().toLocaleString();
            }
        },
        clear: {
            usage: 'clear',
            cmd: function() {
                $scope.output = [];
                return false;
            }
        },
        pwd: {
            usage: 'pwd',
            cmd: function() {
                return fileSystem.getCurrentPath();
            }
        },
        login: {
            usage: 'login <secret_key>',
            cmd: function() {
                if(!arguments[0]) return this.usage;
                system.secret.key = arguments[0];
                system.openStorage.user_key = arguments[0];
                //system.sync('', true); STILL TESTING
            }
        },
        cd: {
            usage: 'cd <path>',
            cmd: function() {
                if (!arguments[0]) return this.usage;
                return fileSystem.goToFolder(arguments[0]);
            }
        },
        mkdir: {
            usage: 'mkdir <dir name>',
            cmd: function() {
                if (!arguments[0]) return this.usage;
                return fileSystem.newFolder(Array.prototype.slice.call(arguments));
            }
        },
        ls: {
            usage: ['ls [-a]','-a : shows hidden files'],
            cmd: function() {
                var showHidden = false, dir = arguments[0];
                if(dir === '-a') {
                    showHidden = true;
                    dir = arguments[1];
                }
                return fileSystem.listDirectory(dir, showHidden);
            }
        },
        exit: {
            usage: ['exit','Syncs and closes the application.'],
            cmd: function() {
                system.sync();
                window.close();
            }
        },
        rm: {
            usage: 'rm <file name>',
            cmd: function() {
                if (!arguments[0]) return this.usage;
                var output = [],
                    originalArguments = arguments;
                fileSystem.doForEachFile(arguments, system.types.ALL, function(file, index) {
                    var filePath = originalArguments[index];
                    if(file) {
                        if(fileSystem.removeFile(file)) {
                            output.push("success: removed " + system.typeTrans[file.type] + " '" + filePath + "'");
                        } else {
                            output.push("error: unable to remove " + system.typeTrans[file.type] + " '" + filePath + "'");
                        }
                    } else {
                        output.push("error: '" + filePath + "' does not exist");
                    }
                });
                return output;
            }
        },
        cat: {
            usage:'cat <file name>',
            cmd: function() { // TODO parse first parameter for path and read
                if (!arguments[0]) return this.usage;
                var output = [],
                    originalArguments = arguments;
                fileSystem.doForEachFile(arguments, system.types.TEXT, function(file, index) {
                    var filePath = originalArguments[index];
                    if(file) {
                        output.push(file.content);
                    } else {
                        output.push("error: " + system.typeTrans[system.types.TEXT] + " '" + filePath + "' does not exist");
                    }
                });
                return output;
            }
        },
        touch: {
            usage: 'touch <file name>',
            cmd: function() { // TODO also detect path
                if (!arguments[0]) return this.usage;
                return fileSystem.createFile(Array.prototype.slice.call(arguments), system.types.TEXT);
            }
        },
        history: {
            usage: ['history [-c]', 'Displays the command history.', '-c : clears the history'],
            cmd: function() {
                var result = [];
                if(arguments[0] == "-c"){
                    system.commandHistory.length = 0;
                    result.push("history successfully cleared");
                }
                else{
                    _.each(system.commandHistory, function(command) {
                      result.push(command);
                    });
                }
                return result;
            }
        },
        alias: {
            usage: [
                'alias <set|del> <alias_name> [<command_def>]',
                'Creates or deletes an shortcut to a command.',
                'example : alias set hello "echo hello"'
            ],
            cmd: function() {
                if(!arguments[0] || _.indexOf(['set','del'], arguments[0]) === -1) {
                    return this.usage;
                } else {
                    var action    = arguments[0],
                        aliasName = arguments[1],
                        command   = arguments[2],
                        returnMsg;
                    if((action === "del" && arguments.length !== 2) || (action === "set" && arguments.length !== 3)) return this.usage;
                    if(action === "set") {
                        system.aliases[aliasName] = command;
                        returnMsg = "created alias '" + aliasName + "=" + command + "'";
                    } else {
                        if(!system.aliases[aliasName]) return "alias '" + aliasName + "' does not exist.";
                        delete system.aliases[aliasName];
                        returnMsg = "deleted alias '" + aliasName + "'";
                    }
                    system.sync('aliases');
                    return returnMsg;
                }
            }
        },
        aliases: {
            usage: ['aliases','Lists the defined aliases.'],
            cmd: function() {
                var result = [];
                _.forOwn(system.aliases, function(command, alias) {
                    result.push(alias + '="' + command + '"');
                });
                return result;
            }
        },
        help: {
            usage: ['help [<command_name>]','Show help for a command or list all available commands.'],
            cmd: function() {
                var result;
                if(arguments[0]) {
                    result = _commands[arguments[0]] && _commands[arguments[0]].usage;
                } else {
                    result = ["You can use the following commands:"];
                    result.push(_.keys(this).join(', '));
                }
                return result;
            }
        },
        color: {
            usage: [
                'color <-b|-f|-p> <color>',
                'Change the color settings for the terminal.',
                '-b : changes the background color',
                '-f : changes the foreground color',
                '-p : changes the prompt color'
            ],
            cmd: function() {
                if (!arguments[0]) return this.usage;
                var index = _.indexOf(arguments, '-b');
                if(index !== -1)
                    system.settings.backgroundColor = arguments[index + 1];
                index = _.indexOf(arguments, '-f');
                if(index !== -1)
                    system.settings.foregroundColor = arguments[index + 1];
                index = _.indexOf(arguments, '-p');
                if(index !== -1)
                    system.settings.promptColor = arguments[index + 1];
                $scope.loadSettings();
            }
        },
        font: {
            usage: [
                'font <-s|-f> <size|family>',
                'Changes the font settings for the terminal.',
                '-s : changes the size of the font',
                '-f : changes the font family'
            ],
            cmd: function() {
                if (!arguments[0]) return this.usage;
                var index = _.indexOf(arguments, '-s');
                if(index !== -1)
                    system.settings.fontSize = arguments[index + 1];
                index = _.indexOf(arguments, '-f');
                if(index !== -1)
                    system.settings.fontFamily = arguments[index + 1];
                $scope.loadSettings();
            }
        },
        r: { // TESTING
            usage: ['r','DEV: Clears all the contents of localStorage'],
            cmd: function() {
                localStorage.clear();
            }
        },
        avg: {
            usage: ['avg <numbers...>','Prints the average of the numbers provided.','ex : avg 1 2 3'],
            cmd: function() {
                if(!arguments[0]) return this.usage;
                return _.reduce(arguments, function(lastNumber, number) {
                    return lastNumber + parseFloat(number, 10);
                }, 0) / arguments.length || "error: input must be valid numbers.";
            }
        }
    };
    return _commands;
};
