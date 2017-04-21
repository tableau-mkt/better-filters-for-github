// ==UserScript==
// @name         Better Filters for GitHub
// @namespace    http://joelwalters.com/
// @version      1.0.1
// @description  Provides filters for GitHub Projects.
// @author       Joel Walters
// @match        https://github.com/*
// @grant        GM_addStyle
// @require      http://code.jquery.com/jquery-3.2.1.slim.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// ==/UserScript==

(function ($) {
  var projects = function () {
    'use strict';
    // jshint multistr:true

    var $toggleLabels = $('<div><input type="checkbox" id="ghtToggleLabels" name="ghtToggleLabels"> <label for="ghtToggleLabels">Show Labels</label></div>');
    var $filterLabel = $('<select class="ght-filter"><option value="">- Filter by Label -</option></select>');
    var $filterAssignee = $('<select class="ght-filter"><option value="">- Filter by Assignee -</option></select>');
    var $filterClear = $('<a href="#">&times; clear filters</a>');
    var $controls = $('<div class="ght-controls pt-3"></div>');
    var counts = {};
    var values = {};
    var cardCount;
    var prevCardCount;
    var intervalTimeout;
    var checkCount = 0;
    var options = JSON.parse(localStorage.getItem('ghtOptions')) || {};
    _.defaults(options, {
      showLabels: false,
      label: '',
      assignee: ''
    });

    function setInputsFromOptions() {
      $filterLabel.val(options.label);
      $filterAssignee.val(options.assignee);
      $toggleLabels.find('input').prop('checked', options.showLabels);
    }

    function saveOptions() {
      localStorage.setItem('ghtOptions', JSON.stringify(options));
    }

    function applyAndSaveOptions() {
      var filters = {};
      $('.project-columns .labels').toggleClass('ght-hidden', !options.showLabels);
      $('.project-columns .issue-card').each(function () {
        var showAllLabels = options.label === '',
          showAllAssignees = options.assignee === '';

        filters.label = showAllLabels || $(this).find('.issue-card-label').filter(function () {
            return this.innerText === options.label;
          }).length > 0;
        filters.assignee = showAllAssignees || $(this).find('.avatar-stack .avatar').filter(function () {
            return this.alt === options.assignee;
          }).length > 0;
        $(this).toggleClass('ght-hidden', !_.every(filters, function (isMatch) {
          return isMatch;
        }));
      });
      saveOptions();
    }

    GM_addStyle('.ght-controls { display: flex; }');
    GM_addStyle('.ght-item { flex: 0 1 auto; margin: .5em 1em; }');
    GM_addStyle('.ght-hidden { display: none !important; }');

    $filterClear.on('click', function () {
      $filterLabel.val('');
      options.labels = '';
      $filterAssignee.val('');
      options.assignee = '';
      applyAndSaveOptions();
    });

    $toggleLabels.find('input').on('change', function () {
      options.showLabels = this.checked;
      applyAndSaveOptions();
    });

    $filterAssignee.on('change', function () {
      options.assignee = this.value;
      applyAndSaveOptions();
    });

    $filterLabel.on('change', function () {
      options.label = this.value;
      applyAndSaveOptions();
    });

    // Check for async loaded cards.
    intervalTimeout = setInterval(function checkLabels() {
      cardCount = $('.project-columns .issue-card').length;
      checkCount++;
      if (checkCount > 5) {
        clearInterval(intervalTimeout);
      }

      // Get all assignees.
      values.assignees = $('.project-columns .avatar-stack .avatar').map(function () {
        return this.alt;
      });
      // Create a lookup  for count
      counts.assignees = _.countBy(values.assignees);
      values.assignees = _.uniq(values.assignees.sort());

      // Get all labels.
      values.labels = $('.project-columns .issue-card-label').map(function () {
        return this.innerText;
      });
      // Create a lookup table for count (occurrences).
      counts.labels = _.countBy(values.labels);
      values.labels = _.uniq(values.labels.sort());

      // Count changed, update the values.
      if (cardCount !== prevCardCount) {
        $filterLabel.find('option').slice(1).remove();
        _.each(values.labels, function (label) {
          $filterLabel.append('<option value="' + label + '">' + label + ' (' + counts.labels[label] + ')</option>');
        });
        $filterAssignee.find('option').slice(1).remove();
        _.each(values.assignees, function (assignee) {
          $filterAssignee.append('<option value="' + assignee + '">' + assignee + ' (' + counts.assignees[assignee] + ')</option>');
        });
        setInputsFromOptions();
        applyAndSaveOptions();
      }
      prevCardCount = cardCount;
    }, 1000);

    $controls
    .append($toggleLabels)
    .append($filterLabel)
    .append($filterAssignee)
    .append($filterClear);

    $controls.find('> *').wrap('<div class="ght-item">');

    $('.project-columns').before($controls);
  };

  if ($('.project-columns').length) {
    console.log('[GitHub Tweaks]', 'Activated projects tweaks');
    projects();
  }
})(jQuery);
