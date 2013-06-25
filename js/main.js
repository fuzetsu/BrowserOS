// if(!localStorage.files) {
    localStorage.files = JSON.stringify({
        name: 'root',
        parent: null,
        type: 'd',
        children: []
    });
// }

var Type = {
    DIR: 'd',
    TEXT: 't'
};

var ConsoleController = function($scope) {
    $scope.output = '';
    $scope.processCommand = function() {
        var command = this.command.split(' ');
        var result = doCommand(command[0], command.slice(1));
        if(result)
            this.output = result + '\n' + this.output;
        this.command = '';
    };
    var doCommand = function(command, parameters) {
        if(commands[command])
            return commands[command].apply(null, parameters);
        else
            return "error: command '" + command + "' not found";
    };

    var commands = {
        echo: function() {
            return Array.prototype.slice.call(arguments).join(' ');
        },
        date: function() {
            return new Date().toLocaleString();
        },
        clear: function() {
            $scope.output = '';
        },
        pwd: function() {
            return fileSystem.getCurrentPath();
        },
        cd: function() {
            if(!arguments[0]) return "usage: cd <path>";
            return fileSystem.goToFolder(arguments[0]);
        },
        mkdir: function() {
            return fileSystem.newFolder(Array.prototype.slice.call(arguments));
        },
        ls: function() {
            return fileSystem.listDirectory(arguments[0]);
        },
        rm: function() {
            return 'not implemented';//fileSystem.removeDirectory(arguments);
        },
        cat: function() {
            var file = fileSystem.getFromDir(arguments[0], Type.TEXT);
            if(file) {
                console.log(file.content);
                return file.content;
            } else {
                return "error: file '" + arguments[0] + "' does not exist";
            }
        },
        touch: function() {
            return fileSystem.createFile(Array.prototype.slice.call(arguments), Type.TEXT);
        }
    };
};

var fileSystem = {
    root: JSON.parse(localStorage.files),
    init: function() {
        fileSystem.currentFolder = fileSystem.root;
    },
    createFile: function(files, type) {
        for(var i = 0; i < files.length; i++) {
            this.currentFolder.children.push({
                name: files[i],
                type: type,
                content: ''
            });
        }
        this.sync();
        return "success: created file(s) '" + files.join(', ') + "'";
    },
    newFolder: function(folders) {
        var parentPath = this.getFolderPath(this.currentFolder);
        for(var i = 0; i < folders.length; i++) {
            this.currentFolder.children.push({
                name: folders[i],
                parent: parentPath,
                type: 'd',
                children: []
            });
        }
        this.sync();
        return "success: created folder(s) '" + folders.join(', ') + "'";
    },
    goToFolder: function(path, getIt) {
        var folders = path.split('/'),
            curFolder = this.currentFolder,
            lastFolder = this.currentFolder,
            index = 0,
            nextFolderName = folders[index++];
        if(nextFolderName === 'root') {
            curFolder = this.root;
            lastFolder = curFolder;
        } else {
            if(nextFolderName === '..')
                curFolder = this.getFolder(curFolder.parent);
            else
                curFolder = this.getFromDir(nextFolderName, Type.DIR, curFolder);
        }
        while(curFolder) {
            lastFolder = curFolder;
            nextFolderName = folders[index++];
            if(nextFolderName === '..')
                curFolder = this.getFolder(curFolder.parent);
            else
                curFolder = this.getFromDir(nextFolderName, Type.DIR, curFolder);
        }
        if(getIt) return lastFolder;
        if(index - 1 < folders.length) {
            return "error: invalid path";
        } else {
            this.currentFolder = lastFolder;
            return this.getCurrentPath();
        }
    },
    getFromDir: function(name, type, dir) {
        dir = dir || this.currentFolder;
        var children = dir.children;
        if(!children) return null;
        for(var i = 0; i < children.length; i++) {
            if(children[i].name === name && children[i].type == type)
                return children[i];
        }
    },
    getFolder: function(path) {
        return (path) ? this.goToFolder(path, true) : null;
    },
    getCurrentPath: function() {
        return 'cd: ' + (this.getFolderPath(this.currentFolder));
    },
    getFolderPath: function(dir) {
        if(!dir.parent) return dir.name;
        return [dir.name, '/', dir.parent].reverse().join('');
    },
    listDirectory: function(dir) {
        if(dir)
            dir = this.getFolder(dir);
        else
            dir = this.currentFolder;
        if(dir && dir.children) {
            return dir.children.map(function(child) {
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