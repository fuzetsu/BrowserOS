var system = system || {};

system.createFileSystem = function(root) {
    return {
        root: root,
        init: function() {
            this.currentFolder = this.root;
        },
        createFile: function(files, type, fn) {
            var output = [];
            _.each(files, function(file) {
                // if the file is not defined then don't create it, ya dingus
                if(!file) {
                    return;
                }
                var prefix       = this.getPrefix(file),
                    parentFolder = this.getFolder(prefix),
                    fileName     = this.getBasename(file);
                if(!parentFolder) {
                    if(prefix) {
                        output.push("error: No such directory '" + parentPath + "'");
                        return;
                    } else {
                        parentFolder = this.currentFolder;
                    }
                }
                if(_.any(parentFolder.children, function(child) { return fileName === child.name; })) {
                    output.push("error: file with name '" + fileName + "' already exists");
                    return;
                }
                var parentPath = this.getFolderPath(parentFolder);
                var newFile = {
                    name: fileName,
                    parent: parentPath,
                    type: type,
                    updated: (new Date()).toLocaleString()
                };
                switch(type) {
                    case system.types.DIR:
                        newFile.children = [];
                        break;
                    case system.types.TEXT:
                        newFile.content = [];
                        break;
                }
                parentFolder.children.push(newFile);
                if(typeof fn === 'function') {
                    fn(newFile);
                }
                output.push("success: created " + system.typeTrans[type] + " '" + fileName + "' in directory '" + parentPath + "'");
            }, this);
            system.sync('root');
            return output;
        },
        newFolder: function(folders) {
            return this.createFile(folders, system.types.DIR);
        },
        goToFolder: function(path, getIt) {
            var folders        = path.split('/'),
                curFolder      = this.currentFolder,
                lastFolder     = this.currentFolder,
                index          = 0,
                nextFolderName = folders[index++];
            if (nextFolderName === 'root' || nextFolderName === '') {
                curFolder = this.root;
                lastFolder = curFolder;
                if(folders.length === 2 && folders[index] === '') {
                    if(getIt) {
                        return lastFolder;
                    } else {
                        this.currentFolder = lastFolder;
                        return;
                    }
                }
            } else {
                if (nextFolderName === '..') {
                    curFolder = this.getFolder(curFolder.parent);
                } else {
                    curFolder = this.getFromDir(nextFolderName, system.types.DIR, curFolder);
                }
            }
            while (curFolder) {
                lastFolder = curFolder;
                nextFolderName = folders[index++];
                if (nextFolderName === '..') {
                    curFolder = this.getFolder(curFolder.parent);
                } else {
                    curFolder = this.getFromDir(nextFolderName, system.types.DIR, curFolder);
                }
            }
            if (index - 1 < folders.length) {
                return (getIt) ? null : "error: invalid path";
            } else {
                if (getIt) {
                    return lastFolder;
                } else {
                    this.currentFolder = lastFolder;
                }
            }
        },
        removeFile: function(file) {
            var parentDir = this.getFolder(file.parent),
                initial   = parentDir.children.length;

            parentDir.children = _.filter(parentDir.children, function(child) {
                return child !== file;
            });
            system.sync('root');
            return initial > parentDir.children.length;
        },
        getPrefix: function(filePath) {
            var lastSlash = filePath.lastIndexOf('/');
            if(lastSlash !== -1 && lastSlash !== 0) {
                return filePath.slice(0, lastSlash);
            }
        },
        getBasename: function(filePath) {
            return filePath.slice(filePath.lastIndexOf('/') + 1);
        },
        doForEachFile: function(files, type, action) {
            _.each(files, function(file, index) {
                action(this.getFromDir(this.getBasename(file), type, this.getPrefix(file)), index);
            }, this);
        },
        getFromDir: function(name, type, dir) {
            dir = this.getFolder(dir) || this.currentFolder;
            var children = dir.children;
            if (!children) return null;
            return _.find(children, function(child) {
                if (child.name === name && (child.type == type || type === system.types.ALL))
                    return true;
            });
        },
        getFolder: function(path) {
            if(!path) {
                return null;
            } else if(path.type === system.types.DIR) {
                return path;
            } else {
                return this.goToFolder(path, true);
            }
        },
        getCurrentPath: function() {
            return this.getFolderPath(this.currentFolder);
        },
        getFolderPath: function(dir) {
            if (!dir.parent) return dir.name;
            return [dir.name, '/', dir.parent].reverse().join('');
        },
        listDirectory: function(dir, showHidden) {
            dir = (dir) ? this.getFolder(dir) : this.currentFolder;
            if (dir && dir.children) {
                var files = dir.children;
                if(!showHidden) {
                    files = _.filter(files, function(file) {
                        return file.name.charAt(0) != '.';
                    });
                }
                return _.map(files, function(file) {
                    return file.type + ':' + file.name;
                }).sort().join(', ') || "empty directory";
            } else {
                return 'error: invalid path';
            }
        },
        updateTimestamp: function(file) {
            if(file) {
                file.updated = (new Date()).toLocaleString();
            }
        }
    };
};