/*
 * Copyright (c) 2014 Drew Fyock
 */

define(function(require, exports, module) {

  'use strict';

  /* Globals */
  var COMMAND_ID = 'com.steelbisondev.fixmyjs',
    COMMAND_SAVE_ID = COMMAND_ID + '.autosave',
    COMMAND_TIMESTAMP = COMMAND_ID + '-timeStamp',
    CONTEXTUAL_COMMAND_ID = COMMAND_ID + 'Contextual';

  var Menus = brackets.getModule('command/Menus'),
    AppInit = brackets.getModule('utils/AppInit'),
    Commands = brackets.getModule('command/Commands'),
    Editor = brackets.getModule('editor/Editor').Editor,
    FileSystem = brackets.getModule('filesystem/FileSystem'),
    EditorManager = brackets.getModule('editor/EditorManager'),
    CommandManager = brackets.getModule('command/CommandManager'),
    ProjectManager = brackets.getModule('project/ProjectManager'),
    DocumentManager = brackets.getModule('document/DocumentManager'),
    PreferencesManager = brackets.getModule('preferences/PreferencesManager');

  /* Formatters */
  var fixmyjs = require('fixmyjs');
  var jshint = require('jshint');

  /* Variables */
  var fixmyjsOnSave,
    settingsFileName = '.fixmyjsrc',
    menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU),
    settings = JSON.parse(require('text!settings.json')),
    debugPreferences = PreferencesManager.getExtensionPrefs('debug'),
    fixmyjsPreferences = PreferencesManager.getExtensionPrefs(COMMAND_ID),
    windowsCommand = {
      key: 'Ctrl-Alt-Shift-F',
      platform: 'win'
    },
    macCommand = {
      key: 'Cmd-Alt-Shift-F',
      platform: 'mac'
    },
    command = [windowsCommand, macCommand];

  // Brackets debug mode
  var DEBUG_MODE = debugPreferences.get('showErrorsInStatusBar');

  fixmyjsOnSave = fixmyjsPreferences.get('on_save') || false;
  if (!fixmyjsOnSave) {
    fixmyjsPreferences.set('on_save', false);
    fixmyjsPreferences.save();
  }

  function __debug(msg, code) {
    if (DEBUG_MODE) {
      var m = '[brackets-fixmyjs] :: ' + msg;
      if (typeof msg !== 'string') {
        m = msg;
      }
      if (code === 0) {
        console.log(m);
      } else {
        console.error(m);
      }
    }
  }

  /**
   *
   * @param {String} unformattedText
   * @param {String} indentChar
   * @param {String} indentSize
   */
  function _fixmyjs(unformattedText, indentChar, indentSize) {
    var options = {
      'indent_size': indentSize,
      'indent_char': indentChar
    };

    var data = unformattedText;
    var opts = $.extend(options, settings);
    try {
      if (opts.legacy) {
        jshint(data, opts);
        return fixmyjs(jshint.data(), data, opts).run();
      } else {
        return fixmyjs.fix(data, opts);
      }
    } catch (err) {
      throw err;
    }
  }

  function batchUpdate(formattedText, isSelection) {
    var editor = EditorManager.getCurrentFullEditor();
    var cursor = editor.getCursorPos();
    var scroll = editor.getScrollPos();
    var doc = DocumentManager.getCurrentDocument();
    var selection = editor.getSelection();
    doc.batchOperation(function() {
      if (isSelection) {
        doc.replaceRange(formattedText, selection.start, selection.end);
      } else {
        doc.setText(formattedText);
      }
      editor.setCursorPos(cursor);
      editor.setScrollPos(scroll.x, scroll.y);
    });
  }

  /**
   * Format
   */

  function format(autoSave) {
    var indentChar, indentSize, formattedText;
    var unformattedText, isSelection = false;
    var useTabs = Editor.getUseTabChar();

    __debug(settings, 0);
    if (useTabs) {
      indentChar = '\t';
      indentSize = 1;
    } else {
      indentChar = ' ';
      indentSize = Editor.getSpaceUnits();
    }

    var editor = EditorManager.getCurrentFullEditor();
    var selectedText = editor.getSelectedText();

    if (selectedText.length > 0) {
      isSelection = true;
      unformattedText = selectedText;
    } else {
      unformattedText = DocumentManager.getCurrentDocument().getText();
    }

    var doc = DocumentManager.getCurrentDocument();
    var language = doc.getLanguage();
    var fileType = language._id;

    switch (fileType) {

      case 'javascript':
      case 'json':
        formattedText = _fixmyjs(unformattedText, indentChar, indentSize);
        batchUpdate(formattedText, isSelection);
        break;
      default:
        if (!autoSave) {
          alert('Could not determine file type');
        }
        return;
    }
  }


  function onSave(event, doc) {
    if ((event.timeStamp - localStorage.getItem(COMMAND_TIMESTAMP)) > 1000) {
      format(true);
      localStorage.setItem(COMMAND_TIMESTAMP, event.timeStamp);
      CommandManager.execute(Commands.FILE_SAVE, {
        doc: doc
      });
    }
  }

  function loadConfig() {
    var settingsFile = FileSystem.getFileForPath(ProjectManager.getProjectRoot().fullPath + settingsFileName);
    settingsFile.read(function(err, content) {
      if (content) {
        try {
          settings = JSON.parse(content);
          __debug('settings loaded' + settings, 0);
        } catch (e) {
          __debug('error parsing ' + settingsFile + '. Details: ' + e);
          return;
        }
      }
    });
  }

  function toggle(command, fromCheckbox) {
    var newValue = (typeof fromCheckbox === 'undefined') ? fixmyjsOnSave : fromCheckbox;
    $(DocumentManager)[newValue ? 'on' : 'off']('documentSaved', onSave);
    command.setChecked(newValue);
    fixmyjsPreferences.set('on_save', newValue);
    fixmyjsPreferences.save();
  }

  /**
   * File menu
   */
  CommandManager.register('FixMyJS', COMMAND_ID, format);
  var commandOnSave = CommandManager.register('FixMyJS on save', COMMAND_SAVE_ID, function() {
    toggle(this, !this.getChecked());
    if (this.getChecked()) {
      localStorage.setItem(COMMAND_TIMESTAMP, 0);
    }
  });

  /**
   * Contextual menu
   */
  CommandManager.register('FixMyJS', CONTEXTUAL_COMMAND_ID, format);
  var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
  contextMenu.addMenuItem(CONTEXTUAL_COMMAND_ID);

  toggle(commandOnSave);

  menu.addMenuDivider();
  menu.addMenuItem(COMMAND_ID, command);
  menu.addMenuItem(COMMAND_SAVE_ID);

  AppInit.appReady(function() {

    $(DocumentManager).on('documentRefreshed.fixmyjs', function(e, document) {
      if (document.file.fullPath === ProjectManager.getProjectRoot().fullPath + settingsFileName) {
        loadConfig();
      }
    });

    $(ProjectManager).on('projectOpen.fixmyjs', function() {
      loadConfig();
    });

    loadConfig();

  });

});
