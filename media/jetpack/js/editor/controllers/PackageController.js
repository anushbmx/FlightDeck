var Class = require('shipyard/class/Class'),
    Options = require('shipyard/class/Options'),
    Events = require('shipyard/class/Events'),
    dom = require('shipyard/dom'),
    //Request = require('shipyard/http/Request'),
    
    PackageRevision = require('../models/PackageRevision');

module.exports = new Class({

    //Extends: Controller?,

    Implements: [Events, Options],

    options: {
        modules: [],
        attachments: [],
        dependencies: [],
        folders: [],
        readonly: false,
        package_info_el: 'package-properties',
        copy_el: 'package-copy',
        test_el: 'try_in_browser',
        download_el: 'download',
        console_el: 'error-console',
        save_el: 'package-save',
        menu_el: 'UI_Editor_Menu',

        package_info_form_elements: ['full_name', 'package_description'],
        

        check_if_latest: true  // switch to false if displaying revisions

    },
    
    package: null,

    //junk
    data: {},

    modules: {},
    attachments: {},
    folders: {},
    dependencies: {},

    edited: 0,

    initialize: function PackageController(package, options, editor, tabs, sidebar) {
        this.package = package;
        this.editor = editor;
        this.tabs = tabs;
        this.sidebar = sidebar;
        this.setOptions(options);

                

        this.instantiate_modules();
        this.instantiate_attachments();
        this.instantiate_folders();
        this.instantiate_dependencies();
        
        this.assignActions();

        this.setupButtonTooltips();
    },

    assignActions: function() {
        var controller = this,
            package = this.package;
        
        // All actions

        // reset version_name (in case of reload)
        var versionEl = this.versionEl = dom.$('version_name');
        if (versionEl) {
            versionEl.set('value', package.get('version_name'));
            package.observe('version_name', function(name) {
                versionEl.set('value', name);
            });
        
        }

        this.revision_list_btn = dom.$('revisions_list')
        this.revision_list_btn.addEvent('click', function(e) {
            e.preventDefault();
            controller.showRevisionList();
        });
        if (this.package.isAddon()) {
            this.boundTestAddon = this.testAddon.bind(this);
            this.test_el = dom.$(this.options.test_el);
            this.options.test_url = this.test_el.getElement('a').get('href');
            this.test_el.addEvent('click', function(e) {
                e.preventDefault();
                controller.testAddon();
            });

            this.download_el = dom.$(this.options.download_el);
            this.options.download_url = this.download_el.getElement('a').get('href');
            this.download_el.addEvent('click', function(e) {
                e.preventDefault();
                controller.downloadAddon();
            });
        }
        this.copy_el = dom.$(this.options.copy_el)
        if (this.copy_el) {
            this.copy_el.addEvent('click', function(e) {
                e.preventDefault();
                controller.copyPackage();
            });
        }
        if (this.options.check_if_latest) {
            dom.window.addEvent('focus', function() {
                controller.checkIfLatest(this.askForReload);
            });
        }

        this.packageInfoEl = dom.$(this.options.package_info_el);

        if (this.getOption('readonly')) {
            this.assignViewActions();
        } else {
            this.assignEditActions();
        }
    },

    assignViewActions: function() {
        var controller = this;

        this.packageInfoEl.addEvent('click', function(e) {
            e.preventDefault();
            controller.showInfo();
        });
    },

    assignEditActions: function() {
        var controller = this;

        dom.window.addEvent('beforeunload', function(e) {
            controller.alertUnsavedData(e);
        });

        this.packageInfoEl.addEvent('click', function(e) {
            e.preventDefault();
            controller.editInfo();
        });

        if (this.package.isAddon()) {
            this.console_el = dom.$(this.options.console_el);
            this.console_el.addEvent('click', function(e) {
                e.preventDefault();
                dom.window.get('mozFlightDeck').send({
                    cmd: 'toggleConsole',
                    contents: 'open'
                });
            });
        }

        this.save_el = dom.$(this.options.save_el);
        this.save_el.addEvent('click', function(e) {
            e.preventDefault();
            controller.saveAction();
        });
        
        // when typing in Save popover, you should be able to tab in a
        // logical order
        this.save_el.addEvent('mouseenter', function(e) {
            controller.versionEl.focus();
        });
        this.revision_message_el = dom.$('revision_message');
        this.revision_message_el.addEvent('keypress', function(e) {
            if (e.key == 'tab') {
                e.preventDefault();
                controller.save_el.focus();
            }
        });

        this.attachEditor();


        if (dom.$('jetpack_core_sdk_version')) {
			dom.$('jetpack_core_sdk_version').addEvent('change', function() {
				new Request.JSON({
					url: controller.options.switch_sdk_url,
                    useSpinner: true,
                    spinnerTarget: 'core_library_lib',
					spinnerOptions: {
						img: {
							'class': 'spinner-img spinner-16'
						}
					},
					data: {'id': dom.$('jetpack_core_sdk_version').get('value')},
					onSuccess: function(response) {
						// set the redirect data to view_url of the new revision
						fd.setURIRedirect(response.view_url);
						// set data changed by save
						controller.registerRevision(response);
						// change url to the SDK lib code
						dom.$('core_library_lib').getElement('a').set(
							'href', response.lib_url);
						// change name of the SDK lib
						dom.$('core_library_lib').getElement('span').set(
							'text', response.lib_name);
						fd.message.alert(response.message_title, response.message);
					}
				}).send();
			});
        }
    },

    instantiate_modules: function() {
        // iterate by modules and instantiate Module
        this.options.modules.forEach(function(module) {
            module.readonly = this.options.readonly;
            module.append = true;
            this.modules[module.filename] = new Module(this,module);
        }, this);
    },

    instantiate_attachments: function() {
        // iterate through attachments
        this.options.attachments.forEach(function(attachment) {
            attachment.readonly = this.options.readonly;
            attachment.append = true;
            this.attachments[attachment.uid] = new Attachment(this,attachment);
        }, this);
    },

    instantiate_dependencies: function() {
        // iterate through attachments
        this.options.dependencies.forEach(function(plugin) {
            plugin.readonly = this.options.readonly;
            plugin.append = true;
            this.libraries[plugin.id_number] = new Library(this,plugin);
        }, this);
    },
    
    instantiate_folders: function() {
        this.options.folders.forEach(function(folder) {
            folder.append = true;
            this.folders[folder.root_dir + '/' + folder.name] = new Folder(this, folder);
        }, this);
    },


    showRevisionList: function() {
		new Request({
			method: 'get',
            useSpinner: true,
            spinnerTarget: this.revision_list_btn.getElement('a'),
            spinnerOptions: {
                img: {
                    'class': 'spinner-img spinner-16'
                },
                maskBorder: false
            },
			url: this.options.revisions_list_html_url.substitute(this.options),
			onSuccess: function(html) {
				var modal = fd.displayModal(html),
                    modalEl = dom.$(modal).getElement('.UI_Modal'),
					showVersionsEl = modalEl.getElement('#versions_only');
				//setup handler for "Show versions only" checkbox
				function toggleVersionsOnly() {
					if (showVersionsEl.checked) {
						modalEl.addClass('boolean-on');
					} else {
						modalEl.removeClass('boolean-on');
					}
				}
				showVersionsEl.addEvent('change', function(e) {
					toggleVersionsOnly()
				});
				toggleVersionsOnly();
			}
		}).send();
    },

    setupButtonTooltips: function() {
        if(typeof FloatingTips === 'undefined') {
            return false;
        }

        this.tips = new FloatingTips('.UI_Editor_Menu .UI_Editor_Menu_Button', {
            position: 'top',
            balloon: true
        });
    },

    checkIfLatest: function(failCallback) {
        // we want to make a request each time, since the author could
        // have created new changes while we were looking.
        var controller = this;

        /*PackageRevision.find({
            conditions: { package: this.package.get('pk') },
            options: { limit: 1, order_by: '-revision_number' },
            callback: function(r) {
                r = r[0];
                if (r.get('revision_number') > controller.package.get('revision_number')) {
                    failCallback.call(controller);
                }
            }
        })*/

        // ask backend for the latest revision number
		new Request.JSON({
			method: 'get',
			url: this.options.check_latest_url,
			onSuccess: function(response) {
				if (failCallback && controller.package.get('revision_number') < response.revision_number) {
					failCallback.call()
				}
			}.bind(this)
		}).send();

    },

    askForReload: function() {
        fd.warning.alert(
            'New revision detected', 
            'There is a newer revision available. <a href="'+ 
            this.options.latest_url +'">Click this link to go to it now.</a>'
        );
    },

    /*
     * Method: copyPackage
     * create a new Package with the same name for the current user
     */
    copyPackage: function() {
        if (!settings.user) {
            fd.alertNotAuthenticated();
            return;
        }
        
        if (this.edited) {
            fd.error.alert("There are unsaved changes", 
                    "To make a copy, please save your changes.");
            return;
        }
        new Request.JSON({
            url: this.options.copy_url,
            useSpinner: true,
            spinnerTarget: this.copy_el.getElement('a'),
            spinnerOptions: {
                img: {
                    'class': 'spinner-img spinner-16'
                },
                maskBorder: false
            },
            onSuccess: function(response) {
                window.location.href = response.view_url;
            }
        }).send();
    },

    downloadAddon: function() {
        var el = $(this.options.download_el).getElement('a');

        fd.tests[this.options.hashtag] = {
            spinner: new Spinner(el, {
                img: {
                    'class': 'spinner-img spinner-16'
                },
                maskBorder: false
            }).show()
        };
        data = {
            hashtag: this.options.hashtag, 
            filename: this.options.name
        };
        new Request.JSON({
            url: this.options.download_url,
            data: data,
            onSuccess: fd.downloadXPI
        }).send();
    },

    testAddon: function(){
        if (this.getOption('readonly')) {
            this.collectData();
		    this.data.live_data_testing = true;
        }
        var el;
        if (fd.alertIfNoAddOn()) {
            if (e) {
                el = e.target;
            } else {
                el = $(this.options.test_el);
            }
            if (el.getParent('li').hasClass('pressed')) {
                fd.uninstallXPI(el.get('data-jetpackid'));
            } else {
                this.installAddon();
            }
        } else {
            fd.whenAddonInstalled(function() {
                fd.message.alert(
                    'Add-on Builder Helper',
                    'Now that you have installed the Add-on Builder Helper, loading the add-on into your browser for testing...'
                );
                this.testAddon();
            }.bind(this));
        }
    },

    installAddon: function() {
        if (this._test_request && this._test_request.isRunning()) {
            $log('FD: DEBUG: Test request already running. Cancelling second attempt');
            return;
        }
        
        var spinner = new Spinner($(this.options.test_el).getElement('a'), {
            img: {
                'class': 'spinner-img spinner-16'
            },
            maskBorder: false
        }).show()
        fd.tests[this.options.hashtag] = {
            spinner: spinner
        };
        var data = this.data || {};
        data['hashtag'] = this.options.hashtag;
        this._test_request = new Request.JSON({
            url: this.options.test_url,
            data: data,
            onSuccess: fd.testXPI,
            onFailure: function() {
                spinner.destroy();
            }
        }).send();
    },

    generateHashtag: function() {
        if (this.getOption('readonly')) return;
        this.options.hashtag = fd.generateHashtag(this.options.id_number);
    },

    //Package.View
    showInfo: function() {
        fd.displayModal(this.options.package_info);
    },

    //Package.Edit
    attachEditor: function() {
        var controller = this;

        this.editor.addEvent('change', function() {
            controller.onChanged();
        });
        
        this.addEvent('change', this.onChanged);
		this.addEvent('save', this.onSaved);
		this.addEvent('reset', this.onReset);
    },
    
    onChanged: function() {
        $log('FD: INFO: document changed - onbeforeunload warning is on and save button is lit.');
        dom.$$('li.Icon_save').addClass('Icon_save_changes');
		this.edited++;
	},

	onSaved: function() {
        //any save specific logic?
		this.fireEvent('reset');
	},
	
	onReset: function() {
		$log('FD: INFO: document saved - onbeforeunload warning is off and save button is not lit.');
        dom.$$('li.Icon_save').removeClass('Icon_save_changes');
		this.edited = 0;
	},

    downloadAddonOrSave: function(e){
		if (e) {
		  e.preventDefault();
        }
        var that = this;
        if (this.edited) {
            // display message
            fd.showQuestion({
                title: 'You\'ve got unsaved changes.',
                message: 'Choose from the following options',
                buttons: [{
                    text: 'Cancel',
                    type: 'reset',
                    'class': 'close'
                },{
                    text: 'Download without saving',
                    id: 'downloadwithoutsaving',
                    'class': 'submit',
                    type: 'button',
                    callback: function(){
                        this.downloadAddon();
                    }.bind(this)
                },{
                    text: 'Save &amp; Download',
                    id: 'saveanddonload',
                    'class': 'submit',
                    type: 'button',
                    callback: function(){
                        fd.addVolatileEvent('save', this.boundDownloadAddon);
                        this.save();
                    }.bind(this),
                    'default': true
                }]
            });
        } else {
            this.downloadAddon(e);
        }
	},
	
    uploadAttachment: function(files, renameAfterLoad) {
		var self = this;
        var spinner = new Spinner($('attachments')).show();
        // renameAfterLoad is falsy or callable
        var file = files[0];
        
        var data = new FormData(),
            xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				try {
					var response = JSON.decode(xhr.responseText);
				} catch(ex) { 
                    $log(ex);
                    return;
                }
				
				
				if(xhr.status >= 200 && xhr.status < 300 && response) {
					//onSuccess
					
					fd.message.alert(response.message_title, response.message);
					var attachment = new Attachment(self,{
						append: true,
						active: true,
						filename: response.filename,
						ext: response.ext,
						author: response.author,
						code: response.code,
						get_url: response.get_url,
						uid: response.uid,
						type: response.ext
					});
					self.registerRevision(response);
					self.attachments[response.uid] = attachment;
					if (spinner) spinner.destroy();
					$log('FD: all files uploaded');
					Function.from(renameAfterLoad)(attachment);
				} else {
					//onError
					
					if (spinner) spinner.destroy();
					if (xhr) {
						fd.error.alert(
							'Error {status}'.substitute(xhr),
							'{statusText}<br/>{responseText}'.substitute(xhr)
						);
					} else {
						fd.error.alert('Error', 'File size was too big');
					}
				}
			}
		};
        $log('FD: DEBUG: uploading ' + file.name)
		data.append('upload_attachment', file);
		xhr.open('POST', this.options.upload_attachment_url);
		xhr.setRequestHeader('X-File-Name', file.name);
		xhr.setRequestHeader('X-File-Size', file.fileSize)
		xhr.setRequestHeader("X-CSRFToken", Cookie.read('csrftoken'));
        xhr.send(data);
    },

    addExternalAttachment: function(url, filename) {
        // download content and create new attachment
        $log('FD: DEBUGB downloading ' + filename + ' from ' + url);
        this.addNewAttachment(
            this.options.add_attachment_url,
            {url: url, filename: filename});
    },
	
	addAttachment: function(filename) {
        // add empty attachment
        this.addNewAttachment(
            this.options.add_attachment_url,
            {filename: filename});
	},

    addNewAttachment: function(url, data) {
		var that = this;
		new Request.JSON({
			url: url,
			data: data,
            useSpinner: true,
            spinnerTarget: 'attachments',
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				that.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				that.attachments[response.uid] = new Attachment(that, {
					append: true,
					active: true,
					filename: response.filename,
					ext: response.ext,
					author: response.author,
					code: response.code,
					get_url: response.get_url,
					uid: response.uid,
					type: response.ext
				});
			}
		}).send();
    },

	renameAttachment: function(uid, newName, quiet) {
		var that = this,
            att = this.attachments[uid],
			filename = newName;
		
		// break off an extension from the filename
		var ext = filename.getFileExtension() || '';
		if (ext) {
			filename = filename.getFileName();
		}
		
		var attachmentEl = this.sidebar.getBranchFromPath(newName, 'data');
		var spinnerEl = attachmentEl || $(this.sidebar.trees.data);
		
		new Request.JSON({
			url: that.options.rename_attachment_url,
            useSpinner: true,
            spinnerTarget: spinnerEl,
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			data: {
				uid: uid,
				new_filename: filename,
				new_ext: ext
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				that.registerRevision(response);
                if (!quiet) {
                    fd.message.alert(response.message_title, response.message);
                }
				
				var attachment = that.attachments[uid];
                if (!attachment) {
					$log("WARN: Attachment (" + uid + ") couldn't be found in fd.item");
					return;
				}
				attachment.reassign({
					append: !attachmentEl,
					active: false,
					filename: response.filename,
					ext: response.ext,
					author: response.author,
					code: response.code,
					get_url: response.get_url,
					uid: response.uid,
					type: response.ext
				});
                
			}
		}).send();
	},

	removeAttachment: function(attachment) {
		var self = this;
		new Request.JSON({
			url: self.options.remove_attachment_url,
            useSpinner: true,
            spinnerTarget: this.sidebar.getBranchFromFile(attachment),
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			data: {uid: attachment.options.uid},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				self.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				delete self.attachments[attachment.options.uid];
				attachment.destroy();
			}
		}).send();
	},
	
	addModule: function(filename) {
		new Request.JSON({
			url: this.options.add_module_url,
            useSpinner: true,
            spinnerTarget: 'modules',
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			data: {'filename': filename},
			onSuccess: function(response) {
				// set the redirect data to view_url of the new revision
				fd.setURIRedirect(response.view_url);
				// set data changed by save
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				// initiate new Module
				var mod = new Module(this,{
					append: true,
					active: true,
					filename: response.filename,
					author: response.author,
					code: response.code,
					get_url: response.get_url
				});
				this.modules[response.filename] = mod;
			}.bind(this)
		}).send();
	},

	renameModule: function(oldName, newName) {
		newName = newName.replace(/\..*$/, '');
        var el = this.sidebar.getBranchFromPath(newName+'.js', 'lib');
		new Request.JSON({
			url: this.options.rename_module_url,
            useSpinner: true,
            spinnerTarget: el,
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			data: {
				old_filename: oldName,
				new_filename: newName
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				
				var mod = this.modules[oldName];
				var modId = mod.getID();
				mod.setOptions({
					filename: response.filename,
					get_url: response.get_url
				});
				this.modules[response.filename] = mod;
				// change the id of the element
				$(modId).set('id', mod.getID());
				delete this.modules[oldName];
			}.bind(this)
		}).send();
	},

	removeModule: function(module) {
        var el = this.sidebar.getBranchFromFile(module);
		new Request.JSON({
			url: this.options.remove_module_url,
            useSpinner: true,
            spinnerTarget: el,
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			data: module.options,
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				module.destroy();
			}.bind(this)
		}).send();
	},
	
	removeAttachments: function(path) {
        var el = this.sidebar.getBranchFromPath(path, 'data'),
            controller = this;
		new Request.JSON({
			url: this.options.remove_folder_url,
			data: {
				name: path,
				root_dir: 'data'
			},
            useSpinner: true,
            spinnerTarget: el,
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				response.removed_attachments.forEach(function(uid) {
				    this.attachments[uid].destroy();
				}, this);
				response.removed_dirs.forEach(function(name) {
				    controller.sidebar.removeFile(name, 'd')
				}, this);
                controller.sidebar.removeFile(response.foldername, 'd')
			}.bind(this)
		}).send();
	},

	removeModules: function(path) {
        var el = this.sidebar.getBranchFromPath(path, 'lib'),
            controller = this;
	    new Request.JSON({
			url: this.options.remove_module_url,
			data: {filename: path+'/'},
            useSpinner: true,
            spinnerTarget: el,
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				response.removed_modules.forEach(function(filename) {
				    this.modules[filename].destroy();
				}, this);
				response.removed_dirs.forEach(function(name) {
				    controller.sidebar.removeFile(name, 'l')
				}, this);
				
			}.bind(this)
		}).send();
	},
	
	addFolder: function(name, root_dir) {
		var el = root_dir == Folder.ROOT_DIR_LIB ?
            'modules' : 'attachments';
        new Request.JSON({
			url: this.options.add_folder_url,
			data: {
				name: name,
				root_dir: root_dir
			},
            useSpinner: true,
            spinnerTarget: el,
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				this.folders[root_dir + '/' + response.name] = new Folder(this, {
					append: true,
					name: response.name,
					root_dir: root_dir
				});
			}.bind(this)
		}).send();
	},
	
	removeFolder: function(folder) {
		new Request.JSON({
			url: this.options.remove_folder_url,
			data: {
				name: folder.options.name,
				root_dir: folder.options.root_dir
			},
            useSpinner: true,
            spinnerTarget: this.sidebar.getBranchFromFile(folder),
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				folder.destroy();
			}.bind(this)
		}).send();
	},

	assignLibrary: function(library_id) {
		if (library_id) {
			new Request.JSON({
				url: this.options.assign_library_url,
				data: {'id_number': library_id},
                useSpinner: true,
                spinnerTarget: 'plugins',
				spinnerOptions: {
					img: {
						'class': 'spinner-img spinner-16'
					}
				},
				onSuccess: function(response) {
					// set the redirect data to view_url of the new revision
					fd.setURIRedirect(response.view_url);
					// set data changed by save
					this.registerRevision(response);
					fd.message.alert(response.message_title, response.message);
					this.libraries[response.library_id_number] = new Library(this, {
						full_name: response.library_full_name,
						id_number: response.library_id_number,
						library_name: response.library_name,
						view_url: response.library_url,
						revision_number: response.library_revision_number
					});
				}.bind(this)
			}).send();
		} else {
			fd.error.alert('No such Library', 'Please choose a library from the list');
		}
	},
	
	updateLibrary: function(lib, callback) {
		new Request.JSON({
			url: this.options.update_library_url,
			data: {
				'id_number': lib.options.id_number,
				'revision': lib.retrieveNewVersion().revision
			},
			useSpinner: true,
			spinnerTarget: 'libraries',
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				lib.setOptions({
					view_url: response.library_url
				});
				Function.from(callback)(response);
			}.bind(this)
		}).send();
	},

    checkDependenciesVersions: function() {
        var controller = this;
        new Request.JSON({
            method: 'get',
			url: that.options.latest_dependencies_url,
			timeout: 5000,
            onSuccess: function(res) {
                res.forEach(function(latest_revision) {
                    var lib = controller.libraries[latest_revision.id_number];
					if (!lib) return;
					lib.storeNewVersion(latest_revision);
					controller.sidebar.setPluginUpdate(lib);
                });
            }
        }).send();
    },
	
	prepareDependenciesInterval: function() {
		var that = this;
		function setCheckInterval() {
			unsetCheckInterval();
			that.checkDependenciesVersions();
			that.checkDependenciesInterval = that.checkDependenciesVersions.periodical(60000, that);
		}
		
		function unsetCheckInterval() {
			clearInterval(that.checkDependenciesInterval);
		}
		
		window.addEvent('focus', setCheckInterval);
		window.addEvent('blur', unsetCheckInterval);
		setCheckInterval();
		
	},
    
	removeLibrary: function(lib) {
        new Request.JSON({
			url: this.options.remove_library_url,
			data: {'id_number': lib.options.id_number},
            useSpinner: true,
            spinnerTarget: this.sidebar.getBranchFromFile(lib),
			spinnerOptions: {
				img: {
					'class': 'spinner-img spinner-16'
				}
			},
			onSuccess: function(response) {
				fd.setURIRedirect(response.view_url);
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				lib.destroy();
			}.bind(this)
		}).send();
	},

	/*
	 * Method: makePublic
	 * activate a package
	 */
	makePublic: function(e) {
		e.stop();
		this.savenow = false;
		var activateButton = $('UI_ActivateLink');
		if (activateButton.getElement('a').hasClass('inactive')) return false;
		new Request.JSON({
			url: activateButton.getElement('a').get('href'),
			useSpinner: true,
			spinnerTarget: activateButton,
			spinnerOptions: {
				img: {
					class: 'spinner-img spinner-16'
				},
				maskBorder: false
			},
			onSuccess: function(response) {
				fd.message.alert(response.message_title, response.message);
				fd.fireEvent('activate_' + response.package_type);
				activateButton.addClass('pressed').getElement('a').addClass('inactive');
				$('UI_DisableLink').removeClass('pressed').getElement('a').removeClass('inactive');
			}
		}).send();
	},

	/*
	 * Method: makePrivate
	 * deactivate a package
	 */
	makePrivate: function(e) {
		e.stop();
		this.savenow = false;
		var deactivateButton = $('UI_DisableLink');
		if (deactivateButton.getElement('a').hasClass('inactive')) return false;
		new Request.JSON({
			url: deactivateButton.getElement('a').get('href'),
			useSpinner: true,
			spinnerTarget: deactivateButton,
			spinnerOptions: {
				img: {
					class: 'spinner-img spinner-16'
				},
				maskBorder: false
			},
			onSuccess: function(response) {
				fd.message.alert(response.message_title, response.message);
				fd.fireEvent('disable_' + response.package_type);
				$('activate').addEvent('click', this.makePublic.bind(this));
				deactivateButton.addClass('pressed').getElement('a').addClass('inactive');
				$('UI_ActivateLink').removeClass('pressed').getElement('a').removeClass('inactive');
			}.bind(this)
		}).send();
	},

	/*
	 * Method: editInfo
	 * display the EditInfoModalWindow
	 */
	editInfo: function() {
		this.savenow = false;
		fd.editPackageInfoModal = fd.displayModal(
				settings.edit_package_info_template.substitute(
					Object.merge({}, this.data, this.options)));
		$('package-info_form').addEvent('submit', this.boundSubmitInfo);
		$('full_name').addEvent('change', function() { 
			fd.fireEvent('change'); 
		});
		$('package_description').addEvent('change', function() { 
			fd.fireEvent('change'); 
		});
		if ($('savenow')) {
			$('savenow').addEvent('click', function() {
				this.savenow = true;
			}.bind(this));
		}

		$('UI_ActivateLink').getElement('a').addEvent('click', this.makePublic.bind(this));
		$('UI_DisableLink').getElement('a').addEvent('click', this.makePrivate.bind(this));

		this.validator = new Form.Validator.Inline('package-info_form');
		self = this;
		$$('#package-info_form input[type=submit]').each(function(el) {
			el.addEvent('click', function(e) {
				if (!self.validator.validate()) {
					e.stop();
				}
			});
		});
		// Update modal from data (if not saved yet)
		Object.each(this.data, function(value, key) {
			if ($(key)) {
                $log(key + ': ' + value);
				$(key).value = value;
			}
		})
	},

	/*
	 * Method: submitInfo
	 * submit info from EditInfoModalWindow
	 * if $('savenow') clicked - save the full info
	 */
	submitInfo: function(e) {
		e.stop();
		// collect data from the Modal
		this.options.package_info_form_elements.each(function(key) {
			if ($(key)) {
				this.data[key] = $(key).value;
			}
		}, this);
		// check if save should be called
		if (this.savenow) {
			return this.save();
		}
		fd.editPackageInfoModal.destroy();
	},

	collectData: function() {
		this.editor.dumpCurrent();
        this.data.version_name = $('version_name').get('value');
        this.data.revision_message = $('revision_message').get('value');
		Object.each(this.modules, function(module, filename) {
            var mod = this.editor.items[module.uid];
            if (mod.content && mod.changed) {
    			this.data[filename] = mod.content;
            }
		}, this);
		Object.each(this.attachments, function(attachment, uid) {
            var att = this.editor.items[uid 
                        + attachment.options.code_editor_suffix];
            if (att.content && att.changed) {
    			this.data[attachment.options.uid] = att.content;
            }
		}, this);
	},

	saveAction: function(e) {
		if (e) e.stop();
		this.save();
	},

	save: function() {
		this.collectData();
		this.saving = true;
		new Request.JSON({
			url: this.options.save_url,
			data: this.data,
            useSpinner: true,
            spinnerTarget: $(this.options.save_el),
            spinnerOptions: {
                img: {
                    'class': 'spinner-img spinner-16'
                },
                maskBorder: false
            },
			onSuccess: function(response) {
				// set the redirect data to view_url of the new revision
                $log('FD: DEBUG: Save succeeded')
				if (response.full_name) {
					$('package-info-name').set('text', response.full_name);
					this.options.full_name = response.full_name;
				}
                $('revision_message').set('value', '');
                if (response.attachments_changed) {
                    Object.forEach(response.attachments_changed, 
                        function(options, uid) {
                            $log(this.attachments[uid]);
                            if (this.attachments[uid]) {
                                // updating attachment's uid
                                var att = this.attachments[uid];
                                att.reassign(options);
                            }
                        }, this
                    );
                }
				fd.setURIRedirect(response.view_url);
				// set data changed by save
				this.registerRevision(response);
				fd.message.alert(response.message_title, response.message);
				// clean data leaving package_info data
				this.data = {};
				this.options.package_info_form_elements.each(function(key) {
					if (response[key] != null) {
						this.data[key] = response[key]
					}
				}, this);
				if (fd.editPackageInfoModal) fd.editPackageInfoModal.destroy();
				if ($(this.options.test_el) && $(this.options.test_el).hasClass('pressed')) {
					// only one add-on of the same id should be allowed on the Helper side
					this.installAddon();
				}
                this.editor.cleanChangeState();
				fd.fireEvent('save');
			}.bind(this),
			addOnFailure: function() {
				this.saving = false;
			}.bind(this)
		}).send();
	},

    blur: function() {
        this._focused = false;
		this.editor.blur();
        this.fireEvent('blur');
		this.editor.addEvent('focus:once', function() {
			if (!this._focused) {
				this.focus();
			}
		}.bind(this));
    },
	
	_focused: true,

    focus: function() {
        if (this._focused) return;
		this._focused = true;
		this.keyboard.activate();
		this.editor.focus();
		
        this.fireEvent('focus');
    },

	bind_keyboard: function() {
	    var that = this;
        this.keyboard = new FlightDeck.Keyboard();
		if(this.options.type == 'a') {
			this.keyboard.addShortcut('test', {
                keys:'ctrl+enter',
				description: 'Toggle Testing',
				handler: function(e) {
                    e.preventDefault();
                    that.testAddon();
                }
			});
		}
		this.keyboard.addShortcuts({
			'save': {
				keys:'ctrl+s',
				description: 'Save current outstanding changes.',
				handler: this.boundSaveAction
			},
			
			'new attachment': {
                keys: 'ctrl+n',
				description: 'Open the New Attachment prompt.',
				handler: function(e) {
                    e.preventDefault();
                    that.sidebar.promptAttachment();
                }
			},
			'new module': {
                keys:'ctrl+shift+n',
				description: 'Open the New Module prompt.',
				handler: function(e) {
                    e.preventDefault();
                    that.sidebar.promptNewFile();
                }
			},
			'focus tree / editor': {
                keys: 'ctrl+e',
				description: 'Switch focus between the editor and the tree',
				handler: function(e) {
                    e.preventDefault();
                    if(that._focused) {
						that.blur();
						that.sidebar.focus();
					} else {
						//that.sidebar.blur();
						that.focus();
					}
                } 
			},
			'shortcuts': {
				keys: 'ctrl+shift+/',
				description: 'Show these keyboard shortcuts',
				handler: function() {
					that.toggleShortcutsModal();
				}
			}
		})
		this.keyboard.manage(this.sidebar.keyboard);
		this.keyboard.activate();
		this.sidebar.keyboard.deactivate();
		this.addEvent('focus', function() {
			that.sidebar.blur();
		});
	},
	
	toggleShortcutsModal: function() {
		this._shortcutsModal ?
			this.hideShortcuts() :
			this.showShortcuts();
	},
	
	showShortcuts: function() {
		function buildLines(shortcut) {
			var keys = '<kbd>'+ shortcut.keys.split('+').join('</kbd> + <kbd>').split('|').join('</kbd> or <kbd>').replace(/meta/g, 'cmd') + '</kbd>';
			shortcuts.push(keys + ': ' + shortcut.description);
		}
		
		var shortcuts = [];
		
		shortcuts.push('<strong>Editor</strong>');
		this.keyboard.getShortcuts().forEach(buildLines);
		shortcuts.push('<strong>Tree</strong>');
		this.sidebar.keyboard.getShortcuts().forEach(buildLines);
		
		this._shortcutsModal = fd.displayModal('<h3>Keyboard Shortcuts</h3>'
						+'<div class="UI_Modal_Section"><p>'
						+shortcuts.join('</p><p>')
						+'</p></div>'
		);
		this._shortcutsModal.addEvent('destroy', function() {
			this._shortcutsModal = null
		}.bind(this));
	},
	
	hideShortcuts: function() {
		if (this._shortcutsModal) {
			this._shortcutsModal.destroy();
		}
	},

	registerRevision: function(urls) {
        // update page title to reflect current revision and name
        document.title = document.title.replace(this.options.revision_string, urls.revision_string);
        this.setOptions(urls);
        // this only for the right display href
        if (urls.download_url && $(this.options.download_el)) {
            $(this.options.download_el).set('href', urls.download_url);
        }
	},

    alertUnsavedData: function(e) {
        if (this.edited && fd.saving) {
            e.preventDefault();
            e.returnValue = "You've got unsaved changes.";
        }
                      
    }

});
