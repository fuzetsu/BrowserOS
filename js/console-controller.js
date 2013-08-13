var system = system || {};

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
                return commands[command].cmd.apply(commands[command], parameters);
            } else {
                return "error: command '" + command + "' not found";
            }
        };

        // takes current command text and processes it to find a possible completion
        var getCompletions = function(argumentLine, getLine) {
            // parse the argumentline
            var parsed = parseArgumentLine(argumentLine),
                completions = [],
                finished = false,
                curCommand = commands[parsed[0]] || {};
            // if there are less than 2 arguments
            if(parsed.length < 2) {
                // then suggest a command to the user based on their current input (or blank)
                _.each(commands, function(value, key) {
                    if(key.indexOf(parsed[0]) === 0) {
                        completions.push(key);
                    }
                });
            }
            // if a completion was found and the completion is the same as what the user currently has
            if(completions.length === 1 && completions[0] === parsed[0]) {
                // clear the suggested completions because we already have it
                completions = [];
                // add a new argument to suggest
                parsed.push('');
            }
            // if there are more than one arguments
            if(parsed.length > 1) {
                var comp = curCommand.comp,
                    compForAnyIndex = comp && (comp.any || (comp instanceof Array && comp)),
                    compForSpecificIndex = comp && comp.specific,
                    compForThisIndex = null,
                    acceptedTypes = [],
                    acceptedTypesForThisIndex = [],
                    allTypes = null;
                // if there are no completions for this command then exit
                if(!comp) {
                    console.log('no completions for this command');
                    return null;
                }
                // loop function to find matches within completions
                var findMatches = function(comp) {
                    if(comp.indexOf(parsed[parsed.length - 1]) === 0) {
                        completions.push(comp);
                    }
                };
                // loop function to splice any type completions for a specific index
                var extractTempTypeComp = function(comp, index, arr) {
                    if(_.any(system.types, function(type) { return type === comp;})) {
                        acceptedTypesForThisIndex.push(arr.splice(index, 1)[0]);
                    }
                };
                // extract type completions from the any index completions (if defined)
                if(compForAnyIndex) {
                    compForAnyIndex = compForAnyIndex.slice();
                     _.each(compForAnyIndex, function(comp, index, arr) {
                        if(_.any(system.types, function(type) { return type === comp;})) {
                            acceptedTypes.push(arr.splice(index, 1)[0]);
                        }
                    });
                }
                // loop until we're finished (i.e. until we have suggestions)
                while(!finished) {
                    // try to find a list of completions matching this argument number
                    compForThisIndex = comp[parsed.length - 1];
                    // if we found one
                    if(compForThisIndex) {
                        // create a copy of it
                        compForThisIndex = compForThisIndex.slice();
                        // clear the old accepted types for this index
                        acceptedTypesForThisIndex = [];
                        // and extract the types and matches from them
                        _.each(compForThisIndex, extractTempTypeComp);
                        _.each(compForThisIndex, findMatches);
                    }
                    // if there was completions for a specific index defined then see if this is one of those indexes
                    if(compForSpecificIndex && _.indexOf(compForSpecificIndex.indexes, parsed.length - 1) !== -1) {
                        // then create a copy of the completions
                        compForThisIndex = compForSpecificIndex.comp.slice();
                        // and extract the types and matches from them
                        _.each(compForThisIndex, extractTempTypeComp);
                        _.each(compForThisIndex, findMatches);
                    }
                    // if there are some global comps defined for this functions
                    if(compForAnyIndex) {
                        // then extract any that match
                        _.each(compForAnyIndex, findMatches);
                    }
                    // create an array that joins the global type matches and the ones for this index
                    allTypes = acceptedTypes.concat(acceptedTypesForThisIndex);
                    if(allTypes.length > 0) {
                        // if the accepted types contains the ALL wildcard just return all the children
                        if(_.indexOf(allTypes, system.types.ALL) !== -1) {
                            _(fileSystem.currentFolder.children).map('name').each(findMatches);
                        } else {
                            // add to the completions all the files and folders in the current directory that match the acceptedtypes and the last argumemt
                            _(fileSystem.currentFolder.children)
                                .filter(function(child) {
                                    return _.indexOf(allTypes, child.type) !== -1;
                                })
                                .map('name')
                                .each(findMatches);
                        }
                    }
                    // if we only found one completion and the completion is already entered into the last argument
                    if(completions.length === 1 && completions[0] === parsed[parsed.length - 1]) {
                        // then clear the array because there's no point suggesting something we already have
                        completions = [];
                        // add another argument to suggest
                        parsed.push('');
                    } else {
                        // we found new suggestions so we're done here
                        finished = true;
                    }
                }
            }
            // if we have at least 1 completion at this point
            if(completions.length > 0) {
                // if we want to get the command line
                if(getLine) {
                    // if there is only one completion
                    if(completions.length === 1) {
                        // then we actually want to automatically fill the last argument with that instead of suggesting it
                        parsed[parsed.length - 1] = completions[0];
                    // otherwise if the first argument is not there (i.e. this is the first request for completions)
                    } else if(parsed[0] === '') {
                        // just return the completions
                        return {
                            comp: completions
                        };
                    } else {
                        /* this segment of code completes the command up to the farthest common letter among the completions */
                        var nomatch  = false,
                            // current index is equal to the length of the last argument
                            curIndex = parsed[parsed.length - 1].length,
                            curMatch = null,
                            // loop func to check if the completions match up to the current match
                            checkCompletions = function(cmp) {
                                // if the completion doens't match the current match then we don't have a match
                                if(cmp.indexOf(curMatch) !== 0) {
                                    nomatch = true;
                                // if the current index is bigger than the length of the first completion then we don't have a match
                                } else if(curIndex > completions[0].length) {
                                    nomatch = true;
                                    // also since the curindex is greater than the completion we need to set the last argument to the current match
                                    parsed[parsed.length - 1] = curMatch;
                                }
                            };
                        // loop until we can't find a match
                        while(!nomatch) {
                            // the last argument is equal to the current match
                            parsed[parsed.length - 1] = curMatch;
                            // the current match is the letters in the first completion up to the current index
                            curMatch = completions[0].slice(0, curIndex++);
                            // loop through the completions
                            _.each(completions, checkCompletions);
                        }
                    }
                    // return the newly filled argument line and the completions
                    return {
                        cmd:  parsed.join(' '),
                        comp: completions
                    };
                // or just return the completions
                } else {
                    return completions;
                }
            // no completions were found, so we'll just return null
            } else {
                return null;
            }
        };

        Mousetrap.bindGlobal(['ctrl+l', 'command+k'], function(e) {
            $scope.command = '';
            $scope.completions = '';
            commands.clear.cmd();
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
                $scope.command = completions.cmd || '';
                if(completions.comp.length > 1) {
                    $scope.completions = completions.comp.join(', ');
                }
            }
            $scope.$apply();
            return false;
        });
    };

};