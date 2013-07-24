window.system = window.system || {};

system.createConsoleController = function(fileSystem) { // TODO - look into removing dependency on system namespace in modules

    return function($scope) {
        // initialize our command
        $scope.command = '';
        // initialize array that holds the output on the screen
        $scope.output = [];

        // object containing all base commands and their implementations loaded from commands.js
        var commands = system.createCommands($scope, fileSystem);

        // sets the colors of the terminal
        $scope.loadSettings = function() {
            system.sync('settings');
            $scope.bgColor  = system.settings.backgroundColor;
            $scope.fgColor  = system.settings.foregroundColor;
            $scope.prColor  = system.settings.promptColor;
            $scope.fnSize   = system.settings.fontSize;
            $scope.fnFamily = system.settings.fontFamily;
        };

        $scope.loadSettings();

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
                $scope.completions = '';
                system.commandHistory.push(commandStr);
                system.historyIndex = system.commandHistory.length;
                system.sync('commandHistory');
                var command = parseArgumentLine(commandStr),
                    curPrompt = $scope.cmdPrompt(),
                    result = doCommand(command[0], command.slice(1));
                // if we just got redirected to an alias then exit
                if (result === false) return;
                // always push the prompt line (if an alias was specified display that instead)
                $scope.output.push([curPrompt, alias || commandStr]);
                // if there was a result returned then push that as well
                if (result) {
                    if (result instanceof Array) {
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

        // takes the argumentLine and returns an array of commands by taking into account: spaces, quotes, escaped characters, etc
        var parseArgumentLine = function(argumentLine) {
            var text       = argumentLine,
                params     = [],
                curParam   = '',
                squoteOpen = false,
                dquoteOpen = false,
                escaped    = false,
                character  = null;

            for (var i = 0, len = text.length; i < len; ++i) {
                character = text[i];
                if (escaped || (squoteOpen && character !== "'") || (dquoteOpen && character !== '"')) {
                    if (character === '\\') {
                        escaped = true;
                    } else {
                        escaped = false;
                        curParam += character;
                    }
                } else if (character === ' ') {
                    if (text[i - 1] !== ' ') {
                        params.push(curParam);
                        curParam = '';
                    }
                } else if (character === "'") {
                    squoteOpen = !squoteOpen;
                } else if (character === '"') {
                    dquoteOpen = !dquoteOpen;
                } else if (character === '\\') {
                    escaped = true;
                } else {
                    curParam += character;
                }
            }

            params.push(curParam);
            return params;
        };

        // executes a command and hands off the passed parameters to it
        var doCommand = function(command, parameters) {
            if (system.aliases[command]) {
                processCommand(system.aliases[command], command);
                return false;
            } else if (commands[command]) {
                return commands[command].apply(commands, parameters);
            } else {
                return "error: command '" + command + "' not found";
            }
        };

        // takes current command text and processes it to find a possible completion
        var getCompletions = function(argumentLine, getLine) {
            var parsed = parseArgumentLine(argumentLine),
                completions = [],
                finished = false;
            if(parsed.length < 2) {
                _.each(commands, function(value, key) {
                    if(key.indexOf(parsed[0]) === 0) {
                        completions.push(key);
                    }
                });
            }
            if(completions.length === 1 && completions[0] === parsed[0]) {
                completions = [];
                parsed.push('');
            }
            if(parsed.length > 1) {
                while(!finished) {
                    _.each(system.fileSystem.currentFolder.children, function(child) {
                        if(child.name.indexOf(parsed[parsed.length - 1]) === 0) {
                            completions.push(child.name);
                        }
                    });
                    if(completions.length === 1 && completions[0] === parsed[parsed.length - 1]) {
                        completions = [];
                        parsed.push('');
                    } else {
                        finished = true;
                    }
                }
            }
            if(completions.length > 0) {
                if(completions.length > 1) {
                    return completions;
                } else {
                    if(getLine) {
                        parsed[parsed.length - 1] = completions[0];
                        return parsed.join(' ');
                    } else {
                        return completions;
                    }
                }
            } else {
                return null;
            }
        };

        Mousetrap.bindGlobal(['ctrl+l', 'command+l'], function(e) {
            $scope.command = '';
            $scope.completions = '';
            commands.clear();
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['up'], function(e) {
            if (system.historyIndex > 0) {
                $scope.command = system.commandHistory[--system.historyIndex];
            }
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['down'], function(e) {
            if (system.historyIndex < system.commandHistory.length - 1) {
                $scope.command = system.commandHistory[++system.historyIndex];
            } else {
                $scope.command = "";
            }
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['tab'], function(e) {
            $scope.completions = '';
            var completions = getCompletions($scope.command, true);
            if(completions) {
                if(typeof completions === 'string') {
                    $scope.command = completions;
                } else {
                    $scope.completions = completions.join(', ');
                }
            }
            $scope.$apply();
            return false;
        });
    };

};