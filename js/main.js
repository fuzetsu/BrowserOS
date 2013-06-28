(function() {
    "use strict";

    var Type = {
        DIR: 'd',
        TEXT: 't'
    };

    var cmd = document.getElementById('cmd');
    var commandHistory = [];

    // if(!localStorage.files) {
    localStorage.files = JSON.stringify({
        name: 'root',
        parent: null,
        type: Type.DIR,
        children: []
    });
    // }

    var app = angular.module('browserOS',[]);

    app.controller('ConsoleController', function($scope) {
        $scope.command = '';
        $scope.output = [];
        $scope.workingDir = function() {
            return fileSystem.getFolderPath(fileSystem.currentFolder);
        };
        $scope.cmdPrompt = function() {
            return "admin@betaOS:[" + $scope.workingDir() + "]$ ";
        };
        $scope.processCommand = function() {
            if (this.command) {
                var command = parseArgumentLine(this.command),
                    curPrompt = this.cmdPrompt(),
                    result = (command[0]) ? doCommand(command[0], _.filter(command.slice(1), function(command) {
                        return command && command.trim();
                    })) : false;
                commandHistory.push(this.command);
                // always push the prompt line
                this.output.push([curPrompt, this.command]);
                // if there was a result returned then push that as well
                if (result) this.output.push(['', result]);
                this.command = '';
                // scroll to bottom after render
                setTimeout(function() {
                    window.scroll(0, document.body.scrollHeight);
                }, 0);
            }
        };

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

        var doCommand = function(command, parameters) {
            if (commands[command])
                return commands[command].apply(commands, parameters);
            else
                return "error: command '" + command + "' not found";
        };

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
                $scope.output.push([$scope.cmdPrompt(), $scope.command]);
                _.each(commandHistory, function(command) {
                    $scope.output.push(['', command]);
                });
            }
        };
        Mousetrap.bindGlobal(['ctrl+l','command+l'], function(e) {
            commands.clear();
            $scope.$apply();
            return false;
        });
    });

    var fileSystem = {
        root: JSON.parse(localStorage.files),
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
            this.sync();
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
            this.sync();
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
                return _.map(dir.children, function(child) {
                    return child.type + ':' + child.name;
                }).join(', ') || "empty directory";
            } else {
                return 'error: invalid path';
            }
        },
        sync: function() {
            localStorage.files = JSON.stringify(this.root);
            console.log(localStorage.files);
        }
    };

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
