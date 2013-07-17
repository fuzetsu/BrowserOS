window.system = window.system || {};

system.createFileSystem = function(root) {
	return {
		root: root,
		init: function() {
			this.currentFolder = this.root;
		},
		createFile: function(files, type) {
			_.each(files, function(file) {
				this.currentFolder.children.push({
					name: file,
					type: type,
					content: ''
				});
			}, this);
			this.sync('root');
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
			this.sync('root');
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
				return _.filter(
					_.map(dir.children, function(child) {
					return child.type + ':' + child.name;
				}), function(el) {
					return el.charAt(2) != ".";
				}).sort().join(', ') || "empty directory";
			} else {
				return 'error: invalid path';
			}
		},
		sync: function(whatToSync) {
			var keys = (whatToSync instanceof Array) ? whatToSync : [whatToSync];
			if (!keys) {
				keys = _.keys(system).concat(['root']);
			}
			_.each(keys, function(key) {
				if (system[key] || this[key]) {
					localStorage[key] = JSON.stringify(system[key] || this[key]);
				}
			});
			console.log(localStorage.root);
		}
	};
};