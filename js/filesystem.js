window.system = window.system || {};

system.createFileSystem = function(root) {
	return {
		root: root,
		init: function() {
			this.currentFolder = this.root;
		},
		createFile: function(files, type) {
			var output = [];
			_.each(files, function(file) {
				var prefix = this.getPrefix(file),
					parentFolder = this.getFolder(prefix),
					fileName = this.getBasename(file);
				if(!parentFolder) {
					if(prefix) {
						output.push("error: No such directory '" + parentPath + "'");
						return;
					} else {
						parentFolder = this.currentFolder;
					}
				}
				var parentPath = this.getFolderPath(parentFolder);
				var newFile = {
					name: fileName,
					parent: parentPath,
					type: type
				};
				switch(type) {
					case system.types.DIR:
						newFile.children = [];
						break;
					case system.types.TEXT:
						newFile.content = '';
						break;
				}
				parentFolder.children.push(newFile);
				output.push("success: created " + system.typeTrans[type] + " '" + fileName + "' in directory '" + parentPath + "'");
			}, this);
			system.sync('root');
			return output;
		},
		newFolder: function(folders) {
			return this.createFile(folders, system.types.DIR);
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
					curFolder = this.getFromDir(nextFolderName, system.types.DIR, curFolder);
			}
			while (curFolder) {
				lastFolder = curFolder;
				nextFolderName = folders[index++];
				if (nextFolderName === '..')
					curFolder = this.getFolder(curFolder.parent);
				else
					curFolder = this.getFromDir(nextFolderName, system.types.DIR, curFolder);
			}
			if (getIt) return lastFolder;
			if (index - 1 < folders.length) {
				return "error: invalid path";
			} else {
				this.currentFolder = lastFolder;
			}
		},
		removeFile: function(file) {
			var parentDir = this.getFolder(file.parent),
				initial = parentDir.children.length;
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
		listDirectory: function(dir) {
			if (dir)
				dir = this.getFolder(dir);
			else
				dir = this.currentFolder;
			if (dir && dir.children) {
				return _.filter(
					_.map(dir.children, function(child) {
					return child.type + ':' + child.name;
				}), function(el) {
					return el.charAt(2) != ".";
				}).sort().join(', ') || "empty directory";
			} else {
				return 'error: invalid path';
			}
		}
	};
};