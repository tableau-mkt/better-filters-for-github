// ==UserScript==
// @name         Better Filters for GitHub
// @namespace    http://joelwalters.com/
// @version      1.0.4
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

    var $filterLabel = $('<select class="ght-filter form-select select-sm"><option value="">- Filter by Label -</option></select>');
    var $filterAssignee = $('<select class="ght-filter form-select select-sm"><option value="">- Filter by Assignee -</option></select>');
    var $filterClear = $('<a href="#" class="btn btn-sm"><svg class="octicon octicon-x" viewBox="0 0 12 16" version="1.1" width="12" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48z"></path></svg> clear filters</a>');
    var $toggleLabels = $('<div><label><input type="checkbox" id="ghtToggleLabels" name="ghtToggleLabels"> Show Labels</label></div>');
    var $controls = $('<div class="ght-controls clearfix pt-3"></div>');
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

    GM_addStyle('.ght-item { margin: .5em; }');
    GM_addStyle('.ght-hidden { display: none !important; }');

    $filterClear.on('click', function () {
      $filterLabel.val('');
      options.labels = '';
      $filterAssignee.val('');
      options.assignee = '';
      applyAndSaveOptions();
      return false;
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
    .append($filterLabel)
    .append($filterAssignee)
    .append($filterClear)
    .append($toggleLabels);

    $controls.find('> *').wrap('<div class="ght-item left">').last().parent().addClass('right').removeClass('left');

    $('.project-columns').before($controls);
  };

  if ($('.project-columns').length) {
    console.log('[GitHub Tweaks]', 'Activated projects tweaks');
    projects();
  }
})(jQuery);
