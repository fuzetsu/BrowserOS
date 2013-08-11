var system = system || {};

system.createCommands = function($scope, fileSystem) { // TODO - look into removing dependency on system namespace in modules

    /**

    The structure for implementing a command is as follows.

    // fisrt up is the command name, this is what the user has to type in to call the command
    cmd_name: {

        ############## COMP {Array or Object} [OPTIONAL] ##############

        // there are a few different ways of implementing tab completion for your command...
        // Only one can be used at a time.

        // this is the first and most simple way of defining tab completions
        // these 2 options will be offered whenever the user presses tab
        // and this command is being used
        comp: ["hello", "goodbye"],

        // this is the second method, it allows more fine grain control over the completions
        comp: {

            // the keys (1 and 2) indicate which argument number the array of options will be suggested for
            1: ["hello", "hello2"],
            2: ["goodbye", "goodbye2"]

            // when the key 'any' is used the array of completions will be suggested for any index
            any: ["1", "2", "3"]

            // the specific sub-object allows you to define an array of completions
            // that can applied to multiple indexes easily
            specific: {

                // the comp array as usual defines the completions that will be suggested
                comp: ["awe","full","moon"],

                // the indexes array defines which indexes these completions will be suggested for
                indexes: [3,6,9]

            }
        },

        ############## USAGE {Array} [OPTIONAL] ##############

        // the usage will be printed when the user provides bad parameters (must be handled by the implementation)
        // or when the 'help' command is used in conjunction with the name of your command
        // each element in the array is a new line in the print out
        usage: ["usage info"],

        ############## CMD {Function} [REQUIRED] ##############

        // this is the function that will be called to execute the command's logic
        cmd: function() {

            // in the function any string returned will be output on the terminal
            // if an array is returned then the each element in the array corresponds to a line of output
            var output = [];

            // using the the 'this' keyword to access a property of the parent object
            output.concat(this.usage || 'The usage property was not defined...');
            return output;

        },

        ############## CUSTOM {Any} [OPTIONAL] ##############

        // if you feel the need to separate out the logic of your function on small scale then you can create
        // other functions or properties in your commands object
        // they can be accessed with using the 'this' keyword followed by the property name
        // as demonstrated by the 'cmd' function definition above

        date_started: Date.now

    }

    Create an object that matches this structure and place it somewhere in the _commands object below.

    **/

    var _commands = {
        echo: {
            usage: ['echo <statement>', 'Prints the specified text to the terminal.'],
            cmd: function() {
                if (!arguments[0]) return this.usage;
                var args = [].slice.call(arguments),
                    output = [],
                    fileName, content, mainIndex,
                    indexOfGt = _.indexOf(args, '>'),
                    indexOfGt2 = _.indexOf(args, '>>');
                if(indexOfGt !== -1 || indexOfGt2 !== -1) {
                    mainIndex = (indexOfGt > indexOfGt2) ? indexOfGt : indexOfGt2;
                    fileName = args.slice(mainIndex + 1);
                    if(!fileName || fileName.length < 1) {
                        return args.join(' ');
                    } else {
                        fileName = fileName[0];
                        content = args.slice(0, mainIndex).join(' ');
                        fileSystem.doForEachFile([fileName], system.types.TEXT, function(file, index) {
                            if(file) {
                                if(indexOfGt > indexOfGt2) {
                                    file.content = [content];
                                } else {
                                    file.content.push(content);
                                }
                                fileSystem.updateTimestamp(file);
                            } else {
                                fileSystem.createFile([fileName], system.types.TEXT, function(file) {
                                    if(indexOfGt > indexOfGt2) {
                                        file.content = [content];
                                    } else {
                                        file.content.push(content);
                                    }                                });
                                output.push("success: created " + system.typeTrans[system.types.TEXT] +
                                    " '" + fileName + "'");
                            }
                        });
                        return output;
                    }
                } else {
                    return args.join(' ');
                }
            }
        },
        date: {
            usage: ['date', 'Prints the current date.'],
            cmd: function() {
                return new Date().toLocaleString();
            }
        },
        clear: {
            usage: ['clear', 'Clears the screen of all output.'],
            cmd: function() {
                $scope.output = [];
                return false;
            }
        },
        pwd: {
            usage: ['pwd', 'Prints the current working directory.'],
            cmd: function() {
                return fileSystem.getCurrentPath();
            }
        },
        login: {
            usage: ['login <secret_key>', 'Specifies the key to associate your cloud syncing with.'],
            cmd: function() {
                if(!arguments[0]) return this.usage;
                system.secret.key = arguments[0];
                system.openStorage.user_key = arguments[0];
                //system.sync('', true); STILL TESTING
            }
        },
        cd: {
            comp: {
                1: [system.types.DIR]
            },
            usage: ['cd <path>', 'Change the working directory to the one specified.'],
            cmd: function() {
                if (!arguments[0]) return this.usage;
                return fileSystem.goToFolder(arguments[0]);
            }
        },
        mkdir: {
            usage: ['mkdir <dir name>', 'Make a directory with the specified name.'],
            cmd: function() {
                if (!arguments[0]) return this.usage;
                return fileSystem.newFolder(Array.prototype.slice.call(arguments));
            }
        },
        ls: {
            comp: {
                1: ['-a'],
                any: [system.types.DIR]
            },
            usage: [
                'ls [-a] [<path>]',
                'Lists the contents of the current directory or of the specified path.',
                '-a : shows hidden files'
            ],
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
            comp: [system.types.ALL],
            usage: ['rm <file name>','Removes the specified file or directory.'],
            cmd: function() {
                if (!arguments[0]) return this.usage;
                var output = [],
                    originalArguments = arguments;
                fileSystem.doForEachFile(arguments, system.types.ALL, function(file, index) {
                    var filePath = originalArguments[index];
                    if(file) {
                        if(fileSystem.removeFile(file)) {
                            output.push("success: removed " + system.typeTrans[file.type] + " '" +
                                filePath + "'");
                        } else {
                            output.push("error: unable to remove " + system.typeTrans[file.type] +
                                " '" + filePath + "'");
                        }
                    } else {
                        output.push("error: '" + filePath + "' does not exist");
                    }
                });
                return output;
            }
        },
        cat: {
            comp: [system.types.TEXT],
            usage: ['cat <file name>','Display the contents of the specified text file.'],
            cmd: function() { // TODO parse first parameter for path and read
                if (!arguments[0]) return this.usage;
                var output = [],
                    originalArguments = arguments;
                fileSystem.doForEachFile(arguments, system.types.TEXT, function(file, index) {
                    var filePath = originalArguments[index];
                    if(file) {
                        output = output.concat(file.content);
                    } else {
                        output.push("error: " + system.typeTrans[system.types.TEXT] + " '" +
                            filePath + "' does not exist");
                    }
                });
                return output;
            }
        },
        touch: {
            usage: ['touch <file name>', 'Create a text file with the specified file name.'],
            cmd: function() { // TODO also detect path
                if (!arguments[0]) return this.usage;
                return fileSystem.createFile(Array.prototype.slice.call(arguments), system.types.TEXT);
            }
        },
        history: {
            comp: {
                1: ['-c']
            },
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
            comp: {
                1: ['set','del']
            },
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
                    if((action === "del" && arguments.length !== 2) || (action === "set" && arguments.length !== 3)) {
                        return this.usage;
                    }
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
            comp: {
                1: null // this is set at the bottom to --> _.keys(_commands)
            },
            usage: ['help [<command_name>]','Show help for a command or list all available commands.'],
            cmd: function() {
                var result;
                if(arguments[0]) {
                    result = _commands[arguments[0]] && _commands[arguments[0]].usage;
                } else {
                    result = ["You can use the following commands:"];
                    result.push(this.comp[1].join(', '));
                }
                return result;
            }
        },
        color: {
            comp: {
                specific: {
                    comp: ['-b','-f','-p'],
                    indexes: [1,3,5]
                }
            },
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
            comp: {
                specific: {
                    comp: ['-s','-f'],
                    indexes: [1,3]
                }
            },
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
        },
        file: {
            comp: {
                any: [system.types.ALL]
            },
            usage: ['file <file name>', 'Get file information.'],
            cmd: function() {
                if(!arguments[0]) return this.usage;
                var output = [],
                    args = arguments;
                fileSystem.doForEachFile([arguments[0]], system.types.ALL, function(file, index){
                    if(file) {
                        output.push('Name:' + file.name);
                        output.push('Parent:' + file.parent);
                        output.push('Type:' + system.typeTrans[file.type]);
                        output.push('Updated:' + file.updated);
                    } else {
                        output.push("error: file '" + args[index] + "' does not exist");
                    }
                });
                return output;
            }
        }
    };
    _commands.help.comp[1] = _.keys(_commands);
    return _commands;
};
