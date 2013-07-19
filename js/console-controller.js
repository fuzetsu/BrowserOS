window.system = window.system || {};

system.createConsoleController = function(fileSystem) { // TODO - look into removing dependency on system namespace in modules

    return function($scope) {
        // initialize our command
        $scope.command = '';
        // initialize array that holds the output on the screen
        $scope.output = [];

        // sets the colors of the terminal
        $scope.loadSettings = function() {
            system.sync('settings');
            $scope.bgColor = system.settings.backgroundColor;
            $scope.fgColor = system.settings.foregroundColor;
            $scope.prColor = system.settings.promptColor;
            $scope.fnSize = system.settings.fontSize;
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

        // ridiculous function to go through the command and create the array of command / parameters
        var parseArgumentLine = function(argumentLine) {
            var result = [],
                current,
                characters = argumentLine.split('').reverse(),
                reset = true,
                c = characters.pop();
            while (c) {
                while (c === ' ') {
                    c = characters.pop();
                }
                if (c === '"') {
                    if (reset) current = '';
                    c = characters.pop();
                    while (c && c !== '"') {
                        current += c;
                        c = characters.pop();
                    }
                    if (c === '"') {
                        c = characters.pop();
                    }
                    if (c && c !== ' ' && c !== '"') {
                        reset = false;
                    } else {
                        result.push(current);
                        reset = true;
                    }
                } else {
                    if (reset) current = '';
                    do {
                        current += c;
                        c = characters.pop();
                    } while (c && c !== ' ' && c !== '"');
                    if (c !== '"') {
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
            if (system.aliases[command]) {
                processCommand(system.aliases[command], command);
                return false;
            } else if (commands[command]) {
                return commands[command].apply(commands, parameters);
            } else {
                return "error: command '" + command + "' not found";
            }
        };

        // object containing all base commands and their implementations loaded from commands.js
        var commands = system.createCommands($scope, fileSystem);

        Mousetrap.bindGlobal(['ctrl+l', 'command+l'], function(e) {
            $scope.command = '';
            commands.clear();
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['up'], function(e) {
            if (system.historyIndex > 0)
                $scope.command = system.commandHistory[--system.historyIndex];
            $scope.$apply();
            return false;
        });
        Mousetrap.bindGlobal(['down'], function(e) {
            if (system.historyIndex < system.commandHistory.length - 1)
                $scope.command = system.commandHistory[++system.historyIndex];
            else
                $scope.command = "";
            $scope.$apply();
            return false;
        });
    };

};