window.system = window.system || {};

system.createCommands = function($scope, fileSystem) { // TODO - look into removing dependency on system namespace in modules
    return {
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
            system.sync();
            window.close();
        },
        rm: function() {
            if (!arguments[0]) return "usage: rm <file name>";
            var output = [],
                originalArguments = arguments;
            fileSystem.doForEachFile(arguments, system.types.ALL, function(file, index) {
                var filePath = originalArguments[index];
                if(file) {
                    if(fileSystem.removeFile(file)) {
                        output.push("success: removed '" + filePath + "'");
                    } else {
                        output.push("error: unable to remove '" + filePath + "'");
                    }
                } else {
                    output.push("error: '" + filePath + "' does not exist");
                }
            });
            return output;
        },
        cat: function() { // TODO parse first parameter for path and read
            if (!arguments[0]) return "usage: cat <file name>";
            var output = [];
            fileSystem.doForEachFile(arguments, system.types.TEXT, function(file) {
                if(file) {
                    output.push(file.content);
                } else {
                    output.push("error: file '" + filePath + "' does not exist");
                }
            });
            return output;
        },
        touch: function() { // TODO also detect path
            if (!arguments[0]) return "usage: touch <file name>";
            return fileSystem.createFile(Array.prototype.slice.call(arguments), system.types.TEXT);
        },
        history: function() {
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
        },
        aliases: function() {
            var result = [];
            _.forOwn(system.aliases, function(command, alias) {
                result.push(alias + '="' + command + '"');
            });
            return result;
        },
        help: function() {
            var result = ["You can use the following commands:"];
            result.push(_.keys(this).join(', '));
            return result;
        },
        color: function() {
            if (!arguments[0]) return "usage: color <-b|-f|-p> <color>";
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
        },
        font: function() {
            if (!arguments[0]) return "usage: font <-s|-f> <size|family>";
            var index = _.indexOf(arguments, '-s');
            if(index !== -1)
                system.settings.fontSize = arguments[index + 1];
            index = _.indexOf(arguments, '-f');
            if(index !== -1)
                system.settings.fontFamily = arguments[index + 1];
            $scope.loadSettings();
        },
        r: function() { // TESTING
            localStorage.clear();
        },
        avg: function() {
            if(!arguments[0]) return "usage: avg [numbers to average]";
            return _.reduce(arguments, function(lastNumber, number) {
                return lastNumber + (parseInt(number, 10) || 0);
            }, 0) / arguments.length;
        }
    };
};